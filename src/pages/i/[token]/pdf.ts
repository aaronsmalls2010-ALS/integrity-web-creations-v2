import type { APIRoute } from 'astro';
import { getInvoiceByToken } from '../../../lib/db/invoices';
import { renderInvoicePdf } from '../../../lib/invoice/pdf';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const inv: any = await getInvoiceByToken(params.token!);
  if (!inv || inv.status === 'void') return new Response('Not found', { status: 404 });
  try { return Response.redirect(await renderInvoicePdf(inv.id), 302); }
  catch (e) { console.error(e); return new Response('PDF generation failed', { status: 500 }); }
};
