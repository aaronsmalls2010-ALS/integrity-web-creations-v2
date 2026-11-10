/**
 * POST /api/proposal-response
 * Receives a client's answer (accept / discuss / decline) from a hosted proposal page
 * under /proposals/<slug>/ and emails it to the office via the same SMTP setup as /api/contact.
 *
 * Env (shared with /api/contact): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO (optional)
 */
import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { json } from '../../lib/http';

export const prerender = false;

// Proposals that may post here. Add a slug when a new proposal page is published.
const PROPOSALS: Record<string, string> = {
  'ash-collective': 'Ash Collective',
};

const DECISIONS = {
  accept: 'Accepted',
  discuss: 'Would like to talk first',
  decline: 'Declined for now',
} as const;

const PAYMENTS: Record<string, string> = {
  end: 'Pay in full when the finished site is approved',
  split: 'Three payments ($700 / $700 / $350)',
};

const Body = z.object({
  proposal: z.string().max(60),
  decision: z.enum(['accept', 'discuss', 'decline']),
  payment: z.enum(['', 'end', 'split']).default(''),
  name: z.string().trim().min(1).max(100),
  contact: z.string().trim().max(200).default(''),
  features: z.array(z.string().trim().max(100)).max(30).default([]),
  notes: z.string().trim().max(3000).default(''),
  website: z.string().max(200).default(''), // honeypot
  elapsedMs: z.number().default(0),
});

// Best-effort per-IP throttle (per warm instance, not a global limit).
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Same-origin guard: reject cross-site posts when the browser sends an Origin.
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return json({ error: 'Bad request' }, 403);
    } catch {
      return json({ error: 'Bad request' }, 403);
    }
  }

  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    return json({ error: 'Bad request' }, 400);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress || 'unknown';
  if (throttled(ip)) {
    return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Please pick an option and add your name.' }, 422);
  }
  const data = parsed.data;

  const clientName = PROPOSALS[data.proposal];
  if (!clientName) return json({ error: 'Bad request' }, 400);

  // Bots: filled honeypot or an instant submit. Pretend success so they don't retry.
  if (data.website || data.elapsedMs < 3000) {
    return json({ success: true });
  }

  const linkCount = (data.notes.match(/https?:\/\//gi) ?? []).length;
  if (linkCount > 2) {
    return json({ error: 'Please remove the links from your notes and try again.' }, 422);
  }

  const smtpHost = import.meta.env.SMTP_HOST;
  const port = Number(import.meta.env.SMTP_PORT ?? '465');
  const user = import.meta.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS;
  const to = import.meta.env.CONTACT_TO ?? user;

  if (!smtpHost || !user || !pass) {
    console.error('[proposal-response] SMTP env vars not configured');
    return json({ error: 'We could not send your answer right now.' }, 503);
  }

  const decisionText = DECISIONS[data.decision];
  const paymentText = data.decision === 'accept' ? PAYMENTS[data.payment] ?? 'Not chosen yet' : '';
  const replyEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact) ? data.contact : '';

  const rows: Array<[string, string]> = [
    ['Decision', decisionText],
    ...(paymentText ? [['Payment', paymentText] as [string, string]] : []),
    ['Name', data.name],
    ['Contact', data.contact || 'Not given'],
    ['Features checked', data.features.length ? data.features.join('\n') : 'None checked'],
    ['Notes or questions', data.notes || 'None'],
  ];

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0a1a2e;padding:28px 36px;">
<p style="margin:0;color:#c6a368;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Proposal response</p>
<h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;">${escapeHtml(clientName)}: ${escapeHtml(decisionText)}</h1>
</td></tr>
<tr><td style="padding:28px 36px;">
<table width="100%" cellpadding="0" cellspacing="0">
${rows
  .map(
    ([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;">
<p style="margin:0;font-size:11px;font-weight:700;color:#8a8f98;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(k)}</p>
<p style="margin:4px 0 0;font-size:15px;color:#1a1d24;line-height:1.6;white-space:pre-wrap;">${escapeHtml(v)}</p>
</td></tr>`,
  )
  .join('')}
</table>
</td></tr>
<tr><td style="background:#f8f8f8;padding:14px 36px;border-top:1px solid #eee;">
<p style="margin:0;font-size:11px;color:#8a8f98;text-align:center;">Sent from integritywebcreations.com/proposals/${escapeHtml(data.proposal)}/</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = rows.map(([k, v]) => `${k}:\n${v}`).join('\n\n');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  });

  try {
    await transporter.sendMail({
      from: `"IWC Proposals" <${user}>`,
      to,
      ...(replyEmail ? { replyTo: `"${data.name.replace(/["\r\n]/g, '')}" <${replyEmail}>` } : {}),
      subject: `${clientName} proposal: ${decisionText} (${data.name.replace(/[\r\n]/g, ' ')})`,
      html,
      text,
    });
    return json({ success: true });
  } catch (err) {
    console.error('[proposal-response] sendMail failed:', err);
    return json({ error: 'We could not send your answer right now.' }, 500);
  }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
