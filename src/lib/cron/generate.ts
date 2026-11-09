import { getAdminClient } from '../supabase/admin';
import { computeTotals } from '../invoice/totals';
import { buildIssuerSnapshot, buildBillToSnapshot } from '../invoice/snapshot';
import { renderInvoicePdfBytes } from '../invoice/pdf';
import { invoiceEmail } from '../email/content';
import { sendEmail } from '../email/postmark';
import {
  computeSchedulePosition, dueDateFor, daysBetween, describeRule, type RecurrenceRule,
} from './recurrence';
import { randomBytes } from 'node:crypto';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL ?? 'https://www.integritywebcreations.com';

/**
 * An occurrence older than this was missed while the schedule was inactive (or
 * while a start date sat in the past). Back-dating an invoice for it would bill
 * a client for a period nobody agreed to, so we roll past it and record why.
 */
const STALE_OCCURRENCE_DAYS = 45;

type Result = {
  schedule_id: string;
  occurrence_date: string;
  invoice_id?: string;
  invoice_number?: string | null;
  auto_sent?: boolean;
  emailed?: boolean;
  email_error?: string;
  rolled_invoices?: number;
  carried_cents?: number;
  skipped?: string;
};

/** Is this billing date so far in the past that invoicing it now would be wrong? */
function isStale(occurrence: string, today: string): boolean {
  return daysBetween(occurrence, today) > STALE_OCCURRENCE_DAYS;
}

/**
 * Move a schedule to its next billing date after `occurrence`, skipping straight
 * past any dates that are already stale.
 *
 * The skipping matters: a schedule paused for six months has ~12 missed dates,
 * and advancing one per nightly run would leave it looking broken for twelve
 * days. This lands it on the next real billing date in a single pass.
 */
async function advance(sb: any, sch: any, occurrence: string, today: string) {
  const base = { rule: sch.rule as RecurrenceRule, startDate: sch.start_date, leadDays: sch.lead_days ?? 0 };
  let pos = computeSchedulePosition({ ...base, lastGenerated: occurrence });
  const skipped: string[] = [];

  // Bounded so a pathological rule can never spin: 500 occurrences is decades.
  for (let i = 0; pos && isStale(pos.next_occurrence_date, today) && i < 500; i++) {
    skipped.push(pos.next_occurrence_date);
    pos = computeSchedulePosition({ ...base, lastGenerated: pos.next_occurrence_date });
  }

  if (skipped.length > 0) {
    await sb.from('activity_log').insert({
      entity_type: 'recurring_schedule', entity_id: sch.id, action: 'occurrences_skipped',
      detail: { count: skipped.length, dates: skipped.slice(0, 25), reason: `older than ${STALE_OCCURRENCE_DAYS} days`, today },
    });
  }

  await sb.from('recurring_schedules').update(
    pos
      ? { next_occurrence_date: pos.next_occurrence_date, next_run_date: pos.next_run_date }
      // A rule with no future date (shouldn't happen — validation blocks it) is
      // parked rather than left spinning on the same day forever.
      : { active: false },
  ).eq('id', sch.id);
}

export async function generateRecurring(today: string) {
  const sb = getAdminClient();
  // next_run_date is already occurrence − lead_days, so "due to run" is a plain
  // date comparison: no lead-time arithmetic leaks into the query.
  const { data: schedules } = await sb.from('recurring_schedules')
    .select('*, client:clients(*)').eq('active', true).lte('next_run_date', today);
  const { data: settings } = await sb.from('app_settings').select('*').eq('id', true).single();
  const defaultDueDays = (settings as any)?.default_due_days ?? 14;
  const out: Result[] = [];

  for (const sch of (schedules ?? []) as any[]) {
    const occurrence: string | null = sch.next_occurrence_date ?? null;
    if (!occurrence || !sch.rule) continue; // pre-0009 row that somehow escaped the backfill

    // Already billed for this date — just roll forward.
    if (sch.last_generated_period === occurrence) { await advance(sb, sch, occurrence, today); continue; }

    if (isStale(occurrence, today)) {
      await sb.from('activity_log').insert({
        entity_type: 'recurring_schedule', entity_id: sch.id, action: 'occurrence_skipped',
        detail: { occurrence_date: occurrence, reason: `older than ${STALE_OCCURRENCE_DAYS} days`, today },
      });
      await advance(sb, sch, occurrence, today);
      out.push({ schedule_id: sch.id, occurrence_date: occurrence, skipped: 'stale occurrence' });
      continue;
    }

    const lines = (sch.line_items ?? []) as any[];
    if (lines.length === 0) continue;
    let result_rolled: { count: number; cents: number } | null = null;

    const t = computeTotals({
      lines: lines.map((l) => ({ quantity: l.quantity, unit_price_cents: l.unit_price_cents, taxable: !!l.taxable })),
      taxRate: 0, discountCents: 0,
    });
    const insert: any = {
      client_id: sch.client_id, status: 'draft',
      issue_date: today,
      due_date: dueDateFor({
        occurrence, issueDate: today,
        dueMode: sch.due_mode === 'on_occurrence' || sch.due_mode === 'fixed_day' ? sch.due_mode : 'net_days',
        dueDays: sch.due_days ?? defaultDueDays,
        dueDay: sch.due_day ?? null,
      }),
      tax_rate: 0, discount_cents: 0, subtotal_cents: t.subtotalCents, tax_cents: t.taxCents,
      total_cents: t.totalCents, balance_cents: t.totalCents,
      recurring_schedule_id: sch.id, occurrence_date: occurrence,
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
    if (error || !inv) {
      // 23505 = the (recurring_schedule_id, occurrence_date) unique index fired:
      // this occurrence was already invoiced by an overlapping run. Not an error —
      // it is the guard doing its job. Roll forward so we don't retry forever.
      if ((error as any)?.code === '23505') {
        await sb.from('recurring_schedules').update({ last_generated_period: occurrence }).eq('id', sch.id);
        await advance(sb, sch, occurrence, today);
        out.push({ schedule_id: sch.id, occurrence_date: occurrence, skipped: 'already invoiced for this occurrence' });
      } else {
        console.error('[recurring] invoice insert failed for schedule', sch.id, error);
      }
      continue;
    }

    await sb.from('invoice_line_items').insert(lines.map((l, i) => ({
      invoice_id: inv.id, description: l.description, quantity: l.quantity,
      unit_price_cents: l.unit_price_cents, amount_cents: Math.round(l.quantity * l.unit_price_cents),
      taxable: !!l.taxable, sort_order: i,
    })));

    // Carry any past-due balance onto this invoice (auto-send only: a draft is
    // rolled when it is issued, so the lines the admin reviews stay editable).
    // Done before the claim/email so the client sees the full amount owed; a
    // failure is logged but never blocks the invoice, which is already issued.
    if (sch.auto_send) {
      const { data: rolled, error: rollErr } = await sb.rpc('roll_forward_balances', { p_invoice_id: inv.id });
      if (rollErr) {
        console.error('[recurring] roll forward failed for invoice', inv.id, rollErr);
        await sb.from('activity_log').insert({
          entity_type: 'invoice', entity_id: inv.id, action: 'rollover_failed', detail: { error: rollErr.message },
        });
      } else if ((rolled as any)?.rolled > 0) {
        result_rolled = { count: (rolled as any).rolled, cents: (rolled as any).carried_cents };
      }
    }

    // Claim the occurrence before emailing: a failed send must never cause a
    // second invoice on the next run.
    await sb.from('recurring_schedules').update({ last_generated_period: occurrence, last_invoice_id: inv.id }).eq('id', sch.id);
    await advance(sb, sch, occurrence, today);
    await sb.from('activity_log').insert({
      entity_type: 'invoice', entity_id: inv.id, action: sch.auto_send ? 'sent' : 'created',
      detail: { recurring_schedule_id: sch.id, occurrence_date: occurrence, rule: describeRule(sch.rule) },
    });

    const result: Result = {
      schedule_id: sch.id, occurrence_date: occurrence, invoice_id: inv.id,
      invoice_number: insert.invoice_number ?? null, auto_sent: !!sch.auto_send,
    };
    if (result_rolled) { result.rolled_invoices = result_rolled.count; result.carried_cents = result_rolled.cents; }

    if (sch.auto_send) {
      const r = await emailGeneratedInvoice(sb, inv.id);
      result.emailed = r.emailed;
      if (r.error) result.email_error = r.error;
    }
    out.push(result);
  }
  return out;
}

/**
 * Email an auto-sent invoice with its PDF attached, CC'ing the owner — the same
 * thing the manual "Send" button does. Before this existed, auto_send marked
 * invoices sent and minted a pay link but never actually delivered anything.
 *
 * A failure here does not roll the invoice back: it is genuinely issued (number
 * allocated, pay link live). It is logged so the admin activity feed shows it,
 * and the owner is alerted so it can be retried with "Email to client".
 */
async function emailGeneratedInvoice(sb: any, invoiceId: string): Promise<{ emailed: boolean; error?: string }> {
  const owner = import.meta.env.INVOICE_CC ?? import.meta.env.SMTP_USER;
  try {
    const { data: inv } = await sb.from('invoices')
      .select('*, lines:invoice_line_items!invoice_id(*), client:clients(*)').eq('id', invoiceId).single();
    const to = inv?.bill_to_snapshot?.email || inv?.client?.email;
    if (!to) throw new Error('no email address on file for this client');

    const e = invoiceEmail(inv, SITE_URL);
    const { bytes } = await renderInvoicePdfBytes(inv.id, { baseUrl: SITE_URL });
    await sendEmail({
      to, cc: owner, subject: e.subject, htmlBody: e.htmlBody, textBody: e.textBody,
      attachments: [{
        name: `Invoice-${inv.invoice_number}.pdf`,
        contentBase64: Buffer.from(bytes).toString('base64'),
        contentType: 'application/pdf',
      }],
    });
    await sb.from('activity_log').insert({
      entity_type: 'invoice', entity_id: invoiceId, action: 'emailed',
      detail: { to, source: 'recurring_cron' },
    });
    return { emailed: true };
  } catch (err: any) {
    const message = err?.message ?? 'unknown error';
    console.error('[recurring] auto-send email failed for invoice', invoiceId, err);
    await sb.from('activity_log').insert({
      entity_type: 'invoice', entity_id: invoiceId, action: 'email_failed',
      detail: { error: message, source: 'recurring_cron' },
    });
    // Best-effort heads-up to the owner. If SMTP itself is down this fails too,
    // which is why the activity log entry above is written first.
    try {
      if (owner) {
        await sendEmail({
          to: owner,
          subject: `Action needed: recurring invoice was issued but not emailed`,
          htmlBody: `<p>A recurring invoice was generated and issued, but the email to the client failed.</p>
                     <p><strong>Reason:</strong> ${message}</p>
                     <p>Open the invoice in the admin portal and use <strong>Email to client</strong> to retry.</p>`,
          textBody: `A recurring invoice was issued but the client email failed: ${message}. Retry with "Email to client" in the admin portal.`,
        });
      }
    } catch { /* already logged */ }
    return { emailed: false, error: message };
  }
}
