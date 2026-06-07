import type { APIRoute } from 'astro';
import { clientSchema } from '../../../../lib/validation';
import { updateClient, archiveClient } from '../../../../lib/db/clients';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    const client = await updateClient(cookies, params.id!, parsed.data);
    return json({ client });
  } catch (e) { console.error(e); return serverError(); }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  try { await archiveClient(cookies, params.id!); return json({ success: true }); }
  catch (e) { console.error(e); return serverError(); }
};
