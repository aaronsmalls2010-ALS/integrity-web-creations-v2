import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';
import type { RecurringInput } from '../validation';

export async function listSchedules(cookies: AstroCookies) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('recurring_schedules').select('*, client:clients(name)').order('next_run_date');
  if (error) throw error; return data;
}
export async function getSchedule(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('recurring_schedules').select('*, client:clients(name)').eq('id', id).single();
  if (error) throw error; return data;
}
export async function createSchedule(cookies: AstroCookies, input: RecurringInput) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('recurring_schedules').insert(input).select().single();
  if (error) throw error; return data;
}
export async function updateSchedule(cookies: AstroCookies, id: string, input: RecurringInput) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('recurring_schedules').update(input).eq('id', id).select().single();
  if (error) throw error; return data;
}
export async function deactivateSchedule(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { error } = await sb.from('recurring_schedules').update({ active: false }).eq('id', id);
  if (error) throw error;
}
