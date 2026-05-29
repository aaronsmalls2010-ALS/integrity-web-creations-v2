/**
 * POST /api/contact
 * Handles contact form submissions and sends email via Bluehost SMTP.
 *
 * Required Vercel Environment Variables:
 *   SMTP_HOST  — mail.integritywebcreations.com
 *   SMTP_PORT  — 465 (SSL) or 587 (TLS)
 *   SMTP_USER  — asmalls@integritywebcreations.com
 *   SMTP_PASS  — your Bluehost email password
 *   CONTACT_TO — (optional) override destination address; defaults to SMTP_USER
 */
import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Only accept JSON
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return json({ error: 'Bad request' }, 400);
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const name     = sanitize(body.name);
  const email    = sanitize(body.email);
  const business = sanitize(body.business ?? '');
  const message  = sanitize(body.message);

  // Server-side validation
  if (!name || !email || !message) {
    return json({ error: 'Name, email, and message are required.' }, 422);
  }
  if (!isValidEmail(email)) {
    return json({ error: 'Invalid email address.' }, 422);
  }
  if (message.length > 5000) {
    return json({ error: 'Message is too long.' }, 422);
  }

  // SMTP config from env vars
  const host = import.meta.env.SMTP_HOST;
  const port = Number(import.meta.env.SMTP_PORT ?? '465');
  const user = import.meta.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS;
  const to   = import.meta.env.CONTACT_TO ?? user;

  if (!host || !user || !pass) {
    console.error('[contact] SMTP env vars not configured');
    return json({ error: 'Server configuration error. Please email directly.' }, 503);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,   // true for port 465 (implicit TLS), false for 587 (STARTTLS)
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  });

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:28px 36px;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;">Integrity Web Creations</p>
            <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;">New Website Inquiry</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">

            <!-- Fields -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Name</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#0f172a;font-weight:600;">${escapeHtml(name)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Email</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#2563eb;">${escapeHtml(email)}</p>
                </td>
              </tr>
              ${business ? `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Business</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#0f172a;">${escapeHtml(business)}</p>
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding:10px 0;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Message</p>
                  <p style="margin:8px 0 0;font-size:15px;color:#374151;line-height:1.7;white-space:pre-wrap;">${escapeHtml(message)}</p>
                </td>
              </tr>
            </table>

            <!-- Reply CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#2563eb;border-radius:8px;">
                  <a href="mailto:${escapeHtml(email)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
                    Reply to ${escapeHtml(name)} &rarr;
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              Sent from integritywebcreations.com &bull; Beaufort, SC
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from:    `"IWC Website" <${user}>`,
      to,
      replyTo: `"${name}" <${email}>`,
      subject: `New Inquiry${business ? ` from ${business}` : ''} — ${name}`,
      html:    emailHtml,
      text:    `Name: ${name}\nEmail: ${email}${business ? `\nBusiness: ${business}` : ''}\n\n${message}`,
    });

    return json({ success: true });
  } catch (err) {
    console.error('[contact] sendMail failed:', err);
    return json({ error: 'Failed to send message. Please try again or email directly.' }, 500);
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sanitize(val: unknown): string {
  return typeof val === 'string' ? val.trim().slice(0, 5000) : '';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
