import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';
import type { ServiceInput } from '../validation';

export async function listServices(cookies: AstroCookies, includeInactive = false) {
  const sb = getServerClient(cookies);
  let q = sb.from('services').select('*').order('name');
  if (!includeInactive) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
export async function getService(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('services').select('*').eq('id', id).single();
  if (error) throw error; return data;
}
export async function createService(cookies: AstroCookies, input: ServiceInput) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('services').insert(input).select().single();
  if (error) throw error; return data;
}
export async function updateService(cookies: AstroCookies, id: string, input: ServiceInput) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('services').update(input).eq('id', id).select().single();
  if (error) throw error; return data;
}
export async function deactivateService(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { error } = await sb.from('services').update({ active: false }).eq('id', id);
  if (error) throw error;
}
