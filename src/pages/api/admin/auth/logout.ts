import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { json, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const { error } = await getServerClient(cookies).auth.signOut();
  if (error) return serverError('Logout failed');
  return json({ success: true });
};
