import type { APIRoute } from 'astro';
import { z } from 'zod';
import { listSuppression, addSuppression, removeSuppression, logEvent } from '../../../../lib/outreach/db';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export const GET: APIRoute = async () => {
  try { return json({ suppression: await listSuppression() }); }
  catch (e) { console.error(e); return serverError(); }
};

export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    await addSuppression(parsed.data.email, 'manual');
    await logEvent('suppression_added', { detail: { email: parsed.data.email } });
    return json({ ok: true }, 201);
  } catch (e) { console.error(e); return serverError(); }
};

export const DELETE: APIRoute = async ({ request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    await removeSuppression(parsed.data.email);
    await logEvent('suppression_removed', { detail: { email: parsed.data.email } });
    return json({ ok: true });
  } catch (e) { console.error(e); return serverError(); }
};
