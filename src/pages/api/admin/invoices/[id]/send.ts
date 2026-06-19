import type { APIRoute } from 'astro';
import { sendInvoice } from '../../../../../lib/db/invoices';
import { json, unprocessable, serverError } from '../../../../../lib/http';
import { sendEmail } from '../../../../../lib/email/postmark';
import { invoiceEmail } from '../../../../../lib/email/content';

export const prerender = false;

export const POST: APIRoute = async ({ params, cookies, url }) => {
  try {
    const inv: any = await sendInvoice(cookies, params.id!);
    try {
      const to = inv.bill_to_snapshot?.email || inv.client?.email;
      if (to) {
        const e = invoiceEmail(inv, url.origin);
        // CC the owner on every invoice that goes out (INVOICE_CC overrides;
        // defaults to the sending mailbox so Aaron keeps a copy of each one).
        const cc = import.meta.env.INVOICE_CC ?? import.meta.env.SMTP_USER;
        await sendEmail({ to, cc, subject: e.subject, htmlBody: e.htmlBody, textBody: e.textBody });
      }
    } catch (err) { console.error('[send] invoice email failed (non-fatal):', err); }
    return json({ invoice: inv });
  }
  catch (e: any) {
    if (String(e?.message ?? '').includes('Already sent')) return unprocessable('Invoice already sent');
    console.error(e); return serverError();
  }
};
