import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';

export async function getSettings(cookies: AstroCookies) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('app_settings').select('*').eq('id', true).single();
  if (error) throw error; return data;
}
export async function updateSettings(cookies: AstroCookies, patch: Record<string, unknown>) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('app_settings').update(patch).eq('id', true).select().single();
  if (error) throw error; return data;
}
export async function uploadLogo(cookies: AstroCookies, file: File) {
  const sb = getServerClient(cookies);
  // Sanitize the storage key — never trust the client-supplied filename; keep only a safe extension.
  const ext = (file.name.split('.').pop() ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const path = `logo-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('branding').upload(path, file, { upsert: true });
  if (error) throw error;
  await updateSettings(cookies, { logo_storage_path: path });
  return path;
}
