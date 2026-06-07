import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';
import type { ClientInput } from '../validation';

export async function listClients(cookies: AstroCookies) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('clients').select('*').order('name');
  if (error) throw error;
  return data;
}
export async function getClient(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('clients').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function createClient(cookies: AstroCookies, input: ClientInput) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('clients').insert(input).select().single();
  if (error) throw error;
  return data;
}
export async function updateClient(cookies: AstroCookies, id: string, input: ClientInput) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('clients').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function archiveClient(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { error } = await sb.from('clients').update({ status: 'archived' }).eq('id', id);
  if (error) throw error;
}
