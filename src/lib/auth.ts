import type { AstroCookies } from 'astro';
import { getServerClient } from './supabase/server';

const ALLOWLIST = () => import.meta.env.ADMIN_ALLOWLIST_EMAIL as string | undefined;

export interface AdminSession {
  email: string;
  aal: string;          // 'aal1' (password only) | 'aal2' (MFA satisfied)
  needsMfa: boolean;    // true when user has a factor but hasn't satisfied it
}

export async function getAdminSession(cookies: AstroCookies): Promise<AdminSession | null> {
  const sb = getServerClient(cookies);
  const { data: { user } } = await sb.auth.getUser();
  const allow = ALLOWLIST();
  if (!allow || !user || user.email?.toLowerCase() !== allow.toLowerCase()) return null;

  const { data: aalData } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  const current = aalData?.currentLevel ?? 'aal1';
  const next = aalData?.nextLevel ?? 'aal1';
  return {
    email: user.email!,
    aal: current,
    needsMfa: next === 'aal2' && current === 'aal1',
  };
}
