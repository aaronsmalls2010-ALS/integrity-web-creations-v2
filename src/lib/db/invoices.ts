import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';
import { getAdminClient } from '../supabase/admin';
import { computeTotals, type TotalsLine } from '../invoice/totals';
import { applyPayments, type InvoiceStatus } from '../invoice/status';
import { buildIssuerSnapshot, buildBillToSnapshot } from '../invoice/snapshot';
import { randomBytes } from 'node:crypto';

export interface DraftLine { service_id?: string|null; description: string; quantity: number; unit_price_cents: number; taxable: boolean; }
export interface DraftInput {
  client_id: string; issue_date: string; due_date: string;
  tax_rate: number; discount_cents: number; terms?: string; notes?: string;
  late_fee_enabled?: boolean; late_fee_percent?: number; late_fee_grace_days?: number;
  lines: DraftLine[];
}

function totalsFor(input: { lines: TotalsLine[]; tax_rate: number; discount_cents: number }) {
  return computeTotals({ lines: input.lines, taxRate: input.tax_rate, discountCents: input.discount_cents });
}

export async function createDraft(cookies: AstroCookies, input: DraftInput) {
  const sb = getServerClient(cookies);
  const t = totalsFor({ lines: input.lines, tax_rate: input.tax_rate, discount_cents: input.discount_cents });
  const { data: inv, error } = await sb.from('invoices').insert({
    client_id: input.client_id, status: 'draft',
    issue_date: input.issue_date, due_date: input.due_date,
    tax_rate: input.tax_rate, discount_cents: input.discount_cents,
    subtotal_cents: t.subtotalCents, tax_cents: t.taxCents, total_cents: t.totalCents,
    balance_cents: t.totalCents, terms: input.terms, notes: input.notes,
    // undefined keys are omitted by supabase-js, so DB defaults apply
    late_fee_enabled: input.late_fee_enabled,
    late_fee_percent: input.late_fee_percent,
    late_fee_grace_days: input.late_fee_grace_days,
  }).select().single();
  if (error) throw error;
  const invAny = inv as any;
  await replaceLines(cookies, invAny.id, input.lines);
  return invAny;
}

export async function replaceLines(cookies: AstroCookies, invoiceId: string, lines: DraftLine[]) {
  const sb = getServerClient(cookies);
  await sb.from('invoice_line_items').delete().eq('invoice_id', invoiceId);
  if (lines.length) {
    const rows = lines.map((l, i) => ({
      invoice_id: invoiceId, service_id: l.service_id ?? null, description: l.description,
      quantity: l.quantity, unit_price_cents: l.unit_price_cents,
      amount_cents: Math.round(l.quantity * l.unit_price_cents), taxable: l.taxable, sort_order: i,
    }));
    const { error } = await sb.from('invoice_line_items').insert(rows);
    if (error) throw error;
  }
}

export async function getInvoice(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('invoices')
    .select('*, client:clients(*), lines:invoice_line_items(*), payments(*)')
    .eq('id', id).single();
  if (error) throw error;
  return data as any;
}

export async function listInvoices(cookies: AstroCookies) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('invoices')
    .select('id, invoice_number, status, total_cents, balance_cents, issue_date, due_date, client:clients(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function updateDraft(cookies: AstroCookies, id: string, input: DraftInput) {
  const sb = getServerClient(cookies);
  const current = await getInvoice(cookies, id);
  if (current.status !== 'draft') throw new Error('Only draft invoices can be edited');
  const t = totalsFor({ lines: input.lines, tax_rate: input.tax_rate, discount_cents: input.discount_cents });
  const { error } = await sb.from('invoices').update({
    client_id: input.client_id, issue_date: input.issue_date, due_date: input.due_date,
    tax_rate: input.tax_rate, discount_cents: input.discount_cents,
    subtotal_cents: t.subtotalCents, tax_cents: t.taxCents, total_cents: t.totalCents,
    balance_cents: t.totalCents, terms: input.terms, notes: input.notes,
  }).eq('id', id);
  if (error) throw error;
  await replaceLines(cookies, id, input.lines);
  return getInvoice(cookies, id);
}

export async function sendInvoice(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const inv = await getInvoice(cookies, id);
  if (inv.status !== 'draft') throw new Error('Already sent');
  const { data: settings } = await sb.from('app_settings').select('*').eq('id', true).single();
  const { data: numberRow, error: numErr } = await sb.rpc('allocate_invoice_number');
  if (numErr) throw numErr;
  const token = randomBytes(24).toString('base64url');
  const { error } = await sb.from('invoices').update({
    invoice_number: numberRow as string, status: 'sent', public_token: token, sent_at: new Date().toISOString(),
    issuer_snapshot: buildIssuerSnapshot(settings as Record<string, any>), bill_to_snapshot: buildBillToSnapshot(inv.client),
  }).eq('id', id);
  if (error) throw error;
  await logActivity(cookies, 'invoice', id, 'sent', { invoice_number: numberRow as string });
  // NOTE: actual email send is Phase 3. For now this marks it sent + creates the public link.
  return getInvoice(cookies, id);
}

export async function recordPayment(cookies: AstroCookies, invoiceId: string, p: { amount_cents: number; method: string; reference?: string; note?: string; paid_at?: string; }) {
  const sb = getServerClient(cookies);
  const { error: pErr } = await sb.from('payments').insert({ invoice_id: invoiceId, ...p });
  if (pErr) throw pErr;
  const inv = await getInvoice(cookies, invoiceId);
  const r = applyPayments({ totalCents: inv.total_cents, currentStatus: inv.status as InvoiceStatus }, inv.payments);
  const { error } = await sb.from('invoices').update({
    amount_paid_cents: r.amountPaidCents, balance_cents: r.balanceCents, status: r.status,
    paid_at: r.status === 'paid' ? new Date().toISOString() : null,
  }).eq('id', invoiceId);
  if (error) throw error;
  await logActivity(cookies, 'invoice', invoiceId, 'payment_recorded', { amount_cents: p.amount_cents, method: p.method });
  return getInvoice(cookies, invoiceId);
}

export async function duplicateInvoice(cookies: AstroCookies, id: string) {
  const src = await getInvoice(cookies, id);
  return createDraft(cookies, {
    client_id: src.client_id, issue_date: src.issue_date, due_date: src.due_date,
    tax_rate: src.tax_rate, discount_cents: src.discount_cents, terms: src.terms, notes: src.notes,
    lines: src.lines.map((l: any) => ({ service_id: l.service_id, description: l.description, quantity: l.quantity, unit_price_cents: l.unit_price_cents, taxable: l.taxable })),
  });
}

export async function voidInvoice(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const inv = await getInvoice(cookies, id);
  if (inv.status === 'draft') { await sb.from('invoices').delete().eq('id', id); return { deleted: true }; }
  const { error } = await sb.from('invoices').update({ status: 'void' }).eq('id', id);
  if (error) throw error;
  await logActivity(cookies, 'invoice', id, 'voided', {});
  return { deleted: false };
}

export async function logActivity(cookies: AstroCookies, entity_type: string, entity_id: string, action: string, detail: object) {
  const sb = getServerClient(cookies);
  await sb.from('activity_log').insert({ entity_type, entity_id, action, detail });
}

/** Public read by token — uses the service-role client, returns one invoice only. */
export async function getInvoiceByToken(token: string) {
  const sb = getAdminClient();
  const { data, error } = await sb.from('invoices')
    .select('*, lines:invoice_line_items(*)')
    .eq('public_token', token).single();
  if (error) return null;
  return data as any;
}

export async function markViewed(token: string) {
  const sb = getAdminClient();
  const { data } = await sb.from('invoices').select('id,status,viewed_at,invoice_number,total_cents,bill_to_snapshot').eq('public_token', token).single();
  const row: any = data;
  if (row && row.status === 'sent' && !row.viewed_at) {
    await sb.from('invoices').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', row.id);
    await sb.from('activity_log').insert({ entity_type: 'invoice', entity_id: row.id, action: 'viewed', detail: {} });
    try {
      const { sendEmail } = await import('../email/postmark');
      const { ownerAlertEmail } = await import('../email/content');
      const owner = import.meta.env.ADMIN_ALLOWLIST_EMAIL;
      if (owner) {
        const oa = ownerAlertEmail('viewed', row);
        await sendEmail({ to: owner, subject: oa.subject, htmlBody: oa.htmlBody, textBody: oa.textBody });
      }
    } catch (err) { console.error('[markViewed] owner alert failed (non-fatal):', err); }
  }
}
