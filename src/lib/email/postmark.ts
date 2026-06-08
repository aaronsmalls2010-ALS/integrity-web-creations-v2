export interface EmailAttachment { name: string; contentBase64: string; contentType: string; }

export interface SendEmailOpts {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

/** Sends transactional email via Postmark. Throws on failure; callers should try/catch and not block the main flow. */
export async function sendEmail(opts: SendEmailOpts): Promise<void> {
  const token = import.meta.env.POSTMARK_SERVER_TOKEN;
  const from = import.meta.env.INVOICE_FROM_EMAIL;
  if (!token || !from) throw new Error('Postmark not configured (POSTMARK_SERVER_TOKEN / INVOICE_FROM_EMAIL)');

  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify({
      From: from,
      To: opts.to,
      Subject: opts.subject,
      HtmlBody: opts.htmlBody,
      TextBody: opts.textBody,
      ReplyTo: opts.replyTo ?? import.meta.env.INVOICE_REPLY_TO,
      MessageStream: 'outbound',
      Attachments: opts.attachments?.map((a) => ({ Name: a.name, Content: a.contentBase64, ContentType: a.contentType })),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Postmark send failed (${res.status}): ${detail}`);
  }
}
