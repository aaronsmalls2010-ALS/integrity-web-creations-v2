import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin env not configured');
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'crm' },
  });
}
