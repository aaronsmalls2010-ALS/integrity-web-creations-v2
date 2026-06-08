import { getAdminClient } from '../supabase/admin';

export async function sweepOverdue(today: string) {
  const sb = getAdminClient();
  const { data, error } = await sb.from('invoices').update({ status: 'overdue' })
    .in('status', ['sent', 'viewed', 'partial']).lt('due_date', today).gt('balance_cents', 0).select('id');
  if (error) throw error;
  return { marked: (data ?? []).length };
}
