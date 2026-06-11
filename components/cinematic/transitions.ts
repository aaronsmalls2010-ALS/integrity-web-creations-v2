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

export type SplitsMap = Map<string, { words: Element[] }>

// ── shared helpers ───────────────────────────────────────────────────────────

/** ALL fromTo — explicit values (Determinism rule 1). Guards allow placeholder
 *  scenes (no copy DOM yet) to share the same timeline code. */
export function copyIn(sel: string, splits: SplitsMap) {
  const tl = gsap.timeline()
  const s = document.querySelector(sel)
  if (!s) return tl
  const monogram = s.querySelector('.monogram')
  if (monogram)
    tl.fromTo(
      monogram,
      { autoAlpha: 0, y: 34 },
      { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power3.out' },
      0,
    )
  const label = s.querySelector('.label')
  if (label)
    tl.fromTo(
      label,
      { autoAlpha: 0, y: 26 },
      { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power3.out' },
      monogram ? 0.14 : 0,
    )
  const split = splits.get(sel)
  if (split && split.words.length)
    tl.fromTo(
      split.words,
      { autoAlpha: 0, yPercent: 110 },
      { autoAlpha: 1, yPercent: 0, stagger: 0.04, duration: 0.45, ease: 'power3.out' },
      monogram ? 0.22 : 0.08,
    )
  const body = s.querySelector('.body-copy')
  if (body)
    tl.fromTo(
      body,
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power3.out' },
      0.35,
    )
  // concept-3 mockup columns — scroll-tied stagger
  const cols = s.querySelectorAll('.col')
  if (cols.length)
    tl.fromTo(
      cols,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.28, ease: 'power3.out' },
      0.45,
    )
  const strap = s.querySelector('.strap')
  if (strap)
    tl.fromTo(
      strap,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.24, ease: 'power3.out' },
      0.7,
    )
  const cta = s.querySelector('.cta-wrap')
  if (cta)
    tl.fromTo(
      cta,
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power3.out' },
      0.5,
    )
  return tl
}

export function copyOut(sel: string) {
  const tl = gsap.timeline()
  const targets = document.querySelectorAll(
    `${sel} .monogram, ${sel} .label, ${sel} .headline .split-word, ${sel} .body-copy, ${sel} .col, ${sel} .strap, ${sel} .cta-wrap`,
  )
  if (targets.length)
    tl.to(targets, {
      autoAlpha: 0,
      y: -18,
      duration: 0.2,
      stagger: 0.02,
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

/** SCENE 1 hold: logo push-in only — copy is revealed by the one-time intro,
 *  then removed on scroll by T1's copyOut (reverses cleanly when scrolling up). */
export function scene1_hold() {
  const tl = gsap.timeline()
  tl.fromTo(
    '#scene-1 .scene__bg',
    { scale: 1.0 },
    { scale: 1.05, ease: 'none', duration: WEIGHTS.scene1 },
    0,
  )
  return tl
}

export function scene2_hold(splits: SplitsMap) {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-2', splits), 0)
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
  tl.add(copyIn('#scene-3', splits), 0)
  return pad(tl, WEIGHTS.scene3)
}

/** push toward monitors — foreshadows T4 (T4 zooms from 1.06) */
export function scene4_hold(splits: SplitsMap) {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-4', splits), 0)
  tl.fromTo(
    '#scene-4 .scene__bg',
    { scale: 1.0 },
    { scale: 1.06, ease: 'none', duration: WEIGHTS.scene4 },
    0,
  )
  return tl
}

/** services chips: fromTo scrub-stagger 0.08 (canon) */
export function scene5_hold(splits: SplitsMap) {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-5', splits), 0)
  const chips = document.querySelectorAll('#scene-5 .chip')
  if (chips.length)
    tl.fromTo(
      chips,
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.3, ease: 'power3.out' },
      0.4,
    )
  return pad(tl, WEIGHTS.scene5)
}

/** breathing room after the black beat — T5 lands this bg at scale 1.04 */
export function scene6_hold(splits: SplitsMap) {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-6', splits), 0)
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
  tl.add(copyIn('#scene-7', splits), 0)
  tl.fromTo(
    '#scene-7 .scene__bg',
    { yPercent: 2 },
    { yPercent: -2, ease: 'none', duration: WEIGHTS.scene7 },
    0,
  )
  return tl
}

// ── transitions ──────────────────────────────────────────────────────────────

/** T1 — DESCEND to the Driveway (filmic rework, Aaron 2026-06-11): the
 *  skyline scales DOWN as the camera pulls back and pans; the driveway
 *  rises to meet it through a long dissolve with continuous motion on both
 *  plates — a movie move, not a slide. */
export function t1_panDown(TRAVEL: number) {
  const tl = gsap.timeline()
  // buildings shrink + drift up-frame as the camera pulls away
  tl.fromTo(
    '#scene-1 .scene__bg',
    { scale: 1.05, yPercent: 0 },
    { scale: 0.88, yPercent: -12 * TRAVEL, ease: 'power1.inOut', duration: 0.6 },
    0,
  )
  tl.fromTo(
    '#scene-1',
    { autoAlpha: 1 },
    { autoAlpha: 0, ease: 'power1.inOut', duration: 0.42 },
    0.16,
  )
  // the driveway settles in beneath, still moving as it lands
  tl.fromTo(
    '#scene-2 .scene__bg',
    { xPercent: 0, yPercent: 22 * TRAVEL, scale: 1.16 },
    { xPercent: 0, yPercent: 0, scale: 1, ease: 'power1.out', duration: 0.6 },
    0,
  )
  tl.fromTo(
    '#scene-2',
    { autoAlpha: 0 },
    { autoAlpha: 1, ease: 'power1.inOut', duration: 0.4 },
    0.1,
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
    { autoAlpha: 0, ease: 'power1.in', duration: 0.28 },
    0.35,
  )
  tl.fromTo(
    '#scene-3 .scene__bg',
    { xPercent: 50 * TRAVEL, yPercent: 0 },
    { xPercent: 0, yPercent: 0, ease: 'none', duration: 0.7 },
    0,
  )
  tl.fromTo('#scene-3', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.12)
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
    { autoAlpha: 0, ease: 'power1.in', duration: 0.25 },
    0.3,
  )
  tl.fromTo(
    '#scene-4 .scene__bg',
    { xPercent: 0, yPercent: -40 * TRAVEL, scale: 1 },
    { xPercent: 0, yPercent: 0, scale: 1, ease: 'none', duration: 0.6 },
    0,
  )
  tl.fromTo('#scene-4', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.12)
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
    { autoAlpha: 0, ease: 'power1.in', duration: 0.22 },
    0.4,
  )
  tl.fromTo(
    '#scene-5 .scene__bg',
    { scale: 0.92, xPercent: 0, yPercent: 0 },
    { scale: 1, xPercent: 0, yPercent: 0, ease: 'power1.out', duration: 0.45 },
    0.18,
  )
  tl.fromTo('#scene-5', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.22)
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
  tl.fromTo('#scene-5', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.1 }, 0.3)

  // SCRUB-SAFE typewriter — types forward, erases on reverse, resets on wrap
  const state = { n: 0 }
  tl.fromTo(
    state,
    { n: 0 },
    {
      n: BLACK_BEAT_TEXT.length,
      ease: 'none',
      duration: 0.22,
      snap: { n: 1 },
      onUpdate: () => {
        const p = document.querySelector('#black-beat p')
        if (p) p.textContent = BLACK_BEAT_TEXT.slice(0, state.n)
      },
    },
    0.34,
  )

  tl.fromTo(
    '#scene-6 .scene__bg',
    { yPercent: -35 * TRAVEL, scale: 1.12, xPercent: 0 },
    { yPercent: 0, scale: 1.04, xPercent: 0, ease: 'power1.out', duration: 0.4 },
    0.58,
  )
  tl.fromTo(
    '#black-beat',
    { autoAlpha: 1 },
    { autoAlpha: 0, duration: 0.14, ease: 'power2.out' },
    0.62,
  )
  tl.fromTo('#scene-6', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.58)
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
    { autoAlpha: 0, ease: 'power1.in', duration: 0.28 },
    0.38,
  )
  tl.fromTo(
    '#scene-7 .scene__bg',
    { scale: 1.18, xPercent: 0, yPercent: 0 },
    { scale: 1, xPercent: 0, yPercent: 0, ease: 'power2.out', duration: 0.55 },
    0.18,
  )
  tl.fromTo('#scene-7', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.22)
  tl.add(copyOut('#scene-6'), 0)
  return pad(tl, WEIGHTS.t6)
}

/** T7 — DESCEND Back to the Driveway (LOOP TRANSITION): camera comes down from
 *  over the water back to street level; mirrors T1's downward grammar.
 *  Scene 2 re-enters image-only (its copy re-types during the next scene2 hold). */
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
    { autoAlpha: 0, ease: 'power1.in', duration: 0.26 },
    0.4,
  )
  // EXPLICIT resets — scene 2 was left at xPercent:-45/autoAlpha:0 by T2 last cycle:
  tl.fromTo(
    '#scene-2 .scene__bg',
    { xPercent: 0, yPercent: 38 * TRAVEL, scale: 1 },
    { xPercent: 0, yPercent: 0, scale: 1, ease: 'power1.out', duration: 0.45 },
    0.12,
  )
  tl.fromTo(
    '#scene-2',
    { autoAlpha: 0 },
    { autoAlpha: 1, ease: 'power1.out', duration: 0.3 },
    0.18,
  )
  tl.add(copyOut('#scene-7'), 0)
  return pad(tl, WEIGHTS.t7)
}

/** static hold ≡ scene2 rest state — the wrap fires inside this zone */
export function wrapBuffer() {
  return gsap.timeline().to({}, { duration: WEIGHTS.wrapZone })
}
