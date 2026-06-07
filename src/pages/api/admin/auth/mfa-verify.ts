import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { badRequest, json, unprocessable } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { factorId?: string; code?: string };
  try { body = await request.json(); } catch { return badRequest('Invalid JSON'); }
  if (!body.factorId || !body.code) return badRequest('Missing factorId or code');
  const sb = getServerClient(cookies);
  const challenge = await sb.auth.mfa.challenge({ factorId: body.factorId });
  if (challenge.error) return unprocessable('Invalid code');
  const verify = await sb.auth.mfa.verify({
    factorId: body.factorId,
    challengeId: challenge.data.id,
    code: body.code,
  });
  if (verify.error) return unprocessable('Invalid code');
  return json({ success: true });
};
