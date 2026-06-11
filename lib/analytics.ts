'use client'

import { track as vercelTrack } from '@vercel/analytics'

/**
 * Phase 1 events (per brief):
 *  - scene_view        { scene, cycle }   once per scene per cycle
 *  - loop_completed                       fired in wrapLoop()
 *  - cta_click         { cta: 'start_project' | 'june_offer' | 'consultation' }
 *  - contact_submitted
 */
export function track(
  event: string,
  data?: Record<string, string | number | boolean>,
) {
  try {
    vercelTrack(event, data)
  } catch {
    // analytics must never break the experience
  }
}
