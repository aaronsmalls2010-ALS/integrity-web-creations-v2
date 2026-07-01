import type { APIRoute } from 'astro';
import { getLead, createDraft, listMessagesForLead, logEvent } from '../../../../../../lib/outreach/db';
import { generateOpener, followUpTemplate } from '../../../../../../lib/outreach/research';
import { badRequest, json, serverError, unprocessable } from '../../../../../../lib/http';

export const prerender = false;

/** Generate a draft for a lead: step 1 = AI opener, steps 2/3 = playbook templates. */
export const POST: APIRoute = async ({ params, request }) => {
  let step = 1;
  try {
    const body = await request.json().catch(() => ({}));
    step = Number(body?.step ?? 1);
  } catch { /* default */ }
  if (![1, 2, 3].includes(step)) return badRequest('step must be 1, 2 or 3');

  try {
    const lead = await getLead(params.id!);
    if (lead.status === 'opted_out') return unprocessable('Lead has opted out');
    const existing = await listMessagesForLead(lead.id);
    if (existing.some((m: any) => m.sequence_step === step && !['canceled', 'failed'].includes(m.status))) {
      return unprocessable(`A step-${step} message already exists for this lead`);
    }
    if (step > 1 && !existing.some((m: any) => m.sequence_step === step - 1 && m.status === 'sent')) {
      return unprocessable(`Step ${step - 1} has not been sent yet`);
    }

    const draft = step === 1 ? await generateOpener(lead) : followUpTemplate(lead, step as 2 | 3);
    const message = await createDraft(lead.id, draft.subject, draft.body, step);
    await logEvent('draft_created', { leadId: lead.id, messageId: message.id, detail: { step, generator: step === 1 ? 'ai' : 'template' } });
    return json({ message }, 201);
  } catch (e) { console.error(e); return serverError(e instanceof Error ? e.message : undefined); }
};
