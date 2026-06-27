import type { APIRoute } from 'astro';
import { createRefund } from '../../../../../lib/db/refunds';
import { json, unprocessable, serverError } from '../../../../../lib/http';

export const prerender = false;

/**
 * Issue a refund against an invoice's Stripe payment. Body (optional):
 *   { amount_cents?: number, reason?: string }
 * Omit amount_cents for a full refund of the remaining refundable balance.
 */
export const POST: APIRoute = async ({ params, request }) => {
  let amount_cents: number | undefined;
  let reason: string | undefined;
  try {
    const b = await request.json();
    if (b?.amount_cents !== undefined && b.amount_cents !== null && b.amount_cents !== '') {
      amount_cents = Math.round(Number(b.amount_cents));
      if (!Number.isFinite(amount_cents) || amount_cents <= 0) return unprocessable('Invalid refund amount.');
    }
    if (b?.reason) reason = String(b.reason);
  } catch { /* no body → full refund */ }

  try {
    const result = await createRefund(params.id!, { amount_cents, reason });
    return json({ ok: true, ...result });
  } catch (e: any) {
    const msg = String(e?.message ?? 'Refund failed');
    // Known validation messages + Stripe's own error messages are safe to show
    // the (trusted, authenticated) admin so they understand what happened.
    if (/No Stripe payment|Nothing left|Invoice not found|refund|amount|charge/i.test(msg)) {
      return unprocessable(msg);
    }
    console.error('[refund]', e);
    return serverError('Refund failed.');
  }
};
