import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getBatchWithMessages, updateBatch, logEvent } from '../../../../../lib/outreach/db';
import { scheduleBatch } from '../../../../../lib/outreach/schedule';
import { getOutreachClient } from '../../../../../lib/supabase/outreach';
import { badRequest, json, unprocessable, serverError } from '../../../../../lib/http';

export const prerender = false;

const schema = z.object({ action: z.enum(['approve', 'pause', 'resume', 'cancel']) });

export const GET: APIRoute = async ({ params }) => {
  try {
    return json(await getBatchWithMessages(params.id!));
  } catch (e) { console.error(e); return serverError(); }
};

export const PUT: APIRoute = async ({ params, request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);

  try {
    const { batch } = await getBatchWithMessages(params.id!);
    const action = parsed.data.action;

    if (action === 'approve') {
      if (batch.status !== 'open') return unprocessable('Only open batches can be approved');
      const result = await scheduleBatch(batch.id);
      await logEvent('batch_approved', { detail: { batchId: batch.id, ...result } });
      return json({ ok: true, ...result });
    }
    if (action === 'pause') {
      if (batch.status !== 'sending') return unprocessable('Only sending batches can be paused');
      await updateBatch(batch.id, { status: 'paused' });
      await logEvent('batch_paused', { detail: { batchId: batch.id } });
      return json({ ok: true });
    }
    if (action === 'resume') {
      if (batch.status !== 'paused') return unprocessable('Only paused batches can be resumed');
      await updateBatch(batch.id, { status: 'sending' });
      await logEvent('batch_resumed', { detail: { batchId: batch.id } });
      return json({ ok: true });
    }
    // cancel
    if (['completed', 'canceled'].includes(batch.status)) return unprocessable('Batch is already finished');
    const sb = getOutreachClient();
    await sb.from('messages')
      .update({ status: 'canceled', error: 'Batch canceled' })
      .eq('batch_id', batch.id).in('status', ['approved', 'queued']);
    await updateBatch(batch.id, { status: 'canceled' });
    await logEvent('batch_canceled', { detail: { batchId: batch.id } });
    return json({ ok: true });
  } catch (e) { console.error(e); return serverError(); }
};
