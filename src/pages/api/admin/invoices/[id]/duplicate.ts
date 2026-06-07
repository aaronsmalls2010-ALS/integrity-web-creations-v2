import type { APIRoute } from 'astro';
import { duplicateInvoice } from '../../../../../lib/db/invoices';
import { json, serverError } from '../../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ params, cookies }) => {
  try { return json({ invoice: await duplicateInvoice(cookies, params.id!) }, 201); }
  catch (e) { console.error(e); return serverError(); }
};
