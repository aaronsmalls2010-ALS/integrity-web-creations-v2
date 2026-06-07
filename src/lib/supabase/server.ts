import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export function getServerClient(cookies: AstroCookies) {
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env not configured');
  return createServerClient(url, key, {
    db: { schema: 'crm' },
    cookies: {
      get: (name: string) => cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) =>
        cookies.set(name, value, { ...options, path: '/', httpOnly: true, sameSite: 'lax', secure: true }),
      remove: (name: string, options: CookieOptions) =>
        cookies.delete(name, { ...options, path: '/' }),
    },
  });
}
