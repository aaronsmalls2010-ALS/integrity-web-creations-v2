import { getAdminClient } from '../supabase/admin';
import { computeTotals } from '../invoice/totals';
import { renderInvoicePdf } from '../invoice/pdf';
import { invoiceEmail } from '../email/content';
import { sendEmail } from '../email/postmark';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL ?? 'https://www.integritywebcreations.com';

/** add N days to a YYYY-MM-DD date, returning YYYY-MM-DD (UTC-safe) */
function addDays(d: string, n: number): string {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * Add the one-time late fee to an overdue invoice, recompute totals, regenerate
 * the PDF, and email the updated invoice to the client (CC owner). Uses the
 * admin (service-role) client since this runs from cron with no user session.
 */
async function applyLateFee(sb: any, inv: any, feeCents: number, pct: number) {
  const existing = (inv.lines ?? []) as any[];
  const sortOrder = existing.reduce((m, l) => Math.max(m, l.sort_order ?? 0), 0) + 1;

  await sb.from('invoice_line_items').insert({
    invoice_id: inv.id,
    description: `Late Fee (${pct}% of overdue balance)`,
    quantity: 1,
    unit_price_cents: feeCents,
    amount_cents: feeCents,
    taxable: false,
    sort_order: sortOrder,
  });

  const allLines = [
    ...existing.map((l) => ({
      quantity: l.quantity,
      unit_price_cents: l.unit_price_cents,
      taxable: l.taxable,
    })),
    { quantity: 1, unit_price_cents: feeCents, taxable: false },
  ];
  const t = computeTotals({
    lines: allLines,
    taxRate: Number(inv.tax_rate ?? 0),
    discountCents: inv.discount_cents ?? 0,
  });
  const balance = Math.max(0, t.totalCents - (inv.amount_paid_cents ?? 0));

  await sb
    .from('invoices')
    .update({
      subtotal_cents: t.subtotalCents,
      tax_cents: t.taxCents,
      total_cents: t.totalCents,
      balance_cents: balance,
      status: 'overdue',
      late_fee_applied_at: new Date().toISOString(),
    })
    .eq('id', inv.id);

  await sb.from('activity_log').insert({
    entity_type: 'invoice',
    entity_id: inv.id,
    action: 'late_fee_applied',
    detail: { percent: pct, fee_cents: feeCents },
  });

  // regenerate the stored PDF with the new line + total (non-fatal)
  try {
    await renderInvoicePdf(inv.id);
  } catch (e) {
    console.error('[overdue] PDF regen failed for', inv.id, e);
  }

  // auto-resend the updated invoice to the client (CC owner)
  const { data: fresh } = await sb
    .from('invoices')
    .select('*, lines:invoice_line_items(*), client:clients(*)')
    .eq('id', inv.id)
    .single();
  const f: any = fresh;
  const to = f?.bill_to_snapshot?.email || f?.client?.email;
  if (to) {
    const e = invoiceEmail(f, SITE_URL);
    const cc = import.meta.env.INVOICE_CC ?? import.meta.env.SMTP_USER;
    await sendEmail({ to, cc, subject: e.subject, htmlBody: e.htmlBody, textBody: e.textBody });
    await sb.from('activity_log').insert({
      entity_type: 'invoice',
      entity_id: inv.id,
      action: 'resent',
      detail: { reason: 'late_fee' },
    });
  }
}

export async function sweepOverdue(today: string) {
  const sb = getAdminClient();

  // 1) Apply the one-time late fee to eligible invoices: unpaid, fee enabled,
  //    not yet applied, and past their due date + grace period.
  const { data: candidates } = await sb
    .from('invoices')
    .select('*, lines:invoice_line_items(*), client:clients(*)')
    .in('status', ['sent', 'viewed', 'partial', 'overdue'])
    .gt('balance_cents', 0)
    .eq('late_fee_enabled', true)
    .is('late_fee_applied_at', null);

  let feesApplied = 0;
  for (const inv of (candidates ?? []) as any[]) {
    if (!inv.due_date) continue;
    if (addDays(inv.due_date, inv.late_fee_grace_days ?? 0) >= today) continue; // still within grace
    const pct = Number(inv.late_fee_percent ?? 0);
    const feeCents = Math.round((inv.balance_cents ?? 0) * (pct / 100));
    if (pct <= 0 || feeCents <= 0) continue;
    try {
      await applyLateFee(sb, inv, feeCents, pct);
      feesApplied++;
    } catch (e) {
      console.error('[overdue] late fee failed for', inv.id, e);
    }
  }

  // 2) Mark any remaining past-due unpaid invoices overdue (no/disabled/already-
  //    applied fee). Idempotent — already-overdue rows are untouched by status filter.
  const { data: marked, error } = await sb
    .from('invoices')
    .update({ status: 'overdue' })
    .in('status', ['sent', 'viewed', 'partial'])
    .lt('due_date', today)
    .gt('balance_cents', 0)
    .select('id');
  if (error) throw error;

  return { marked: (marked ?? []).length, feesApplied };
}
