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
  const path = `logo-${Date.now()}-${file.name}`;
  const { error } = await sb.storage.from('branding').upload(path, file, { upsert: true });
  if (error) throw error;
  await updateSettings(cookies, { logo_storage_path: path });
  return path;
}
