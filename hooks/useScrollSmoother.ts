'use client'

import { ScrollSmoother } from '@/lib/gsap'
import { SMOOTH } from '@/components/cinematic/config'

/** Creates the ScrollSmoother, gated (paused) until the preloader completes. */
export function createSmoother() {
  const smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: SMOOTH,
    effects: true, // for future non-pinned pages only — no data-speed/lag in #cinematic
    normalizeScroll: true,
    ignoreMobileResize: true,
  })
  smoother.paused(true)
  return smoother
}
