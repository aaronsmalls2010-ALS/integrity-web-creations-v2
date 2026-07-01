import type { APIRoute } from 'astro';
import { z } from 'zod';
import { listBatches, createBatch, logEvent } from '../../../../../lib/outreach/db';
import { getOutreachClient } from '../../../../../lib/supabase/outreach';
import { badRequest, json, unprocessable, serverError } from '../../../../../lib/http';

export const prerender = false;

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  messageIds: z.array(z.string().uuid()).min(1, 'Select at least one message').max(100),
});

export const GET: APIRoute = async () => {
  try {
    const batches = await listBatches();
    const sb = getOutreachClient();
    const { data: counts } = await sb.from('messages')
      .select('batch_id, status')
      .not('batch_id', 'is', null);
    const byBatch: Record<string, { total: number; sent: number; failed: number }> = {};
    for (const m of counts ?? []) {
      const b = (byBatch[m.batch_id] ??= { total: 0, sent: 0, failed: 0 });
      b.total++;
      if (m.status === 'sent') b.sent++;
      if (m.status === 'failed') b.failed++;
    }
    return json({ batches: batches.map((b: any) => ({ ...b, progress: byBatch[b.id] ?? { total: 0, sent: 0, failed: 0 } })) });
  } catch (e) { console.error(e); return serverError(); }
};

/** Create a batch from selected draft messages (marks them 'approved', unscheduled). */
export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);

  try {
    const sb = getOutreachClient();
    // Only drafts whose lead has a usable email can join a batch.
    const { data: msgs, error } = await sb.from('messages')
      .select('id, status, lead:leads(email, status)')
      .in('id', parsed.data.messageIds);
    if (error) throw error;
    const eligible = (msgs ?? []).filter((m: any) =>
      m.status === 'draft' && m.lead?.email && !['opted_out', 'invalid'].includes(m.lead.status));
    if (!eligible.length) return unprocessable('None of the selected messages are eligible (must be drafts on leads with an email address)');

    const batch = await createBatch(parsed.data.name);
    const ids = eligible.map((m: any) => m.id);
    const { error: ue } = await sb.from('messages')
      .update({ batch_id: batch.id, status: 'approved', updated_at: new Date().toISOString() })
      .in('id', ids).eq('status', 'draft');
    if (ue) throw ue;
    await logEvent('batch_created', { detail: { batchId: batch.id, name: batch.name, count: ids.length, skipped: parsed.data.messageIds.length - ids.length } });
    return json({ batch, added: ids.length, skipped: parsed.data.messageIds.length - ids.length }, 201);
  } catch (e) { console.error(e); return serverError(); }
};
