import type { APIRoute } from 'astro';
import { getStripe } from '../../../lib/stripe/client';
import { getAdminClient } from '../../../lib/supabase/admin';
import { applyPayments, type InvoiceStatus } from '../../../lib/invoice/status';

export const prerender = false;

function ok(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook secret not configured', { status: 500 });

  const sig = request.headers.get('stripe-signature') ?? '';
  const raw = await request.text();
  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const sb = getAdminClient();

  // Idempotency claim: insert the event id first. Unique-violation => already processed.
  const { error: claimErr } = await sb.from('webhook_events').insert({ provider: 'stripe', event_id: event.id });
  if (claimErr) {
    // Most likely the unique (provider,event_id) violation => duplicate delivery. Ack so Stripe stops retrying.
    return ok({ received: true, duplicate: true });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const invoiceId: string | undefined = session.metadata?.invoice_id;
      const amount: number = session.amount_total ?? 0;
      const pi = typeof session.payment_intent === 'string' ? session.payment_intent : null;

      if (invoiceId && amount > 0) {
        await sb.from('payments').insert({ invoice_id: invoiceId, amount_cents: amount, method: 'stripe', stripe_payment_intent_id: pi });
        const { data: inv } = await sb.from('invoices').select('total_cents, status, payments(*)').eq('id', invoiceId).single();
        if (inv) {
          const i = inv as any;
          const r = applyPayments({ totalCents: i.total_cents, currentStatus: i.status as InvoiceStatus }, i.payments);
          await sb.from('invoices').update({
            amount_paid_cents: r.amountPaidCents, balance_cents: r.balanceCents, status: r.status,
            paid_at: r.status === 'paid' ? new Date().toISOString() : null,
            stripe_payment_intent_id: pi,
          }).eq('id', invoiceId);
          await sb.from('activity_log').insert({ entity_type: 'invoice', entity_id: invoiceId, action: 'payment_recorded', detail: { method: 'stripe', amount_cents: amount, event: event.id } });
        }
      }
    }
    return ok({ received: true });
  } catch (e) {
    console.error('[stripe webhook] processing failed:', e);
    // Roll back the idempotency claim so Stripe's retry can re-process.
    await sb.from('webhook_events').delete().eq('provider', 'stripe').eq('event_id', event.id);
    return new Response('Processing error', { status: 500 });
  }
};
