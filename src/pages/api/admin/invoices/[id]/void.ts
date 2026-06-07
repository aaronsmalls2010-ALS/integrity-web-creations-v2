import type { APIRoute } from 'astro';
import { voidInvoice } from '../../../../../lib/db/invoices';
import { json, serverError } from '../../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ params, cookies }) => {
  try { return json(await voidInvoice(cookies, params.id!)); }
  catch (e) { console.error(e); return serverError(); }
};
