import type { APIRoute } from 'astro';
import { z } from 'zod';
import { leadSchema } from '../../../../../lib/outreach/validation';
import { createLead, createDraft, logEvent } from '../../../../../lib/outreach/db';
import { generateOpener } from '../../../../../lib/outreach/research';
import { getOutreachClient } from '../../../../../lib/supabase/outreach';
import { badRequest, json, unprocessable, serverError } from '../../../../../lib/http';

export const prerender = false;
export const maxDuration = 120; // approval can include an AI opener draft

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  draft_opener: z.boolean().default(true),
});

export const POST: APIRoute = async ({ params, request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);

  try {
    const sb = getOutreachClient();
    const { data: cand, error } = await sb.from('candidates').select('*').eq('id', params.id!).single();
    if (error) throw error;
    if (cand.status !== 'pending') return unprocessable('Candidate has already been reviewed');

    if (parsed.data.action === 'reject') {
      await sb.from('candidates').update({ status: 'rejected' }).eq('id', cand.id);
      return json({ ok: true });
    }

    // Approve: validate the researched payload through the same schema as manual entry.
    const p = cand.payload ?? {};
    const leadParsed = leadSchema.safeParse({
      business_name: p.business_name,
      category: p.category ?? 'other',
      town: p.town ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      facebook_url: p.facebook_url ?? null,
      website_url: p.website_url ?? null,
      web_presence: ['none', 'facebook_only', 'google_only', 'bad_website', 'ok_website'].includes(p.web_presence) ? p.web_presence : 'unknown',
      presence_notes: p.presence_notes ?? null,
      pitch_angle: p.pitch_angle ?? null,
    });
    if (!leadParsed.success) return unprocessable(`Candidate data invalid: ${leadParsed.error.issues[0].message}`);

    let lead;
    try {
      lead = await createLead({ ...leadParsed.data, source: 'research_run', research_run_id: cand.research_run_id });
    } catch (e: any) {
      if (e?.code === '23505') {
        await sb.from('candidates').update({ status: 'duplicate' }).eq('id', cand.id);
        return unprocessable('This lead already exists in the pool (marked duplicate)');
      }
      throw e;
    }
    await sb.from('candidates').update({ status: 'approved' }).eq('id', cand.id);
    await logEvent('lead_created', { leadId: lead.id, detail: { source: 'research_run', runId: cand.research_run_id } });

    let message = null;
    if (parsed.data.draft_opener) {
      try {
        const draft = await generateOpener(lead);
        message = await createDraft(lead.id, draft.subject, draft.body, 1);
        await logEvent('draft_created', { leadId: lead.id, messageId: message.id, detail: { step: 1, generator: 'ai' } });
      } catch (e) {
        console.error('opener generation failed (lead still created)', e);
      }
    }
    return json({ lead, message }, 201);
  } catch (e) { console.error(e); return serverError(); }
};
