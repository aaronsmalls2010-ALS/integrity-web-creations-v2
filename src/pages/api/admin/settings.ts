import type { APIRoute } from 'astro';
import { updateSettings, uploadLogo } from '../../../lib/db/settings';
import { badRequest, json, serverError, unprocessable } from '../../../lib/http';

export const prerender = false;

export const PUT: APIRoute = async ({ request, cookies }) => {
  let raw: any;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const patch: Record<string, unknown> = {
    business_name: raw.business_name,
    address_line1: raw.address_line1, address_line2: raw.address_line2,
    city: raw.city, state: raw.state, postal_code: raw.postal_code,
    reply_to: raw.reply_to, from_email: raw.from_email,
    invoice_number_prefix: raw.invoice_number_prefix,
    default_due_days: Number(raw.default_due_days ?? 14),
    default_tax_rate: Number(raw.default_tax_rate ?? 0),
    default_terms: raw.default_terms, payment_instructions: raw.payment_instructions,
  };
  if (!patch.business_name) return unprocessable('Business name is required');
  try { return json({ settings: await updateSettings(cookies, patch) }); }
  catch (e) { console.error(e); return serverError(); }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const form = await request.formData();
  const file = form.get('logo');
  if (!(file instanceof File)) return badRequest('No file');
  try { return json({ path: await uploadLogo(cookies, file) }); }
  catch (e) { console.error(e); return serverError(); }
};
