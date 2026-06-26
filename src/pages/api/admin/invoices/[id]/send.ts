import type { APIRoute } from 'astro';
import { sendInvoice } from '../../../../../lib/db/invoices';
import { json, unprocessable, serverError } from '../../../../../lib/http';
import { sendEmail } from '../../../../../lib/email/postmark';
import { invoiceEmail } from '../../../../../lib/email/content';

export const prerender = false;

export const POST: APIRoute = async ({ params, cookies, url, request }) => {
  try {
    // "Issue" allocates the number/token/snapshots; emailing the client is a
    // separate choice. Body `{ email: true }` issues AND emails in one step;
    // no body (or `email:false`) issues only — the client can be emailed later
    // via the "Email to client" (resend) action.
    let wantEmail = false;
    try { const b = await request.json(); wantEmail = !!b?.email; } catch { /* no body = issue only */ }

    const inv: any = await sendInvoice(cookies, params.id!);

    let emailed = false;
    let emailError: string | null = null;
    if (wantEmail) {
      const to = inv.bill_to_snapshot?.email || inv.client?.email;
      if (!to) {
        emailError = 'Invoice issued, but no email is on file for this client — it was not emailed.';
      } else {
        try {
          const e = invoiceEmail(inv, url.origin);
          // CC the owner on every invoice that goes out (INVOICE_CC overrides;
          // defaults to the sending mailbox so Aaron keeps a copy of each one).
          const cc = import.meta.env.INVOICE_CC ?? import.meta.env.SMTP_USER;
          await sendEmail({ to, cc, subject: e.subject, htmlBody: e.htmlBody, textBody: e.textBody });
          emailed = true;
        } catch (err: any) {
          console.error('[send] invoice email failed:', err);
          emailError = `Invoice issued, but the email failed: ${err?.message ?? 'unknown error'}. Use "Email to client" to retry.`;
        }
      }
    }
    return json({ invoice: inv, emailed, emailError });
  }
  catch (e: any) {
    if (String(e?.message ?? '').includes('Already sent')) return unprocessable('Invoice already issued');
    console.error(e); return serverError();
  }
};
