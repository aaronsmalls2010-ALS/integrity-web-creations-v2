import type { APIRoute } from 'astro';
import { processTick } from '../../../../lib/outreach/engine';
import { json, serverError } from '../../../../lib/http';

export const prerender = false;

/**
 * Heartbeat endpoint. The outreach admin pages ping this ~once a minute while
 * open; each tick sends AT MOST ONE due message (atomic claim, all safeguards
 * re-checked at send time). No admin tab open → nothing sends. That is the
 * design: a human is always nearby while the campaign is running.
 */
export const POST: APIRoute = async () => {
  try {
    const result = await processTick();
    return json(result);
  } catch (e) {
    console.error('tick failed', e);
    return serverError(e instanceof Error ? e.message : undefined);
  }
};
