import type { APIRoute } from 'astro';
import { recurringSchema } from '../../../../lib/validation';
import { updateSchedule, deactivateSchedule } from '../../../../lib/db/recurring';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = recurringSchema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try { return json({ schedule: await updateSchedule(cookies, params.id!, parsed.data) }); }
  catch (e) { console.error(e); return serverError(); }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  try { await deactivateSchedule(cookies, params.id!); return json({ success: true }); }
  catch (e) { console.error(e); return serverError(); }
};
