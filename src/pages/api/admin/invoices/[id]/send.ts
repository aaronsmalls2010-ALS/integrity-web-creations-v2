import type { APIRoute } from 'astro';
import { sendInvoice } from '../../../../../lib/db/invoices';
import { json, unprocessable, serverError } from '../../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ params, cookies }) => {
  try { return json({ invoice: await sendInvoice(cookies, params.id!) }); }
  catch (e: any) {
    if (String(e?.message ?? '').includes('Already sent')) return unprocessable('Invoice already sent');
    console.error(e); return serverError();
  }
};
