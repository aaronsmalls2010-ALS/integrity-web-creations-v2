import type { APIRoute } from 'astro';
import { voidInvoice, VoidRefused } from '../../../../../lib/db/invoices';
import { json, serverError } from '../../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ params, cookies, request }) => {
  try {
    // The reason is optional on the wire so an older client keeps working, but
    // it is recorded whenever it is supplied. A void that says "wrong amount"
    // is the entry that answers the question a year later.
    let reason: unknown;
    try {
      const body = await request.json();
      reason = (body as { reason?: unknown } | null)?.reason;
    } catch {
      // no body, or not json. Fine.
    }
    return json(await voidInvoice(cookies, params.id!, reason));
  } catch (e) {
    // A refusal is the caller asking for something the rules do not allow, not a
    // fault. Say which, and say it in words the admin can act on.
    if (e instanceof VoidRefused) {
      return json({ error: e.message, reason: e.reason }, 409);
    }
    console.error(e);
    return serverError();
  }
};
