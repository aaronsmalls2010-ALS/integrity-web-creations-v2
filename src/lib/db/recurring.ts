import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';
import type { RecurringInput } from '../validation';
import { computeSchedulePosition, type RecurrenceRule } from '../cron/recurrence';

/**
 * Turn validated form input into a row: the caller supplies the rule, the start
 * date and the lead time; the next billing date and the cron run date are always
 * derived, never hand-entered.
 *
 * `lastGenerated` is threaded through on update so that editing a schedule can
 * never rewind it onto an occurrence the client has already been invoiced for.
 */
function toRow(input: RecurringInput, lastGenerated?: string | null) {
  const pos = computeSchedulePosition({
    rule: input.rule as RecurrenceRule,
    startDate: input.start_date,
    leadDays: input.lead_days,
    lastGenerated,
  });
  if (!pos) throw new Error('That pattern never produces a billing date — check the days or weeks you picked.');
  return { ...input, ...pos };
}

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
  const { data, error } = await sb.from('recurring_schedules').insert(toRow(input)).select().single();
  if (error) throw error; return data;
}
export async function updateSchedule(cookies: AstroCookies, id: string, input: RecurringInput) {
  const sb = getServerClient(cookies);
  const { data: current } = await sb.from('recurring_schedules').select('last_generated_period').eq('id', id).single();
  const { data, error } = await sb.from('recurring_schedules')
    .update(toRow(input, (current as any)?.last_generated_period)).eq('id', id).select().single();
  if (error) throw error; return data;
}
export async function deactivateSchedule(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { error } = await sb.from('recurring_schedules').update({ active: false }).eq('id', id);
  if (error) throw error;
}
