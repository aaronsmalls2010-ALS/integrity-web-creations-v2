'use client'

/**
 * LOOP MECHANICS — the wrap.
 *
 * Loop target: SCENE 1 (the landing) — Aaron 2026-06-11, answering the brief's
 * open question #2 the other way: the wrap returns to the very first landing
 * page, not the car.
 *
 * Contract: the visual state at every point inside wrapZone is pixel-identical
 * to the state at the `scene1` label (landing at rest: bg xPercent:0/yPercent:0/
 * scale:1/autoAlpha:1; landing copy at its REVEALED rest values — T7 scrubs it
 * back in; all other scenes autoAlpha:0). T7 ends in exactly that state;
 * wrapBuffer holds it.
 *
 * Wrap fires only on FORWARD direction — scrolling up inside wrapZone simply
 * reverses T7 (valid and coherent). The 0.2-weight buffer absorbs scrub lag and
 * fast-flick overshoot: even if the snap lands a few pixels off, both sides of
 * the jump render the identical scene1-rest frame.
 */

import { ScrollTrigger, type ScrollSmoother } from '@/lib/gsap'
import { track } from '@/lib/analytics'

export interface LoopController {
  /** call from the master ScrollTrigger's onUpdate */
  check(self: { direction: number; progress: number }): void
  /** recompute WRAP_AT_PROGRESS after mm rebuilds or ScrollTrigger.refresh() */
  refresh(): void
  readonly cycle: number
}

export function createLoop(opts: {
  getMaster: () => gsap.core.Timeline | null
  getSmoother: () => ScrollSmoother | null
  onWrap?: () => void
}): LoopController {
  let wrapAtProgress = 1 // raw scroll progress at the wrapZone label
  let cycle = 1

  function refresh() {
    const master = opts.getMaster()
    if (!master || !master.duration()) return
    const at = master.labels['wrapZone']
    wrapAtProgress = at != null ? at / master.duration() : 1
  }

  function wrapLoop() {
    const master = opts.getMaster()
    const smoother = opts.getSmoother()
    const st = master?.scrollTrigger
    if (!master || !smoother || !st) return
    smoother.scrollTop(st.labelToScroll('scene1')) // instant jump (no smoothing)
    ScrollTrigger.update() // force the scrub to re-target the new scroll position
    const scrub = st.getTween()
    if (scrub) scrub.progress(1) // snap scrubbed playhead — prevents a visible
    //                              reverse fly-through across all scenes
    // Belt & suspenders: if the scrub re-target was deferred to the next tick,
    // progress(1) completed the OLD target — set the playhead directly. The
    // deferred re-target then finds zero distance and renders no motion.
    const t1 = master.labels['scene1']
    if (t1 != null && Math.abs(master.totalTime() - t1) > 0.01)
      master.totalTime(t1)
    cycle += 1
    opts.onWrap?.()
    track('loop_completed')
  }

  function check(self: { direction: number; progress: number }) {
    if (self.direction > 0 && self.progress >= wrapAtProgress) wrapLoop()
  }

  return {
    check,
    refresh,
    get cycle() {
      return cycle
    },
  }
}
