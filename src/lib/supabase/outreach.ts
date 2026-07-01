import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client scoped to the `outreach` schema.
 *
 * The outreach schema has deny-all RLS and usage revoked from anon/
 * authenticated — ONLY this server-side client can touch it. Every caller
 * must sit behind the admin middleware (or verify an unsubscribe token).
 */
export function getOutreachClient() {
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin env not configured');
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'outreach' },
  });
}
