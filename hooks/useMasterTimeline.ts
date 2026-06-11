'use client'

/**
 * Master timeline builder — scenes, transitions, loop transition, wrap buffer.
 * Built inside gsap.matchMedia (see Cinematic.tsx) so UNIT/TRAVEL are
 * breakpoint-correct; never fork timeline code.
 */

import { gsap, ScrollTrigger } from '@/lib/gsap'
import { SCENES } from '@/lib/sceneData'
import { SCRUB } from '@/components/cinematic/config'
import {
  copyIn,
  copyOut,
  scene1_hold,
  scene2_hold,
  scene3_hold,
  scene4_hold,
  scene5_hold,
  scene6_hold,
  scene7_hold,
  t1_panDown,
  t2_panRight,
  t3_rise,
  t4_zoomIn,
  t5_liftOver,
  t6_glideOut,
  t7_descendLoop,
  wrapBuffer,
  type SplitsMap,
} from '@/components/cinematic/transitions'

export { copyIn, copyOut }

/**
 * STATE DETERMINISM rule 5 — gsap.set initial states for all scenes/copy at
 * timeline build, so time=0 is also deterministic.
 *
 * Scene 1's reveal plate (the complete logo card) is special: the one-time
 * preloader intro dissolves it in over the clean backdrop, and it stays
 * revealed for the life of the session (no scrubbed tween touches it — the
 * loop lands on the complete card). On REBUILDS (breakpoint change,
 * autoSplit re-split) the intro has already played — it must be reset to
 * VISIBLE or the landing loses its wordmark.
 */
export function setInitialStates(splits: SplitsMap, scene1CopyRevealed = false) {
  gsap.set('#scene-2, #scene-3, #scene-4, #scene-5, #scene-6, #scene-7', {
    autoAlpha: 0,
  })
  gsap.set('#scene-1', { autoAlpha: 1 })
  const reveal = document.querySelector('#scene-1 .bg-reveal')
  if (reveal)
    gsap.set(
      reveal,
      scene1CopyRevealed
        ? { autoAlpha: 1, '--wipe': '140%' } // intro played: card fully wiped in
        : { autoAlpha: 0, '--wipe': '0%' },
    )
  gsap.set('#black-beat', { autoAlpha: 0 })
  const beatText = document.querySelector('#black-beat p')
  if (beatText) beatText.textContent = ''

  gsap.set('.scene .scene__bg', { xPercent: 0, yPercent: 0, scale: 1 })

  for (const cfg of SCENES) {
    const sel = `#${cfg.id}`
    const s = document.querySelector(sel)
    if (!s) continue
    const revealed = cfg.id === 'scene-1' && scene1CopyRevealed
    const monogram = s.querySelector('.monogram')
    if (monogram)
      gsap.set(
        monogram,
        revealed ? { autoAlpha: 1, y: 0 } : { autoAlpha: 0, y: 34 },
      )
    const label = s.querySelector('.label')
    if (label)
      gsap.set(label, revealed ? { autoAlpha: 1, y: 0 } : { autoAlpha: 0, y: 26 })
    const split = splits.get(sel)
    if (split && split.words.length)
      gsap.set(
        split.words,
        revealed ? { autoAlpha: 1, yPercent: 0 } : { autoAlpha: 0, yPercent: 110 },
      )
    const body = s.querySelector('.body-copy')
    if (body)
      gsap.set(body, revealed ? { autoAlpha: 1, y: 0 } : { autoAlpha: 0, y: 20 })
    const cta = s.querySelector('.cta-wrap')
    if (cta)
      gsap.set(cta, revealed ? { autoAlpha: 1, y: 0 } : { autoAlpha: 0, y: 18 })
    const chips = s.querySelectorAll('.chip')
    if (chips.length) gsap.set(chips, { autoAlpha: 0, y: 18 })
    const cols = s.querySelectorAll('.col')
    if (cols.length) gsap.set(cols, { autoAlpha: 0, y: 24 })
    const strap = s.querySelector('.strap')
    if (strap) gsap.set(strap, { autoAlpha: 0, y: 14 })
  }
}

export interface MasterHandles {
  master: gsap.core.Timeline
  st: ScrollTrigger
}

export function buildMasterTimeline(opts: {
  UNIT: number
  TRAVEL: number
  splits: SplitsMap
  onUpdate: (self: ScrollTrigger) => void
  /** true on rebuilds after the one-time intro has revealed scene 1 copy */
  scene1CopyRevealed?: boolean
}): MasterHandles {
  const { UNIT, TRAVEL, splits, onUpdate } = opts

  setInitialStates(splits, opts.scene1CopyRevealed)

  const master = gsap.timeline()
  master
    .add(scene1_hold(), 'scene1') // ← LOOP LANDING POINT (Aaron 2026-06-11)
    .add(t1_panDown(TRAVEL), 't1')
    .add(scene2_hold(splits), 'scene2')
    .add(t2_panRight(TRAVEL), 't2')
    .add(scene3_hold(splits), 'scene3')
    .add(t3_rise(TRAVEL), 't3')
    .add(scene4_hold(splits), 'scene4')
    .add(t4_zoomIn(TRAVEL), 't4')
    .add(scene5_hold(splits), 'scene5')
    .add(t5_liftOver(TRAVEL), 't5') //  black beat inside
    .add(scene6_hold(splits), 'scene6')
    .add(t6_glideOut(TRAVEL), 't6')
    .add(scene7_hold(splits), 'scene7') // CTA — longest hold
    .add(t7_descendLoop(TRAVEL), 't7') // water → back to the landing card
    .add(wrapBuffer(), 'wrapZone') //   static hold, visuals ≡ scene1 rest state

  // ScrollTrigger created AFTER children exist so the pin-distance function
  // sees the full duration. PIN_DISTANCE = total weight × UNIT svh.
  const st = ScrollTrigger.create({
    animation: master,
    trigger: '#cinematic',
    start: 'top top',
    end: () =>
      '+=' + Math.round(master.duration() * UNIT * (window.innerHeight / 100)),
    pin: true,
    anticipatePin: 1,
    scrub: SCRUB,
    invalidateOnRefresh: true,
    onUpdate,
  })

  return { master, st }
}
