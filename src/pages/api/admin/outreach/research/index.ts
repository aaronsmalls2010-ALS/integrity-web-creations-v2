import type { APIRoute } from 'astro';
import { researchSchema } from '../../../../../lib/outreach/validation';
import { runResearch } from '../../../../../lib/outreach/research';
import { getOutreachClient } from '../../../../../lib/supabase/outreach';
import { badRequest, json, unprocessable, serverError } from '../../../../../lib/http';

export const prerender = false;
// Research runs make multiple web searches inside one model call.
export const maxDuration = 300;

export const GET: APIRoute = async () => {
  try {
    const sb = getOutreachClient();
    const { data: runs, error } = await sb.from('research_runs').select('*')
      .order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    const { data: candidates, error: e2 } = await sb.from('candidates')
      .select('*').eq('status', 'pending').order('created_at').limit(100);
    if (e2) throw e2;
    return json({ runs, candidates });
  } catch (e) { console.error(e); return serverError(); }
};

export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = researchSchema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    const result = await runResearch(parsed.data.area, parsed.data.categories, parsed.data.max_candidates);
    return json(result, 201);
  } catch (e) {
    console.error(e);
    return serverError(e instanceof Error ? e.message : undefined);
  }
};
