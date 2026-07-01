import { getOutreachClient } from '../supabase/outreach';
import type { LeadInput } from './validation';

export interface OutreachSettings {
  id: number;
  daily_cap: number;
  min_gap_minutes: number;
  max_gap_minutes: number;
  send_window_start: number;
  send_window_end: number;
  timezone: string;
  kill_switch: boolean;
  from_name: string;
  physical_address: string;
}

export async function getSettings(): Promise<OutreachSettings> {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data;
}

export async function updateSettings(patch: Partial<OutreachSettings>) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1).select().single();
  if (error) throw error;
  return data;
}

export interface LeadFilters {
  status?: string;
  category?: string;
  town?: string;
  hasEmail?: boolean;
  search?: string;
}

export async function listLeads(filters: LeadFilters = {}) {
  const sb = getOutreachClient();
  let q = sb.from('leads').select('*').order('created_at', { ascending: false }).limit(500);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.category) q = q.eq('category', filters.category);
  if (filters.town) q = q.ilike('town', `%${filters.town}%`);
  if (filters.hasEmail === true) q = q.not('email', 'is', null);
  if (filters.hasEmail === false) q = q.is('email', null);
  if (filters.search) q = q.ilike('business_name', `%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getLead(id: string) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('leads').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createLead(input: LeadInput & { source?: string; research_run_id?: string | null }) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('leads').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateLead(id: string, patch: Record<string, unknown>) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('leads')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteLead(id: string) {
  const sb = getOutreachClient();
  const { error } = await sb.from('leads').delete().eq('id', id);
  if (error) throw error;
}

export async function listMessagesForLead(leadId: string) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('messages').select('*')
    .eq('lead_id', leadId).order('created_at');
  if (error) throw error;
  return data;
}

export async function listDrafts() {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('messages')
    .select('*, lead:leads(id, business_name, category, town, email, status)')
    .eq('status', 'draft').order('created_at').limit(200);
  if (error) throw error;
  return data;
}

export async function getMessage(id: string) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('messages')
    .select('*, lead:leads(*)').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createDraft(leadId: string, subject: string, body: string, step = 1) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('messages')
    .insert({ lead_id: leadId, sequence_step: step, subject, body, status: 'draft' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateMessage(id: string, patch: Record<string, unknown>) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('messages')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function listBatches() {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('batches').select('*')
    .order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data;
}

export async function getBatchWithMessages(id: string) {
  const sb = getOutreachClient();
  const { data: batch, error } = await sb.from('batches').select('*').eq('id', id).single();
  if (error) throw error;
  const { data: messages, error: e2 } = await sb.from('messages')
    .select('*, lead:leads(id, business_name, email, town)')
    .eq('batch_id', id).order('scheduled_after');
  if (e2) throw e2;
  return { batch, messages };
}

export async function createBatch(name: string) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('batches').insert({ name }).select().single();
  if (error) throw error;
  return data;
}

export async function updateBatch(id: string, patch: Record<string, unknown>) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('batches').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function listSuppression() {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('suppression_list').select('*')
    .order('created_at', { ascending: false }).limit(1000);
  if (error) throw error;
  return data;
}

export async function isSuppressed(email: string): Promise<boolean> {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('suppression_list').select('email')
    .eq('email', email.toLowerCase()).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function addSuppression(email: string, reason = 'manual') {
  const sb = getOutreachClient();
  const { error } = await sb.from('suppression_list')
    .upsert({ email: email.toLowerCase(), reason }, { onConflict: 'email' });
  if (error) throw error;
}

export async function removeSuppression(email: string) {
  const sb = getOutreachClient();
  const { error } = await sb.from('suppression_list').delete().eq('email', email.toLowerCase());
  if (error) throw error;
}

export async function logEvent(type: string, opts: { leadId?: string | null; messageId?: string | null; detail?: object } = {}) {
  const sb = getOutreachClient();
  const { error } = await sb.from('events').insert({
    type,
    lead_id: opts.leadId ?? null,
    message_id: opts.messageId ?? null,
    detail: opts.detail ?? null,
  });
  if (error) console.error('outreach event log failed', error);
}

export async function listEventsForLead(leadId: string) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('events').select('*')
    .eq('lead_id', leadId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data;
}

export async function recentEvents(limit = 25) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('events')
    .select('*, lead:leads(business_name)')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

/** Count of messages sent since the given ISO timestamp (start of local day). */
export async function sentSince(isoTs: string): Promise<number> {
  const sb = getOutreachClient();
  const { count, error } = await sb.from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent').gte('sent_at', isoTs);
  if (error) throw error;
  return count ?? 0;
}

/** Has this exact email address ever been sent an opener before? (dedup guard) */
export async function alreadyContacted(email: string): Promise<boolean> {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('leads').select('id, messages!inner(id)')
    .eq('email', email.toLowerCase()).eq('messages.status', 'sent').limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function dashboardStats() {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('leads').select('status');
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const { count: queued } = await sb.from('messages')
    .select('id', { count: 'exact', head: true }).eq('status', 'queued');
  const { count: drafts } = await sb.from('messages')
    .select('id', { count: 'exact', head: true }).eq('status', 'draft');
  return { leadCounts: counts, queuedMessages: queued ?? 0, draftMessages: drafts ?? 0 };
}

export async function nextScheduled(limit = 10) {
  const sb = getOutreachClient();
  const { data, error } = await sb.from('messages')
    .select('id, subject, scheduled_after, lead:leads(business_name, email)')
    .eq('status', 'queued').order('scheduled_after').limit(limit);
  if (error) throw error;
  return data;
}
