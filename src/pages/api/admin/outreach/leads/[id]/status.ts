import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getLead, updateLead, addSuppression, logEvent } from '../../../../../../lib/outreach/db';
import { getOutreachClient } from '../../../../../../lib/supabase/outreach';
import { badRequest, json, unprocessable, serverError } from '../../../../../../lib/http';

export const prerender = false;

const schema = z.object({
  status: z.enum(['new', 'qualified', 'replied', 'won', 'lost', 'opted_out', 'invalid']),
});

export const POST: APIRoute = async ({ params, request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);

  try {
    const lead = await getLead(params.id!);
    const status = parsed.data.status;
    await updateLead(lead.id, { status });

    // Terminal statuses cancel anything still pending for this lead.
    if (['opted_out', 'won', 'lost', 'invalid', 'replied'].includes(status)) {
      const sb = getOutreachClient();
      await sb.from('messages')
        .update({ status: 'canceled', error: `Lead marked ${status}` })
        .eq('lead_id', lead.id).in('status', ['draft', 'approved', 'queued']);
    }
    if (status === 'opted_out' && lead.email) {
      await addSuppression(lead.email, 'manual');
    }
    await logEvent('status_change', { leadId: lead.id, detail: { to: status } });
    return json({ ok: true });
  } catch (e) { console.error(e); return serverError(); }
};
