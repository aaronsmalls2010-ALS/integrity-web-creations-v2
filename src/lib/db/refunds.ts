import { getAdminClient } from '../supabase/admin';
import { getStripe } from '../stripe/client';
import type { InvoiceStatus } from '../invoice/status';

/**
 * Recompute an invoice's amount_paid / balance / status as
 * sum(payments) - sum(refunds). Leaves draft/void untouched.
 */
export async function recomputeInvoiceTotals(sb: any, invoiceId: string) {
  const { data: inv } = await sb.from('invoices').select('total_cents, status').eq('id', invoiceId).single();
  if (!inv) return null;
  const i: any = inv;
  if (i.status === 'void' || i.status === 'draft') return null;

  const [{ data: pays }, { data: refs }] = await Promise.all([
    sb.from('payments').select('amount_cents').eq('invoice_id', invoiceId),
    sb.from('refunds').select('amount_cents').eq('invoice_id', invoiceId),
  ]);
  const paid = (pays ?? []).reduce((s: number, p: any) => s + p.amount_cents, 0);
  const refunded = (refs ?? []).reduce((s: number, r: any) => s + r.amount_cents, 0);
  const net = paid - refunded;
  const balance = Math.max(0, i.total_cents - net);

  let status: InvoiceStatus;
  if (balance <= 0 && net > 0) status = 'paid';
  else if (net > 0) status = 'partial';
  else status = 'sent'; // fully refunded → back to an outstanding, issued invoice

  await sb.from('invoices').update({
    amount_paid_cents: net,
    balance_cents: balance,
    status,
    paid_at: status === 'paid' ? new Date().toISOString() : null,
  }).eq('id', invoiceId);
  return { net, balance, status, paid, refunded };
}

/** How much of an invoice's Stripe payments is still refundable. */
export async function refundableCents(sb: any, invoiceId: string): Promise<number> {
  const [{ data: pays }, { data: refs }] = await Promise.all([
    sb.from('payments').select('amount_cents, method').eq('invoice_id', invoiceId),
    sb.from('refunds').select('amount_cents').eq('invoice_id', invoiceId),
  ]);
  const stripePaid = (pays ?? [])
    .filter((p: any) => p.method === 'stripe')
    .reduce((s: number, p: any) => s + p.amount_cents, 0);
  const refunded = (refs ?? []).reduce((s: number, r: any) => s + r.amount_cents, 0);
  return Math.max(0, stripePaid - refunded);
}

/**
 * Issue a Stripe refund for an invoice (full or partial), record it, and
 * recompute the invoice. Runs entirely server-side via the service-role client;
 * the calling route is admin-gated.
 */
export async function createRefund(invoiceId: string, opts: { amount_cents?: number; reason?: string }) {
  const sb = getAdminClient();
  const { data: inv } = await sb.from('invoices').select('*').eq('id', invoiceId).single();
  if (!inv) throw new Error('Invoice not found');
  const pi = (inv as any).stripe_payment_intent_id;
  if (!pi) throw new Error('No Stripe payment on this invoice to refund. Manual payments are refunded outside the system.');

  const maxRefund = await refundableCents(sb, invoiceId);
  if (maxRefund <= 0) throw new Error('Nothing left to refund on this invoice.');
  const amount = opts.amount_cents && opts.amount_cents > 0 ? Math.min(opts.amount_cents, maxRefund) : maxRefund;

  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: pi,
    amount,
    ...(opts.reason ? { metadata: { reason: opts.reason.slice(0, 200) } } : {}),
  });

  await sb.from('refunds').insert({
    invoice_id: invoiceId,
    stripe_refund_id: refund.id,
    stripe_payment_intent_id: pi,
    amount_cents: amount,
    reason: opts.reason ?? null,
  });
  const totals = await recomputeInvoiceTotals(sb, invoiceId);
  await sb.from('activity_log').insert({
    entity_type: 'invoice', entity_id: invoiceId, action: 'refunded',
    detail: { amount_cents: amount, stripe_refund_id: refund.id, reason: opts.reason ?? null },
  });
  return { refund_id: refund.id, amount_cents: amount, ...totals };
}

/**
 * Idempotently sync the refunds on a Stripe charge into our table (used by the
 * webhook so refunds issued from the Stripe dashboard also reconcile here).
 */
export async function syncRefundsForPaymentIntent(
  sb: any,
  paymentIntentId: string,
  refunds: { id: string; amount: number }[],
) {
  const { data: inv } = await sb.from('invoices').select('id').eq('stripe_payment_intent_id', paymentIntentId).single();
  if (!inv) return null;
  const invoiceId = (inv as any).id;
  for (const r of refunds) {
    await sb.from('refunds').upsert(
      { invoice_id: invoiceId, stripe_refund_id: r.id, stripe_payment_intent_id: paymentIntentId, amount_cents: r.amount },
      { onConflict: 'stripe_refund_id' },
    );
  }
  await recomputeInvoiceTotals(sb, invoiceId);
  return invoiceId;
}
