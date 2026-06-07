import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { json, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const sb = getServerClient(cookies);
  // Remove any prior unverified TOTP factors so retries don't accumulate orphans.
  const { data: factors } = await sb.auth.mfa.listFactors();
  for (const f of factors?.all?.filter(x => x.factor_type === 'totp') ?? []) {
    if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp' });
  if (error || !data) return serverError(error?.message ?? 'Enroll failed');
  return json({ factorId: data.id, qr: data.totp.qr_code });
};
