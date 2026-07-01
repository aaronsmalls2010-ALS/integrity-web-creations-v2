import type { APIRoute } from 'astro';
import { messageEditSchema } from '../../../../../lib/outreach/validation';
import { getMessage, updateMessage, logEvent } from '../../../../../lib/outreach/db';
import { badRequest, json, unprocessable, serverError } from '../../../../../lib/http';

export const prerender = false;

/** Edit a draft's subject/body. Only drafts are editable. */
export const PUT: APIRoute = async ({ params, request }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = messageEditSchema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    const msg = await getMessage(params.id!);
    if (msg.status !== 'draft') return unprocessable('Only drafts can be edited');
    const message = await updateMessage(msg.id, parsed.data);
    return json({ message });
  } catch (e) { console.error(e); return serverError(); }
};

/** Cancel a draft/approved/queued message. Sent messages are immutable. */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const msg = await getMessage(params.id!);
    if (!['draft', 'approved', 'queued'].includes(msg.status)) {
      return unprocessable(`Cannot cancel a message with status "${msg.status}"`);
    }
    await updateMessage(msg.id, { status: 'canceled', error: 'Canceled by admin' });
    await logEvent('message_canceled', { leadId: msg.lead_id, messageId: msg.id });
    return json({ ok: true });
  } catch (e) { console.error(e); return serverError(); }
};
