import type { APIRoute } from 'astro';
import { createDraft } from '../../../../lib/db/invoices';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: any;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  if (!raw.client_id) return unprocessable('Client is required');
  if (!Array.isArray(raw.lines) || raw.lines.length === 0) return unprocessable('At least one line item is required');
  try {
    const inv = await createDraft(cookies, {
      client_id: raw.client_id, issue_date: raw.issue_date, due_date: raw.due_date,
      tax_rate: Number(raw.tax_rate ?? 0), discount_cents: Number(raw.discount_cents ?? 0),
      terms: raw.terms, notes: raw.notes,
      late_fee_enabled: raw.late_fee_enabled === undefined ? undefined : !!raw.late_fee_enabled,
      late_fee_percent: raw.late_fee_percent === undefined ? undefined : Number(raw.late_fee_percent),
      late_fee_grace_days: raw.late_fee_grace_days === undefined ? undefined : Number(raw.late_fee_grace_days),
      lines: raw.lines.map((l: any) => ({
        service_id: l.service_id ?? null, description: String(l.description ?? ''),
        quantity: Number(l.quantity ?? 1), unit_price_cents: Number(l.unit_price_cents ?? 0),
        taxable: !!l.taxable,
      })),
    });
    return json({ invoice: inv }, 201);
  } catch (e) { console.error(e); return serverError(); }
};
