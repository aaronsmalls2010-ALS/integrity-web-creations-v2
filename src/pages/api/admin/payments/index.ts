import type { APIRoute } from 'astro';
import { paymentSchema, recordPayment } from '../../../../lib/db/payments';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';
import { sendEmail } from '../../../../lib/email/postmark';
import { receiptEmail, ownerAlertEmail } from '../../../../lib/email/content';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url }) => {
  let raw: any;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = paymentSchema.safeParse({ ...raw, amount_cents: Number(raw.amount_cents) });
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  if (!raw.invoice_id) return unprocessable('invoice_id required');
  try {
    const inv: any = await recordPayment(cookies, raw.invoice_id, parsed.data);
    try {
      const to = inv.bill_to_snapshot?.email || inv.client?.email;
      if (to) {
        const e = receiptEmail(inv, parsed.data.amount_cents, url.origin);
        await sendEmail({ to, subject: e.subject, htmlBody: e.htmlBody, textBody: e.textBody });
      }
      const owner = import.meta.env.ADMIN_ALLOWLIST_EMAIL;
      if (inv.status === 'paid' && owner) {
        const oa = ownerAlertEmail('paid', inv);
        await sendEmail({ to: owner, subject: oa.subject, htmlBody: oa.htmlBody, textBody: oa.textBody });
      }
    } catch (err) { console.error('[payment] email failed (non-fatal):', err); }
    return json({ invoice: inv }, 201);
  }
  catch (e) { console.error(e); return serverError(); }
};
