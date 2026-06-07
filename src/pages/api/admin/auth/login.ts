import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { badRequest, json, unprocessable } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (email !== (import.meta.env.ADMIN_ALLOWLIST_EMAIL as string).toLowerCase()) {
    return unprocessable('Invalid credentials');
  }
  const sb = getServerClient(cookies);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return unprocessable('Invalid credentials');
  return json({ success: true });
};
