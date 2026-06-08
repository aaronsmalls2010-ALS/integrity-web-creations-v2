import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { badRequest, json, serverError, unprocessable } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const allow = import.meta.env.ADMIN_ALLOWLIST_EMAIL as string | undefined;
  if (!allow) return serverError('Server misconfigured');
  if (email !== allow.trim().toLowerCase()) {
    console.error('[login] allowlist mismatch — input vs allow:', JSON.stringify(email), JSON.stringify(allow));
    return unprocessable('Invalid credentials');
  }
  const sb = getServerClient(cookies);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('[login] signInWithPassword error:', error.status, error.message);
    return unprocessable('Invalid credentials');
  }
  return json({ success: true });
};
