import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { json, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp' });
  if (error || !data) return serverError(error?.message ?? 'Enroll failed');
  return json({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
};
