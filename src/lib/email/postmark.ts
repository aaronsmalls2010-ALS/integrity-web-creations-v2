/**
 * Transactional email sender.
 *
 * NOTE: file name is historical — this now sends via **Bluehost SMTP**
 * (nodemailer), not Postmark. Switched 2026-06-19 (Aaron) to use the domain
 * mailbox asmalls@integritywebcreations.com — the same transport the contact
 * form already uses (src/pages/api/contact.ts). Keeping the filename avoids
 * touching the four import sites (invoice send, payments, stripe webhook,
 * owner alerts); the exported `sendEmail` signature is unchanged.
 *
 * Required env (already set for the contact form):
 *   SMTP_HOST  — mail.integritywebcreations.com
 *   SMTP_PORT  — 465 (SSL) or 587 (STARTTLS)
 *   SMTP_USER  — asmalls@integritywebcreations.com  (also the From address)
 *   SMTP_PASS  — Bluehost mailbox password
 *   INVOICE_REPLY_TO — (optional) reply-to; defaults to SMTP_USER
 *
 * Throws on failure; callers try/catch and treat email as non-blocking.
 */
import nodemailer from 'nodemailer';

export interface EmailAttachment { name: string; contentBase64: string; contentType: string; }

export interface SendEmailOpts {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOpts): Promise<void> {
  const host = import.meta.env.SMTP_HOST;
  const port = Number(import.meta.env.SMTP_PORT ?? '465');
  const user = import.meta.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS)');
  }

  // Bluehost requires the From address to be the authenticated mailbox, so we
  // send AS the SMTP user. INVOICE_REPLY_TO can still steer replies elsewhere.
  const from = user;
  const replyTo = opts.replyTo ?? import.meta.env.INVOICE_REPLY_TO ?? user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // implicit TLS on 465; STARTTLS on 587
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  });

  const info = await transporter.sendMail({
    from: `Integrity Web Creations <${from}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.htmlBody,
    text: opts.textBody,
    replyTo,
    attachments: opts.attachments?.map((a) => ({
      filename: a.name,
      content: Buffer.from(a.contentBase64, 'base64'),
      contentType: a.contentType,
    })),
  });

  // nodemailer resolves even if the server "accepted" zero recipients; treat
  // that as a failure so callers can log it.
  if (info.rejected && info.rejected.length > 0) {
    throw new Error(`SMTP rejected recipient(s): ${info.rejected.join(', ')}`);
  }
}
