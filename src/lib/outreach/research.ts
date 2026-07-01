/**
 * Lead research + draft generation via the Anthropic API (raw fetch — same
 * "no deps for minor tasks" convention as the blog store).
 *
 * runResearch(): one Claude call with the web_search server tool, encoding the
 * playbook methodology (verify the business operates, judge web presence,
 * never fabricate). Results land in outreach.candidates as 'pending' for
 * human review — nothing enters the lead pool without approval.
 *
 * generateOpener(): writes the personalized first-touch email for a lead in
 * the house voice. The CAN-SPAM footer is NOT part of the draft — the send
 * engine injects it at send time.
 */
import { getOutreachClient } from '../supabase/outreach';
import { logEvent } from './db';

const API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

function apiKey(): string {
  const k = import.meta.env.ANTHROPIC_API_KEY;
  if (!k) throw new Error('ANTHROPIC_API_KEY not configured');
  return k;
}

async function callClaude(body: object): Promise<any> {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey(),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function extractText(resp: any): string {
  return (resp.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n');
}

function extractJsonArray(text: string): any[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON array in model output');
  return JSON.parse(raw.slice(start, end + 1));
}

export interface CandidatePayload {
  business_name: string;
  category: string;
  town: string;
  web_presence: string;
  presence_notes: string;
  email: string | null;
  phone: string | null;
  facebook_url: string | null;
  website_url: string | null;
  pitch_angle: string;
}

const RESEARCH_SYSTEM = `You are a lead-generation researcher for Integrity Web Creations, a web design agency in Beaufort, SC. You find currently-operating small businesses and organizations that have either NO website (only a Facebook page or Google listing) or a BAD website (broken images, not mobile-friendly, ancient template, expired or hijacked domain, stale content).

HARD RULES:
- NEVER fabricate a business, email address, or phone number. If you cannot verify contact info from a source you actually read, use null.
- Only include businesses you have real evidence currently operate (recent reviews, active Facebook posts, current directory listings).
- For businesses with websites, only classify as bad_website when you saw concrete evidence of a specific defect — name the defect.
- web_presence must be one of: none, facebook_only, google_only, bad_website.
- Exclude any business that already appears to be a web design/marketing agency.

Return ONLY a JSON array (in a \`\`\`json fence) of objects with exactly these keys:
business_name, category, town, web_presence, presence_notes, email, phone, facebook_url, website_url, pitch_angle
- category: one of restaurant, trades, barber_beauty, church, nonprofit, greek, professional, retail, auto, cleaning, childcare, other
- presence_notes: the specific evidence you found (defect, follower count, established year, address)
- pitch_angle: one line on why they are a strong pitch target`;

export async function runResearch(area: string, categories: string, maxCandidates: number): Promise<{ runId: string; found: number }> {
  const sb = getOutreachClient();
  const query = `${categories} in ${area}`;
  const { data: run, error } = await sb.from('research_runs')
    .insert({ query, status: 'running' }).select().single();
  if (error) throw error;

  try {
    const resp = await callClaude({
      model: MODEL,
      max_tokens: 8000,
      system: RESEARCH_SYSTEM,
      messages: [{
        role: 'user',
        content: `Research area: ${area}\nTarget categories: ${categories}\nFind up to ${maxCandidates} strong candidates. Use web search to verify each one before including it. Prioritize the clearest website gaps and the most urgent problems (dead/hijacked domains first).`,
      }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 15 }],
    });

    const items = extractJsonArray(extractText(resp)).slice(0, maxCandidates);
    let inserted = 0;
    for (const item of items) {
      if (!item?.business_name) continue;
      // Skip candidates that already exist in the lead pool (by name+town).
      const { data: dupe } = await sb.from('leads').select('id')
        .ilike('business_name', String(item.business_name).trim())
        .limit(1);
      const status = dupe?.length ? 'duplicate' : 'pending';
      const { error: ce } = await sb.from('candidates')
        .insert({ research_run_id: run.id, payload: item, status });
      if (!ce) inserted++;
    }
    await sb.from('research_runs').update({
      status: 'completed', candidates_found: inserted, completed_at: new Date().toISOString(),
    }).eq('id', run.id);
    await logEvent('research_completed', { detail: { runId: run.id, query, found: inserted } });
    return { runId: run.id, found: inserted };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Research failed';
    await sb.from('research_runs').update({
      status: 'failed', error: msg, completed_at: new Date().toISOString(),
    }).eq('id', run.id);
    throw e;
  }
}

const OPENER_SYSTEM = `You write cold-outreach first-touch emails for Aaron Smalls of Integrity Web Creations (Beaufort, SC web design agency, founded 2010, reopening its client roster).

THE OFFER (state it exactly in this spirit): the website is designed and built completely free — the client sees and approves the finished site before paying anything — then a flat $100/month covers hosting, security, and unlimited updates. Cancel anytime, no contracts.

VOICE RULES:
- Open with THEIR specific observed problem (from the lead data) — never a generic pitch.
- Neighborly, confident, zero hype. Never insulting about their current site — frame problems as costing them customers, not as embarrassments.
- For churches, chapters, veterans posts: lead with respect for their history and address the communications officer.
- Reference the closest relevant portfolio proof when natural (Friendship Baptist Church for churches/orgs, Grand Line Garage for auto/trades, Luther's for restaurants).
- Offer to meet in person (Aaron is local).
- Under 160 words. No subject-line gimmicks.
- Do NOT include a signature, physical address, or unsubscribe line — the system appends those automatically.

Return ONLY a JSON object in a \`\`\`json fence: {"subject": "...", "body": "..."} where body uses \\n\\n between paragraphs and ends with "— Aaron".`;

export async function generateOpener(lead: {
  business_name: string; category: string; town: string | null;
  web_presence: string; presence_notes: string | null; pitch_angle: string | null;
  contact_name?: string | null;
}): Promise<{ subject: string; body: string }> {
  const resp = await callClaude({
    model: MODEL,
    max_tokens: 1200,
    system: OPENER_SYSTEM,
    messages: [{
      role: 'user',
      content: `Write the opener for this lead:\n${JSON.stringify(lead, null, 2)}`,
    }],
  });
  const text = extractText(resp);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const obj = JSON.parse(raw.slice(start, end + 1));
  if (!obj.subject || !obj.body) throw new Error('Model returned incomplete draft');
  return { subject: String(obj.subject).slice(0, 200), body: String(obj.body).slice(0, 10000) };
}

/** Template-based follow-ups (playbook Email 2 / Email 3) — no AI call needed. */
export function followUpTemplate(lead: { business_name: string; category: string; contact_name?: string | null }, step: 2 | 3): { subject: string; body: string } {
  const name = lead.contact_name?.split(' ')[0] || 'there';
  if (step === 2) {
    return {
      subject: `Built this for a Lowcountry ${lead.category === 'church' ? 'church' : 'business'} — 2 weeks, $0 down`,
      body: `Hi ${name} — following up briefly.\n\nRather than tell you what I'd do for ${lead.business_name}, here's what I've built for other Lowcountry organizations: integritywebcreations.com/portfolio. Design to launch in under a month, nothing paid until they approved it.\n\nFor context on what this normally costs: agencies around here charge $3,500–$7,500 up front plus monthly hosting. My model is $0 up front, $100/month flat, cancel anytime. Over three years you'd pay less with me than their build alone — and your site keeps improving the whole time instead of going stale.\n\nIf a free, no-obligation mockup for ${lead.business_name} sounds interesting, just reply "show me."\n\n— Aaron`,
    };
  }
  return {
    subject: `Closing the loop`,
    body: `Hi ${name},\n\nLast note from me. I take on a limited number of free builds each month so every site gets real attention, and I'm filling this month's spots now.\n\nIf the timing's wrong, no problem at all — I'm local, so if you ever want to talk websites over coffee, my door's open: (843) 263-0072.\n\nEither way, all the best to ${lead.business_name}.\n\n— Aaron`,
  };
}
