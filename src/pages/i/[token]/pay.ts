import type { APIRoute } from 'astro';
import { getInvoiceByToken } from '../../../lib/db/invoices';
import { getStripe } from '../../../lib/stripe/client';

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const inv: any = await getInvoiceByToken(params.token!);
  if (!inv || inv.status === 'void' || inv.status === 'paid' || inv.balance_cents <= 0) {
    return new Response('Invoice is not payable', { status: 404 });
  }
  const stripe = getStripe();
  const origin = url.origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: inv.balance_cents,
        product_data: { name: `Invoice ${inv.invoice_number ?? ''}`.trim() },
      },
    }],
    success_url: `${origin}/i/${params.token}?paid=1`,
    cancel_url: `${origin}/i/${params.token}`,
    metadata: { invoice_id: inv.id },
    payment_intent_data: { metadata: { invoice_id: inv.id } },
  });
  return Response.redirect(session.url!, 303);
};
