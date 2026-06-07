import type { APIRoute } from 'astro';
import { paymentSchema, recordPayment } from '../../../../lib/db/payments';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: any;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = paymentSchema.safeParse({ ...raw, amount_cents: Number(raw.amount_cents) });
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  if (!raw.invoice_id) return unprocessable('invoice_id required');
  try { return json({ invoice: await recordPayment(cookies, raw.invoice_id, parsed.data) }, 201); }
  catch (e) { console.error(e); return serverError(); }
};
