import type { APIRoute } from 'astro';
import { serviceSchema } from '../../../../lib/validation';
import { createService } from '../../../../lib/db/services';
import { dollarsToCents } from '../../../../lib/money';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: any;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  let price: number;
  try { price = dollarsToCents(String(raw.price ?? '0')); } catch { return unprocessable('Invalid price'); }
  const parsed = serviceSchema.safeParse({
    name: raw.name, description: raw.description,
    category: raw.category || undefined,
    subcategory: raw.subcategory || undefined,
    unit: raw.unit || undefined,
    default_unit_price_cents: price,
    default_quantity: Number(raw.default_quantity ?? 1),
    taxable: raw.taxable === true || raw.taxable === 'on',
    active: true,
    sort_order: raw.sort_order != null && raw.sort_order !== '' ? Number(raw.sort_order) : undefined,
  });
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try { return json({ service: await createService(cookies, parsed.data) }, 201); }
  catch (e) { console.error(e); return serverError(); }
};
