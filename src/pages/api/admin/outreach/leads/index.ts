import type { APIRoute } from 'astro';
import { leadSchema } from '../../../../../lib/outreach/validation';
import { listLeads, createLead, logEvent } from '../../../../../lib/outreach/db';
import { badRequest, json, unprocessable, serverError } from '../../../../../lib/http';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const leads = await listLeads({
      status: url.searchParams.get('status') ?? undefined,
      category: url.searchParams.get('category') ?? undefined,
      town: url.searchParams.get('town') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
      hasEmail: url.searchParams.has('hasEmail') ? url.searchParams.get('hasEmail') === 'true' : undefined,
    });
    return json({ leads });
  } catch (e) { console.error(e); return serverError(); }
};

export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    const lead = await createLead({ ...parsed.data, source: 'manual' });
    await logEvent('lead_created', { leadId: lead.id, detail: { source: 'manual' } });
    return json({ lead }, 201);
  } catch (e: any) {
    if (e?.code === '23505') return unprocessable('A lead with this email or business name already exists');
    console.error(e); return serverError();
  }
};
