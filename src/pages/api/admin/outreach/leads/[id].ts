import type { APIRoute } from 'astro';
import { leadSchema } from '../../../../../lib/outreach/validation';
import { getLead, updateLead, deleteLead, listMessagesForLead, listEventsForLead, logEvent } from '../../../../../lib/outreach/db';
import { badRequest, json, unprocessable, serverError } from '../../../../../lib/http';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const [lead, messages, events] = await Promise.all([
      getLead(params.id!), listMessagesForLead(params.id!), listEventsForLead(params.id!),
    ]);
    return json({ lead, messages, events });
  } catch (e) { console.error(e); return serverError(); }
};

export const PUT: APIRoute = async ({ params, request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = leadSchema.partial().safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    const lead = await updateLead(params.id!, parsed.data);
    return json({ lead });
  } catch (e: any) {
    if (e?.code === '23505') return unprocessable('A lead with this email or business name already exists');
    console.error(e); return serverError();
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    await logEvent('lead_deleted', { leadId: params.id });
    await deleteLead(params.id!);
    return json({ ok: true });
  } catch (e) { console.error(e); return serverError(); }
};
