import type { APIRoute } from 'astro';
import { settingsSchema } from '../../../../lib/outreach/validation';
import { getSettings, updateSettings, logEvent } from '../../../../lib/outreach/db';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  try { return json({ settings: await getSettings() }); }
  catch (e) { console.error(e); return serverError(); }
};

export const PUT: APIRoute = async ({ request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    const settings = await updateSettings(parsed.data);
    await logEvent('settings_updated', { detail: { kill_switch: settings.kill_switch, daily_cap: settings.daily_cap } });
    return json({ settings });
  } catch (e) { console.error(e); return serverError(); }
};
