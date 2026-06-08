import type { APIRoute } from 'astro';
import { recurringSchema } from '../../../../lib/validation';
import { createSchedule } from '../../../../lib/db/recurring';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = recurringSchema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try { return json({ schedule: await createSchedule(cookies, parsed.data) }, 201); }
  catch (e) { console.error(e); return serverError(); }
};
