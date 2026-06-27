import type { APIRoute } from 'astro';
import { getInvoice, logActivity } from '../../../../../lib/db/invoices';
import { json, unprocessable, serverError } from '../../../../../lib/http';
import { sendEmail } from '../../../../../lib/email/postmark';
import { invoiceEmail } from '../../../../../lib/email/content';
import { renderInvoicePdfBytes } from '../../../../../lib/invoice/pdf';

export const prerender = false;

/**
 * Re-send the email for an already-issued invoice WITHOUT re-issuing it (keeps
 * the same number, token, and snapshot). Unlike the initial /send route, email
 * failures here are surfaced to the admin — resending exists precisely to get
 * the message delivered, so a silent failure would defeat the purpose.
 */
export const POST: APIRoute = async ({ params, cookies, url }) => {
  try {
    const inv: any = await getInvoice(cookies, params.id!);
    if (inv.status === 'draft') return unprocessable('Send the invoice before resending.');
    if (inv.status === 'void') return unprocessable('Cannot resend a void invoice.');

    const to = inv.bill_to_snapshot?.email || inv.client?.email;
    if (!to) return unprocessable('No recipient email on file for this client.');

    const e = invoiceEmail(inv, url.origin);
    const cc = import.meta.env.INVOICE_CC ?? import.meta.env.SMTP_USER;
    try {
      const { bytes } = await renderInvoicePdfBytes(inv.id, { baseUrl: url.origin });
      const attachments = [{
        name: `Invoice-${inv.invoice_number}.pdf`,
        contentBase64: Buffer.from(bytes).toString('base64'),
        contentType: 'application/pdf',
      }];
      await sendEmail({ to, cc, subject: e.subject, htmlBody: e.htmlBody, textBody: e.textBody, attachments });
    } catch (err: any) {
      console.error('[resend] email failed:', err);
      return json({ error: `Email failed: ${err?.message ?? 'unknown error'}` }, 502);
    }

    await logActivity(cookies, 'invoice', inv.id, 'resent', { to });
    return json({ ok: true, to });
  } catch (e: any) {
    console.error('[resend]', e);
    return serverError();
  }
};
