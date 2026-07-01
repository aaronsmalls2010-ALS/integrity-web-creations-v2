import type { APIRoute } from 'astro';
import { verifyUnsubscribeToken, performUnsubscribe } from '../../../lib/outreach/engine';

export const prerender = false;

/**
 * Public unsubscribe endpoint (reachable at
 * https://www.integritywebcreations.com/api/webhooks/unsubscribe via the v3
 * proxy). GET shows a confirm page — the actual unsubscribe requires the
 * button POST, so link-prefetching mail scanners (Outlook SafeLinks etc.)
 * can't unsubscribe people by accident. Token is an HMAC over the email;
 * no auth, no enumeration, no DB reads on GET.
 */

function page(title: string, body: string): Response {
  return new Response(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/><title>${title} — Integrity Web Creations</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;background:#0a1626;color:#e6edf5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
  .card{max-width:480px;background:#0f1f33;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:36px;text-align:center}
  h1{font-size:22px;margin:0 0 12px}p{color:#9fb3c8;line-height:1.6;margin:0 0 20px}
  .brand{font-size:13px;letter-spacing:.5px;font-weight:700;margin-bottom:24px}.brand span{color:#00e5ff}
  button{background:#0066ff;color:#fff;border:0;border-radius:8px;padding:12px 28px;font-size:15px;cursor:pointer}
  button:hover{background:#0052cc}
</style></head><body><div class="card">
<p class="brand"><span>integrity</span> WEB CREATIONS</p>
${body}
</div></body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('t') ?? '';
  const email = verifyUnsubscribeToken(token);
  if (!email) return page('Invalid link', `<h1>This link isn't valid</h1><p>The unsubscribe link is malformed or expired. If you'd like to stop receiving email, just reply "STOP" to any message from us.</p>`);
  return page('Unsubscribe', `<h1>Unsubscribe from Integrity Web Creations?</h1>
<p>We'll never email <strong>${email.replace(/</g, '&lt;')}</strong> again. One click and you're done.</p>
<form method="post"><input type="hidden" name="t" value="${token.replace(/"/g, '&quot;')}"/><button type="submit">Unsubscribe</button></form>`);
};

export const POST: APIRoute = async ({ request }) => {
  let token = '';
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('form')) {
    const form = await request.formData().catch(() => null);
    token = String(form?.get('t') ?? '');
  } else {
    const body = await request.json().catch(() => ({}));
    token = String(body?.t ?? '');
  }
  const email = verifyUnsubscribeToken(token);
  if (!email) return page('Invalid link', `<h1>This link isn't valid</h1><p>If you'd like to stop receiving email, just reply "STOP" to any message from us.</p>`);
  try {
    await performUnsubscribe(email);
  } catch (e) {
    console.error('unsubscribe failed', e);
    return page('Error', `<h1>Something went wrong</h1><p>Please reply "STOP" to any of our emails and we'll remove you manually. Sorry about that.</p>`);
  }
  return page('Unsubscribed', `<h1>You're unsubscribed</h1><p>We won't email you again. No hard feelings — if you ever need a website down the road, you know where to find us.</p>`);
};
