import type { APIRoute } from 'astro';
import { renderInvoicePdf } from '../../../../../lib/invoice/pdf';
import { serverError } from '../../../../../lib/http';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try { return Response.redirect(await renderInvoicePdf(params.id!), 302); }
  catch (e) { console.error(e); return serverError('PDF generation failed'); }
};
