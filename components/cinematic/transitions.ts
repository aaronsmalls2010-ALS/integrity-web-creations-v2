'use client'

/**
 * t1…t7, scene holds, wrapBuffer, copyIn/copyOut — canon: Storyboard.png + brief v3.
 *
 * STATE DETERMINISM RULES (do not violate):
 *  1. Every scene/copy tween is `fromTo` with explicit values (copyOut's .to()
 *     is canon — the next cycle's state is reset by copyIn's explicit fromTo).
 *  2. `autoAlpha` everywhere, never `opacity`.
 *  3. Any property a later cycle depends on appears explicitly in a fromTo pair
 *     (e.g. T7 resets scene-2's xPercent left at -45 by T2).
 *  4. Side effects are scrub-driven (typewriter = tweened state object).
 *  5. Initial states are gsap.set at build (see useMasterTimeline).
 *
 * TRANSFORM OWNERSHIP CONTRACT:
 *  .scene__depth--*  STATIC ONLY (CSS translateZ + compensation scale)
 *  .scene__bg        TIMELINE: xPercent/yPercent/scale/autoAlpha · MOUSE: x/y px
 *  .scene__copy      TIMELINE: autoAlpha/y (children via copyIn/copyOut) · MOUSE: x/y px
 */

import { gsap } from '@/lib/gsap'
import { BLACK_BEAT_TEXT } from '@/lib/sceneData'
import { WEIGHTS } from './config'

export type SplitsMap = Map<string, { lines: Element[] }>

// ── shared helpers ───────────────────────────────────────────────────────────

function isShown(el: Element) {
  return getComputedStyle(el as HTMLElement).display !== 'none'
}

/**
 * SEQUENTIAL reveal (Aaron 2026-06-11): strictly top→bottom, then
 * left→right. ONE line at a time — each reveal completes before the next
 * begins. `budget` = timeline units the whole reveal should roughly occupy;
 * scenes with FEWER lines get LONGER per-line reveals (never rushed).
 * Elements hidden at this breakpoint (mobile headers-only mode) are skipped —
 * gsap.matchMedia rebuilds on breakpoint change, so the set stays correct.
 * ALL fromTo — explicit values (Determinism rule 1).
 */
export function copyIn(sel: string, splits: SplitsMap, budget = 1.5) {
  const tl = gsap.timeline()
  const s = document.querySelector(sel)
  if (!s) return tl

  type Unit = {
    el: Element
    from: gsap.TweenVars
    to: gsap.TweenVars
    mul?: number // duration multiplier (e.g. the form panel's slow fade)
    ease?: string
  }
  const units: Unit[] = []
  const push = (
    el: Element | null,
    from: gsap.TweenVars,
    to: gsap.TweenVars,
    mul?: number,
    ease?: string,
  ) => {
    if (el && isShown(el)) units.push({ el, from, to, mul, ease })
  }

  // visual priority order
  push(s.querySelector('.monogram'), { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0 })
  push(s.querySelector('.label'), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0 })
  const lines = (splits.get(sel)?.lines ?? []).filter((l) => {
    const h = l.closest('.headline')
    return h !== null && isShown(h)
  })
  for (const line of lines)
    units.push({
      el: line,
      from: { autoAlpha: 0, yPercent: 110 },
      to: { autoAlpha: 1, yPercent: 0 },
    })
  push(s.querySelector('.body-copy'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0 })
  s.querySelectorAll('.point').forEach((p) =>
    push(p, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0 }),
  )
  s.querySelectorAll('.chip').forEach((c) =>
    push(c, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0 }),
  )
  s.querySelectorAll('.col').forEach((c) =>
    push(c, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0 }),
  )
  push(s.querySelector('.strap'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0 })
  push(s.querySelector('.cta-wrap'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0 })
  // the form panel fades in SLOWLY (Aaron 2026-06-11)
  push(
    s.querySelector('.form-panel'),
    { autoAlpha: 0, y: 22 },
    { autoAlpha: 1, y: 0 },
    2.5,
    'power1.inOut',
  )

  if (!units.length) return tl
  const per = Math.min(1.1, Math.max(0.3, budget / units.length))
  for (const u of units)
    tl.fromTo(u.el, u.from, {
      ...u.to,
      duration: per * (u.mul ?? 1),
      ease: u.ease ?? 'power2.out',
    })
  return tl
}

export function copyOut(sel: string) {
  const tl = gsap.timeline()
  const targets = document.querySelectorAll(
    `${sel} .monogram, ${sel} .label, ${sel} .headline .split-line, ${sel} .body-copy, ${sel} .point, ${sel} .chip, ${sel} .col, ${sel} .strap, ${sel} .form-panel, ${sel} .cta-wrap`,
  )
  if (targets.length)
    tl.to(targets, {
      autoAlpha: 0,
      y: -18,
      duration: 0.38,
      stagger: 0.04,
      ease: 'power2.in',
    })
  return tl
}

/** pad a segment timeline to exactly its weight (no-op tween, holds rest state) */
function pad(tl: gsap.core.Timeline, weight: number) {
  tl.to({}, { duration: weight }, 0)
  return tl
}

// ── scene holds (duration = weight; copy occupies first ~40%) ───────────────

/** SCENE 1 hold: gentle zoom-out begins on the first scroll — NEVER zoom in
 *  (Aaron 2026-06-11). T1 continues the pull-back from 0.96. */
export function scene1_hold() {
  const tl = gsap.timeline()
  tl.fromTo(
    '#scene-1 .scene__bg',
    { scale: 1.0 },
    { scale: 0.96, ease: 'none', duration: WEIGHTS.scene1 },
    0,
  )
  return tl
}

export function scene2_hold(splits: SplitsMap) {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-2', splits, WEIGHTS.scene2 * 0.95), 0)
  tl.fromTo(
    '#scene-2 .scene__bg',
    { xPercent: 0 },
    { xPercent: -3, ease: 'none', duration: WEIGHTS.scene2 },
    0,
  )
  return tl
}

export function scene3_hold(splits: SplitsMap) {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-3', splits, WEIGHTS.scene3 * 0.95), 0)
  return pad(tl, WEIGHTS.scene3)
}

/** push toward monitors — foreshadows T4 (T4 zooms from 1.06) */
export function scene4_hold(splits: SplitsMap) {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-4', splits, WEIGHTS.scene4 * 0.95), 0)
  tl.fromTo(
    '#scene-4 .scene__bg',
    { scale: 1.0 },
    { scale: 1.06, ease: 'none', duration: WEIGHTS.scene4 },
    0,
  )
  return tl
}

/** services chips reveal one at a time inside copyIn's sequential order */
export function scene5_hold(splits: SplitsMap) {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-5', splits, WEIGHTS.scene5 * 1.2), 0)
  return pad(tl, WEIGHTS.scene5)
}

/** breathing room after the black beat — T5 lands this bg at scale 1.04 */
export function scene6_hold(splits: SplitsMap) {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-6', splits, WEIGHTS.scene6 * 0.95), 0)
  tl.fromTo(
    '#scene-6 .scene__bg',
    { scale: 1.04 },
    { scale: 1.0, ease: 'none', duration: WEIGHTS.scene6 },
    0,
  )
  return tl
}

/** floating drift (canon: yPercent 2→-2 fromTo) */
export function scene7_hold(splits: SplitsMap) {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-7', splits, WEIGHTS.scene7 * 0.95), 0)
  tl.fromTo(
    '#scene-7 .scene__bg',
    { yPercent: 2 },
    { yPercent: -2, ease: 'none', duration: WEIGHTS.scene7 },
    0,
  )
  return tl
}

// ── transitions ──────────────────────────────────────────────────────────────

/** T1 — ZOOM OUT, then PAN DOWN to the Driveway (Aaron 2026-06-11):
 *  sequenced, not simultaneous — first the camera pulls straight back from
 *  the logo card (pure zoom out, no travel), THEN it pans down to image 2,
 *  which slides in flat from below (pure pan, no zoom on the incoming plate). */
export function t1_panDown(TRAVEL: number) {
  const tl = gsap.timeline()
  // phase A — pure zoom out, much deeper pull-back (from the hold's 0.96)
  tl.fromTo(
    '#scene-1 .scene__bg',
    { scale: 0.96 },
    { scale: 0.6, ease: 'power1.inOut', duration: 0.26 },
    0,
  )
  // phase B — then pan down
  tl.fromTo(
    '#scene-1 .scene__bg',
    { yPercent: 0 },
    { yPercent: -34 * TRAVEL, ease: 'power1.inOut', duration: 0.34 },
    0.26,
  )
  // slow fade to black…
  tl.fromTo(
    '#scene-1',
    { autoAlpha: 1 },
    { autoAlpha: 0, ease: 'power1.inOut', duration: 0.28 },
    0.08,
  )
  // image 2 rises in flat from below — pure pan, settling at rest
  tl.fromTo(
    '#scene-2 .scene__bg',
    { xPercent: 0, yPercent: 30 * TRAVEL, scale: 1 },
    { xPercent: 0, yPercent: 0, scale: 1, ease: 'power1.out', duration: 0.36 },
    0.24,
  )
  // …then slow fade in from black
  tl.fromTo(
    '#scene-2',
    { autoAlpha: 0 },
    { autoAlpha: 1, ease: 'power1.inOut', duration: 0.26 },
    0.34,
  )
  tl.add(copyOut('#scene-1'), 0)
  return pad(tl, WEIGHTS.t1)
}

/** T2 — PAN RIGHT Into Home: the only horizontal move; keep it singular. */
export function t2_panRight(TRAVEL: number) {
  const tl = gsap.timeline()
  tl.fromTo(
    '#scene-2 .scene__bg',
    { xPercent: -3 },
    { xPercent: -45 * TRAVEL, ease: 'none', duration: 0.7 },
    0,
  )
  tl.fromTo(
    '#scene-2',
    { autoAlpha: 1 },
    { autoAlpha: 0, ease: 'power1.inOut', duration: 0.34 },
    0.06,
  )
  tl.fromTo(
    '#scene-3 .scene__bg',
    { xPercent: 50 * TRAVEL, yPercent: 0 },
    { xPercent: 0, yPercent: 0, ease: 'none', duration: 0.7 },
    0,
  )
  tl.fromTo(
    '#scene-3',
    { autoAlpha: 0 },
    { autoAlpha: 1, ease: 'power1.inOut', duration: 0.3 },
    0.4,
  )
  tl.add(copyOut('#scene-2'), 0)
  return pad(tl, WEIGHTS.t2)
}

/** T3 — RISE Into Office: camera ascends; scenes move down-frame;
 *  new content from above. */
export function t3_rise(TRAVEL: number) {
  const tl = gsap.timeline()
  tl.fromTo(
    '#scene-3 .scene__bg',
    { yPercent: 0 },
    { yPercent: 40 * TRAVEL, ease: 'none', duration: 0.6 },
    0,
  )
  tl.fromTo(
    '#scene-3',
    { autoAlpha: 1 },
    { autoAlpha: 0, ease: 'power1.inOut', duration: 0.28 },
    0.05,
  )
  tl.fromTo(
    '#scene-4 .scene__bg',
    { xPercent: 0, yPercent: -40 * TRAVEL, scale: 1 },
    { xPercent: 0, yPercent: 0, scale: 1, ease: 'none', duration: 0.6 },
    0,
  )
  tl.fromTo(
    '#scene-4',
    { autoAlpha: 0 },
    { autoAlpha: 1, ease: 'power1.inOut', duration: 0.26 },
    0.33,
  )
  tl.add(copyOut('#scene-3'), 0)
  return pad(tl, WEIGHTS.t3)
}

/** T4 — ZOOM Into Monitor.
 *  Canon child timings run ~0.63 vs table weight 0.6 — the canon tween code
 *  wins; the ~0.23% label drift is absorbed (pin distance derives from
 *  master.duration() × UNIT). */
export function t4_zoomIn(TRAVEL: number) {
  const tl = gsap.timeline()
  tl.fromTo(
    '#scene-4 .scene__bg',
    { scale: 1.06, yPercent: 0 },
    { scale: 1.55, yPercent: -6 * TRAVEL, ease: 'power1.in', duration: 0.6 },
    0,
  )
  tl.fromTo(
    '#scene-4',
    { autoAlpha: 1 },
    { autoAlpha: 0, ease: 'power1.inOut', duration: 0.3 },
    0.06,
  )
  tl.fromTo(
    '#scene-5 .scene__bg',
    { scale: 0.92, xPercent: 0, yPercent: 0 },
    { scale: 1, xPercent: 0, yPercent: 0, ease: 'power1.out', duration: 0.45 },
    0.18,
  )
  tl.fromTo(
    '#scene-5',
    { autoAlpha: 0 },
    { autoAlpha: 1, ease: 'power1.inOut', duration: 0.25 },
    0.37,
  )
  tl.add(copyOut('#scene-4'), 0)
  return pad(tl, WEIGHTS.t4)
}

/** T5 — LIFT OVER Screen to Window — with BLACK BEAT.
 *  Camera pushes into the dark monitor (screen fills frame = the black moment),
 *  scrub-driven typewriter fires, camera lifts over to the window. */
export function t5_liftOver(TRAVEL: number) {
  const tl = gsap.timeline()
  tl.fromTo(
    '#scene-5 .scene__bg',
    { scale: 1, yPercent: 0 },
    { scale: 1.5, yPercent: -10 * TRAVEL, ease: 'power1.in', duration: 0.35 },
    0,
  )
  tl.fromTo(
    '#black-beat',
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: 0.08, ease: 'power2.in' },
    0.26,
  )
  tl.fromTo(
    '#scene-5',
    { autoAlpha: 1 },
    { autoAlpha: 0, ease: 'power1.inOut', duration: 0.18 },
    0.22,
  )

  // SCRUB-SAFE typewriter — types forward, erases on reverse, resets on wrap.
  // Stretched window (Aaron 2026-06-11): bigger type, slower reveal.
  const state = { n: 0 }
  tl.fromTo(
    state,
    { n: 0 },
    {
      n: BLACK_BEAT_TEXT.length,
      ease: 'none',
      duration: 0.48,
      snap: { n: 1 },
      onUpdate: () => {
        const p = document.querySelector('#black-beat p')
        if (p) p.textContent = BLACK_BEAT_TEXT.slice(0, state.n)
      },
    },
    0.32,
  )

  tl.fromTo(
    '#scene-6 .scene__bg',
    { yPercent: -35 * TRAVEL, scale: 1.12, xPercent: 0 },
    { yPercent: 0, scale: 1.04, xPercent: 0, ease: 'power1.out', duration: 0.35 },
    0.8,
  )
  tl.fromTo(
    '#black-beat',
    { autoAlpha: 1 },
    { autoAlpha: 0, duration: 0.14, ease: 'power2.out' },
    0.84,
  )
  tl.fromTo('#scene-6', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.8)
  tl.add(copyOut('#scene-5'), 0)
  return pad(tl, WEIGHTS.t5)
}

/** T6 — GLIDE OUT Over Water: through the glass; the most expansive moment. */
export function t6_glideOut(TRAVEL: number) {
  void TRAVEL // T6 is scale-only (canon) — no translation to attenuate
  const tl = gsap.timeline()
  tl.fromTo(
    '#scene-6 .scene__bg',
    { scale: 1.0 },
    { scale: 1.35, ease: 'power1.in', duration: 0.7 },
    0,
  )
  tl.fromTo(
    '#scene-6',
    { autoAlpha: 1 },
    { autoAlpha: 0, ease: 'power1.inOut', duration: 0.32 },
    0.08,
  )
  tl.fromTo(
    '#scene-7 .scene__bg',
    { scale: 1.18, xPercent: 0, yPercent: 0 },
    { scale: 1, xPercent: 0, yPercent: 0, ease: 'power2.out', duration: 0.55 },
    0.18,
  )
  tl.fromTo(
    '#scene-7',
    { autoAlpha: 0 },
    { autoAlpha: 1, ease: 'power1.inOut', duration: 0.26 },
    0.42,
  )
  tl.add(copyOut('#scene-6'), 0)
  return pad(tl, WEIGHTS.t6)
}

/** T7 — DESCEND Back to the Landing (LOOP TRANSITION) — Aaron 2026-06-11:
 *  the loop returns to the very first landing page, not the car. The camera
 *  comes down from over the water onto the complete logo card (the reveal
 *  plate stays visible after the one-time intro), so the wrap lands on a
 *  frame identical to the scene1-label render.
 *
 *  EXPLICIT resets — T1 leaves scene-1 bg at scale 0.88 / yPercent -12 and
 *  the scene at autoAlpha 0; every one of those appears in a fromTo below. */
export function t7_descendLoop(TRAVEL: number) {
  const tl = gsap.timeline()
  tl.fromTo(
    '#scene-7 .scene__bg',
    { yPercent: 0, scale: 1 },
    { yPercent: -32 * TRAVEL, scale: 1.06, ease: 'none', duration: 0.7 },
    0,
  )
  tl.fromTo(
    '#scene-7',
    { autoAlpha: 1 },
    { autoAlpha: 0, ease: 'power1.inOut', duration: 0.3 },
    0.06,
  )
  tl.fromTo(
    '#scene-1 .scene__bg',
    { xPercent: 0, yPercent: -10 * TRAVEL, scale: 0.94 },
    { xPercent: 0, yPercent: 0, scale: 1, ease: 'power1.out', duration: 0.5 },
    0.12,
  )
  tl.fromTo(
    '#scene-1',
    { autoAlpha: 0 },
    { autoAlpha: 1, ease: 'power1.inOut', duration: 0.28 },
    0.38,
  )
  tl.add(copyOut('#scene-7'), 0)
  return pad(tl, WEIGHTS.t7)
}

/** static hold ≡ scene1 rest state (landing, copy revealed) — the wrap fires
 *  inside this zone */
export function wrapBuffer() {
  return gsap.timeline().to({}, { duration: WEIGHTS.wrapZone })
}
