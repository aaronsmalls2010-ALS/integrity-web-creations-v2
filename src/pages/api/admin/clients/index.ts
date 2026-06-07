import type { APIRoute } from 'astro';
import { clientSchema } from '../../../../lib/validation';
import { createClient } from '../../../../lib/db/clients';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    const client = await createClient(cookies, parsed.data);
    return json({ client }, 201);
  } catch (e) { console.error(e); return serverError(); }
};
