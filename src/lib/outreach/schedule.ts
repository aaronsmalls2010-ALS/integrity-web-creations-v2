/**
 * Batch scheduling: assign each approved message a scheduled_after timestamp
 * with a randomized human-looking gap (settings.min/max_gap_minutes), rolling
 * past the send window and weekends. The engine's sendGate() still re-checks
 * window/cap at send time — this staggering is the first line of pacing, the
 * gate is the enforcement.
 */
import { getOutreachClient } from '../supabase/outreach';
import { getSettings } from './db';

function tzParts(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, hour: '2-digit', weekday: 'short',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { hour: Number(get('hour')) % 24, weekday: get('weekday') };
}

/** Push a candidate time forward until it lands on a weekday inside the window. */
function normalize(d: Date, tz: string, startH: number, endH: number): Date {
  let t = new Date(d);
  for (let i = 0; i < 21 * 24; i++) { // bounded walk, 1h steps max 3 weeks
    const { hour, weekday } = tzParts(t, tz);
    if (weekday === 'Sat' || weekday === 'Sun' || hour >= endH) {
      t = new Date(t.getTime() + 3600_000); // step an hour forward
      continue;
    }
    if (hour < startH) {
      t = new Date(t.getTime() + (startH - hour) * 3600_000);
      continue;
    }
    return t;
  }
  return t;
}

export async function scheduleBatch(batchId: string): Promise<{ scheduled: number; first?: string; last?: string }> {
  const settings = await getSettings();
  const sb = getOutreachClient();
  const { data: msgs, error } = await sb.from('messages')
    .select('id').eq('batch_id', batchId).eq('status', 'approved').order('created_at');
  if (error) throw error;
  if (!msgs?.length) return { scheduled: 0 };

  const minMs = settings.min_gap_minutes * 60_000;
  const maxMs = settings.max_gap_minutes * 60_000;
  let cursor = normalize(new Date(Date.now() + 60_000), settings.timezone,
    settings.send_window_start, settings.send_window_end);
  let first: string | undefined;
  let last: string | undefined;

  for (const m of msgs) {
    const iso = cursor.toISOString();
    const { error: ue } = await sb.from('messages')
      .update({ status: 'queued', scheduled_after: iso, updated_at: new Date().toISOString() })
      .eq('id', m.id).eq('status', 'approved');
    if (ue) throw ue;
    first = first ?? iso;
    last = iso;
    const gap = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
    cursor = normalize(new Date(cursor.getTime() + gap), settings.timezone,
      settings.send_window_start, settings.send_window_end);
  }

  await sb.from('batches').update({ status: 'sending', approved_at: new Date().toISOString() }).eq('id', batchId);
  // Leads with newly queued openers move to 'queued'.
  const { data: queuedMsgs } = await sb.from('messages')
    .select('lead_id, sequence_step').eq('batch_id', batchId).eq('status', 'queued');
  const leadIds = [...new Set((queuedMsgs ?? []).filter((m) => m.sequence_step === 1).map((m) => m.lead_id))];
  if (leadIds.length) {
    await sb.from('leads').update({ status: 'queued', updated_at: new Date().toISOString() })
      .in('id', leadIds).in('status', ['new', 'qualified']);
  }
  return { scheduled: msgs.length, first, last };
}
