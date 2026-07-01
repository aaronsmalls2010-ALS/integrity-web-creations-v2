/**
 * Outreach send engine.
 *
 * Every safeguard is enforced HERE, server-side, at the moment of send —
 * never trust the UI:
 *   1. Kill switch (settings.kill_switch) halts everything instantly.
 *   2. Daily cap (settings.daily_cap, hard ceiling HARD_DAILY_CEILING=25).
 *   3. Send window: business hours in settings.timezone, weekdays only.
 *   4. Suppression list checked at send time (not just at queue time).
 *   5. Dedup: an address that ever received a step-1 opener is never sent
 *      another opener.
 *   6. Randomized gaps are baked into scheduled_after at approval time and
 *      claim_due_message() only releases messages whose time has come.
 *   7. CAN-SPAM: physical address + unsubscribe link are injected into every
 *      email here — they cannot be forgotten or edited out.
 *
 * Sends are driven by the admin-page heartbeat hitting /api/admin/outreach/tick
 * roughly once a minute. One message per tick, atomically claimed via the
 * Postgres claim_due_message() function (skip-locked; multiple open tabs
 * cannot double-send). Nothing sends while the admin is away — that is a
 * feature, not a limitation.
 */
import crypto from 'node:crypto';
import { getOutreachClient } from '../supabase/outreach';
import { sendEmail } from '../email/postmark';
import {
  getSettings, isSuppressed, alreadyContacted, sentSince, logEvent,
  updateMessage, updateLead, type OutreachSettings,
} from './db';
import { HARD_DAILY_CEILING } from './validation';

const SITE = 'https://www.integritywebcreations.com';

function unsubSecret(): string {
  const s = import.meta.env.OUTREACH_SECRET || import.meta.env.CRON_SECRET;
  if (!s) throw new Error('OUTREACH_SECRET or CRON_SECRET must be set');
  return s;
}

export function unsubscribeToken(email: string): string {
  const e = email.toLowerCase();
  const mac = crypto.createHmac('sha256', unsubSecret()).update(e).digest('base64url');
  return `${Buffer.from(e).toString('base64url')}.${mac}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  try {
    const email = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8');
    const expected = crypto.createHmac('sha256', unsubSecret()).update(email).digest('base64url');
    const given = token.slice(dot + 1);
    if (expected.length === given.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))) {
      return email;
    }
  } catch { /* fall through */ }
  return null;
}

/** Parts of "now" in the outreach timezone. */
function nowInTz(tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    hour: Number(get('hour')) % 24,
    weekday: get('weekday'), // 'Mon'...'Sun'
    dateStr: `${get('year')}-${get('month')}-${get('day')}`, // YYYY-MM-DD local
  };
}

/** UTC ISO timestamp of local midnight today in tz (for daily-cap counting). */
function startOfLocalDayIso(tz: string): string {
  const { dateStr } = nowInTz(tz);
  // Find the UTC instant when tz clock read 00:00 today by probing the offset.
  const guess = new Date(`${dateStr}T00:00:00Z`);
  for (let h = -14; h <= 14; h++) {
    const probe = new Date(guess.getTime() - h * 3600_000);
    const local = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
    }).formatToParts(probe);
    const get = (t: string) => local.find((p) => p.type === t)?.value ?? '';
    if (`${get('year')}-${get('month')}-${get('day')}` === dateStr && Number(get('hour')) % 24 === 0) {
      return probe.toISOString();
    }
  }
  return guess.toISOString(); // fallback: UTC midnight
}

export interface GateResult { open: boolean; reason?: string; sentToday: number; cap: number; }

/** Are we currently allowed to send at all? */
export async function sendGate(settings?: OutreachSettings): Promise<GateResult> {
  const s = settings ?? await getSettings();
  const cap = Math.min(s.daily_cap, HARD_DAILY_CEILING);
  const sentToday = await sentSince(startOfLocalDayIso(s.timezone));
  if (s.kill_switch) return { open: false, reason: 'Kill switch is ON', sentToday, cap };
  if (!s.physical_address.trim()) {
    return { open: false, reason: 'Set your physical business address in Send Settings first (CAN-SPAM requires it on every email)', sentToday, cap };
  }
  const { hour, weekday } = nowInTz(s.timezone);
  if (weekday === 'Sat' || weekday === 'Sun') {
    return { open: false, reason: 'Weekend — sends resume Monday', sentToday, cap };
  }
  if (hour < s.send_window_start || hour >= s.send_window_end) {
    return { open: false, reason: `Outside send window (${s.send_window_start}:00–${s.send_window_end}:00 ${s.timezone})`, sentToday, cap };
  }
  if (sentToday >= cap) return { open: false, reason: `Daily cap reached (${sentToday}/${cap})`, sentToday, cap };
  return { open: true, sentToday, cap };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Compose final text + html bodies with the mandatory CAN-SPAM footer. */
export function composeFinal(body: string, settings: OutreachSettings, toEmail: string) {
  const unsubUrl = `${SITE}/api/webhooks/unsubscribe?t=${unsubscribeToken(toEmail)}`;
  const sigText = [
    '', '—', settings.from_name,
    'Integrity Web Creations · Beaufort, SC',
    '(843) 263-0072 · integritywebcreations.com',
    settings.physical_address,
    '', `Not interested? Unsubscribe here and I won't email again: ${unsubUrl}`,
  ].join('\n');
  const text = `${body}\n${sigText}`;

  const paras = body.split(/\n{2,}/).map((p) =>
    `<p style="margin:0 0 14px 0;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('');
  const html = `<!doctype html><html><body style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:640px;">
${paras}
<p style="margin:18px 0 4px 0;">— ${escapeHtml(settings.from_name)}<br/>
Integrity Web Creations · Beaufort, SC<br/>
(843) 263-0072 · <a href="${SITE}" style="color:#0a3d62;">integritywebcreations.com</a><br/>
${escapeHtml(settings.physical_address)}</p>
<p style="margin:16px 0 0 0;font-size:12px;color:#777;">Not interested? <a href="${unsubUrl}" style="color:#777;">Unsubscribe</a> and I won't email again.</p>
</body></html>`;
  return { text, html, unsubUrl };
}

export interface TickResult {
  sent: boolean;
  gate: GateResult;
  message?: { id: string; to: string; subject: string };
  skipped?: string;
}

/** Process one heartbeat tick: claim at most one due message and send it. */
export async function processTick(): Promise<TickResult> {
  const settings = await getSettings();
  const gate = await sendGate(settings);
  if (!gate.open) return { sent: false, gate };

  const sb = getOutreachClient();
  const { data: claimed, error } = await sb.rpc('claim_due_message');
  if (error) throw error;
  const msg = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!msg) return { sent: false, gate, skipped: 'Nothing due' };

  // Load the lead for final checks.
  const { data: lead, error: le } = await sb.from('leads').select('*').eq('id', msg.lead_id).single();
  const fail = async (reason: string, status = 'canceled') => {
    await updateMessage(msg.id, { status, error: reason });
    await logEvent('send_blocked', { leadId: msg.lead_id, messageId: msg.id, detail: { reason } });
    return { sent: false, gate, skipped: reason } as TickResult;
  };
  if (le || !lead) return fail('Lead not found');
  const to = (lead.email ?? '').toLowerCase().trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail('Lead has no valid email');
  if (lead.status === 'opted_out' || lead.status === 'invalid') return fail(`Lead is ${lead.status}`);
  if (await isSuppressed(to)) return fail('Address is on the suppression list');
  if (msg.sequence_step === 1 && await alreadyContacted(to)) {
    // Another lead row with the same address already got an opener.
    return fail('Address already contacted (dedup guard)');
  }

  const { text, html } = composeFinal(msg.body, settings, to);
  try {
    await sendEmail({ to, subject: msg.subject, htmlBody: html, textBody: text });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'SMTP send failed';
    await updateMessage(msg.id, { status: 'failed', error: errMsg });
    await logEvent('send_failed', { leadId: lead.id, messageId: msg.id, detail: { error: errMsg } });
    return { sent: false, gate, skipped: `Send failed: ${errMsg}` };
  }

  await updateMessage(msg.id, { status: 'sent', sent_at: new Date().toISOString(), error: null });
  const newStatus = msg.sequence_step === 1 ? 'contacted'
    : msg.sequence_step === 2 ? 'followup_1' : 'followup_2';
  await updateLead(lead.id, { status: newStatus });
  await logEvent('sent', { leadId: lead.id, messageId: msg.id, detail: { to, subject: msg.subject, step: msg.sequence_step } });

  // Close out the batch if this was its last pending message.
  if (msg.batch_id) {
    const { count } = await sb.from('messages').select('id', { count: 'exact', head: true })
      .eq('batch_id', msg.batch_id).in('status', ['queued', 'sending']);
    if ((count ?? 0) === 0) {
      await sb.from('batches').update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', msg.batch_id);
    }
  }

  return { sent: true, gate: { ...gate, sentToday: gate.sentToday + 1 }, message: { id: msg.id, to, subject: msg.subject } };
}

/** Handle a verified unsubscribe: suppress + mark any matching leads. */
export async function performUnsubscribe(email: string) {
  const sb = getOutreachClient();
  const e = email.toLowerCase();
  await sb.from('suppression_list').upsert({ email: e, reason: 'unsubscribed' }, { onConflict: 'email' });
  const { data: leads } = await sb.from('leads').select('id').eq('email', e);
  for (const l of leads ?? []) {
    await updateLead(l.id, { status: 'opted_out' });
    // Cancel anything still pending for this lead.
    await sb.from('messages').update({ status: 'canceled', error: 'Recipient unsubscribed' })
      .eq('lead_id', l.id).in('status', ['draft', 'approved', 'queued']);
    await logEvent('unsubscribed', { leadId: l.id, detail: { email: e } });
  }
  if (!leads?.length) await logEvent('unsubscribed', { detail: { email: e } });
}
