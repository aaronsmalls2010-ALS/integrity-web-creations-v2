import type { APIRoute } from 'astro';
import { generateRecurring } from '../../../lib/cron/generate';
import { json, unauthorized, serverError } from '../../../lib/http';

export const prerender = false;

function authed(request: Request): boolean {
  const secret = import.meta.env.CRON_SECRET;
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`;
}

export const GET: APIRoute = async ({ request }) => {
  if (!authed(request)) return unauthorized();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  try { return json({ generated: await generateRecurring(today) }); }
  catch (e) { console.error(e); return serverError(); }
};
