'use client'

/**
 * Master timeline builder — scenes, transitions, loop transition, wrap buffer.
 * Built inside gsap.matchMedia (see Cinematic.tsx) so UNIT/TRAVEL are
 * breakpoint-correct; never fork timeline code.
 */

import { gsap, ScrollTrigger } from '@/lib/gsap'
import { SCENES } from '@/lib/sceneData'
import { FILM, SCRUB, T_SCALE } from '@/components/cinematic/config'
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
  const base = document.querySelector('#scene-1 .bg-base')
  if (base) gsap.set(base, { autoAlpha: scene1CopyRevealed ? 1 : 0 })
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
    if (split && split.lines.length)
      gsap.set(
        split.lines,
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
    const points = s.querySelectorAll('.point')
    if (points.length) gsap.set(points, { autoAlpha: 0, y: 22 })
    const formPanel = s.querySelector('.form-panel')
    if (formPanel) gsap.set(formPanel, { autoAlpha: 0, y: 26 })
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

  // transitions keep canon internal timings; timeScale(1/T_SCALE) stretches
  // each across T_SCALE× the scroll ("3x more scrolls", Aaron 2026-06-11)
  const stretch = (tl: gsap.core.Timeline) => tl.timeScale(1 / T_SCALE)
  const master = gsap.timeline()
  master
    .add(scene1_hold(), 'scene1') // ← LOOP LANDING POINT (Aaron 2026-06-11)
    .add(stretch(t1_panDown(TRAVEL)), 't1')
    .add(scene2_hold(splits), 'scene2')
    .add(stretch(t2_panRight(TRAVEL)), 't2')
    .add(scene3_hold(splits), 'scene3')
    .add(stretch(t3_rise(TRAVEL)), 't3')
    .add(scene4_hold(splits), 'scene4')
    .add(stretch(t4_zoomIn(TRAVEL)), 't4')
    .add(scene5_hold(splits), 'scene5')
    .add(stretch(t5_liftOver(TRAVEL)), 't5') // black beat inside
    .add(scene6_hold(splits), 'scene6')
    .add(stretch(t6_glideOut(TRAVEL)), 't6')
    .add(scene7_hold(splits), 'scene7') // CTA — longest hold
    .add(stretch(t7_descendLoop(TRAVEL)), 't7') // water → back to the landing card
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

/**
 * FILM-MODE master (desktop, Aaron 2026-06-11 night): scroll scrubs the
 * rendered film; the DOM copy choreography overlays Aaron's segment map
 * (config.FILM). 1 timeline unit = 1 film second. The scrub range starts at
 * FILM.introEnd (the landing frame) — the 0–8s intro plays ONCE in real time
 * at boot (Cinematic), exactly like the old logo-dissolve intro.
 *
 * Loop seam: #black-beat fades to full black over the film's last
 * `blackOut` seconds; `wrapZone` sits inside the black hold, so the wrap's
 * water→logo jump lands while the screen is black (invisible).
 *
 * `introGate` keeps the scrub's video seeks inert until the boot intro has
 * finished playing 0→8 (ScrollTrigger.refresh fires onUpdate during boot).
 */
export function buildFilmTimeline(opts: {
  splits: SplitsMap
  video: HTMLVideoElement
  onUpdate: (self: ScrollTrigger) => void
  introGate: () => boolean
}): MasterHandles {
  const { splits, video, onUpdate, introGate } = opts

  setInitialStates(splits, true)

  const D = FILM.duration - FILM.introEnd
  const master = gsap.timeline()
  const film = { t: FILM.introEnd }
  master.fromTo(
    film,
    { t: FILM.introEnd },
    {
      t: FILM.duration - 0.05,
      ease: 'none',
      duration: D,
      onUpdate: () => {
        if (!introGate()) return
        if (video.readyState >= 2 && Math.abs(video.currentTime - film.t) > 0.034)
          video.currentTime = film.t
      },
    },
    0,
  )

  master.addLabel('scene1', 0)
  for (const [label, [a, b]] of Object.entries(FILM.segments)) {
    const sel = `#scene-${label.replace('scene', '')}`
    const s = a - FILM.introEnd
    const e = b - FILM.introEnd
    master.addLabel(label, s)
    master.fromTo(
      sel,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.5, ease: 'power1.inOut' },
      s + 0.15,
    )
    master.add(copyIn(sel, splits, (e - s) * 0.5), s + 0.6)
    master.add(copyOut(sel), e - 1.4)
    master.to(sel, { autoAlpha: 0, duration: 0.4, ease: 'power1.inOut' }, e - 0.5)
  }

  // loop seam — fade to black over the last film moments, hold, wrap inside
  master.fromTo(
    '#black-beat',
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: FILM.blackOut, ease: 'power1.inOut' },
    D - FILM.blackOut,
  )
  master.addLabel('wrapZone', D + FILM.wrapHold * 0.3)
  master.to({}, { duration: FILM.wrapHold }, D)

  const st = ScrollTrigger.create({
    animation: master,
    trigger: '#cinematic',
    start: 'top top',
    end: () =>
      '+=' +
      Math.round(master.duration() * FILM.UNIT * (window.innerHeight / 100)),
    pin: true,
    anticipatePin: 1,
    scrub: SCRUB,
    invalidateOnRefresh: true,
    onUpdate,
  })

  return { master, st }
}
