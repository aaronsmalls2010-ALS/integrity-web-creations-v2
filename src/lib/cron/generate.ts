import { getAdminClient } from '../supabase/admin';
import { computeTotals } from '../invoice/totals';
import { buildIssuerSnapshot, buildBillToSnapshot } from '../invoice/snapshot';
import { nextRunDate, periodKey } from './period';
import { randomBytes } from 'node:crypto';

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function generateRecurring(today: string) {
  const sb = getAdminClient();
  const { data: schedules } = await sb.from('recurring_schedules')
    .select('*, client:clients(*)').eq('active', true).lte('next_run_date', today);
  const { data: settings } = await sb.from('app_settings').select('*').eq('id', true).single();
  const dueDays = (settings as any)?.default_due_days ?? 14;
  const out: any[] = [];
  for (const sch of (schedules ?? []) as any[]) {
    const period = periodKey(sch.next_run_date, sch.interval);
    if (sch.last_generated_period === period) continue; // idempotent: no duplicate per period
    const lines = (sch.line_items ?? []) as any[];
    if (lines.length === 0) continue;
    const t = computeTotals({ lines: lines.map((l) => ({ quantity: l.quantity, unit_price_cents: l.unit_price_cents, taxable: !!l.taxable })), taxRate: 0, discountCents: 0 });
    const insert: any = {
      client_id: sch.client_id, status: 'draft', issue_date: today, due_date: addDays(today, dueDays),
      tax_rate: 0, discount_cents: 0, subtotal_cents: t.subtotalCents, tax_cents: t.taxCents,
      total_cents: t.totalCents, balance_cents: t.totalCents, recurring_schedule_id: sch.id,
    };
    if (sch.auto_send) {
      const { data: number } = await sb.rpc('allocate_invoice_number');
      insert.invoice_number = number;
      insert.status = 'sent';
      insert.public_token = randomBytes(24).toString('base64url');
      insert.sent_at = new Date().toISOString();
      insert.issuer_snapshot = buildIssuerSnapshot(settings);
      insert.bill_to_snapshot = buildBillToSnapshot(sch.client);
    }
    const { data: inv, error } = await sb.from('invoices').insert(insert).select().single();
    if (error || !inv) continue;
    await sb.from('invoice_line_items').insert(lines.map((l, i) => ({
      invoice_id: inv.id, description: l.description, quantity: l.quantity,
      unit_price_cents: l.unit_price_cents, amount_cents: Math.round(l.quantity * l.unit_price_cents),
      taxable: !!l.taxable, sort_order: i,
    })));
    await sb.from('recurring_schedules').update({
      last_generated_period: period, last_invoice_id: inv.id,
      next_run_date: nextRunDate(sch.next_run_date, sch.interval, sch.interval_count),
    }).eq('id', sch.id);
    await sb.from('activity_log').insert({ entity_type: 'invoice', entity_id: inv.id, action: sch.auto_send ? 'sent' : 'created', detail: { recurring_schedule_id: sch.id, period } });
    out.push({ schedule_id: sch.id, invoice_id: inv.id, invoice_number: insert.invoice_number ?? null, auto_sent: !!sch.auto_send });
    // NOTE: auto_send currently marks sent + creates the public link but does NOT email — email lands in Phase 3.
  }
  return out;
}
