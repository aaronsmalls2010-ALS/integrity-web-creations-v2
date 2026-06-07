import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { json } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  await getServerClient(cookies).auth.signOut();
  return json({ success: true });
};
