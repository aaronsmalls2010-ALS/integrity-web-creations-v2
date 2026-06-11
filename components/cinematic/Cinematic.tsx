'use client'

/**
 * Orchestrator — matchMedia contexts, master build, wrap logic, preloader boot.
 *
 * Boot sequence (canon):
 *   decode all #cinematic images (bar advances per image) → fonts.ready →
 *   SplitText instances → ScrollSmoother (paused) → master inside
 *   gsap.matchMedia → ScrollTrigger.refresh → fade preloader (0.8s) →
 *   time-based intro (Scene 1 bg 1.08→1.0 over 2.4s + Scene 1 copyIn) →
 *   smoother.paused(false).
 */

import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger, SplitText, type ScrollSmoother } from '@/lib/gsap'
import { SCENES } from '@/lib/sceneData'
import { track } from '@/lib/analytics'
import {
  MOBILE_BREAKPOINT,
  SCENE_LABELS,
  TRAVEL_DESKTOP,
  TRAVEL_MOBILE,
  UNIT_DESKTOP,
  UNIT_MOBILE,
} from './config'
import { buildMasterTimeline } from '@/hooks/useMasterTimeline'
import { createSmoother } from '@/hooks/useScrollSmoother'
import { createLoop } from './loop'
import type { SplitsMap } from './transitions'
import Chrome from './chrome/Chrome'
import Preloader from './Preloader'
import SmoothWrapper from './SmoothWrapper'
import Scene from './Scene'
import BlackBeat from './BlackBeat'

/**
 * Build Order step 3 de-risk plates — retired per Aaron's checkpoint
 * direction (2026-06-11): real imagery on every scene so the full movie can
 * be felt. (The shell + wrap were validated on plates first, as specified.)
 */
const PLACEHOLDERS: (string | undefined)[] = [
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
]

export default function Cinematic() {
  const scrollToLabelRef = useRef<(label: string) => void>(() => {})

  useEffect(() => {
    // Reduced motion: no smoother, no master timeline, no loop — static
    // stacked sections (CSS), copy visible. Full static page + real footer
    // lands in Build Order step 10.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reduced-motion')
      const pre = document.getElementById('preloader')
      if (pre) pre.style.display = 'none'
      return
    }

    let disposed = false
    const splits: SplitsMap = new Map()
    const splitInstances: SplitText[] = []
    let smoother: ScrollSmoother | null = null
    const mm = gsap.matchMedia()
    const ctl: { master: gsap.core.Timeline | null; st: ScrollTrigger | null } =
      { master: null, st: null }
    const chromeState = { active: '', seen: new Set<string>() }
    let currentUNIT = UNIT_DESKTOP
    let currentTRAVEL = TRAVEL_DESKTOP
    let rebuildTimer: ReturnType<typeof setTimeout> | undefined
    let introPlayed = false

    const loop = createLoop({
      getMaster: () => ctl.master,
      getSmoother: () => smoother,
      onWrap: () => {
        chromeState.seen.clear() // scene_view fires once per scene per cycle
        if (ctl.st) updateChrome(ctl.st) // refresh counter/dots at the landing
      },
    })

    // ── chrome ───────────────────────────────────────────────────────────────
    function setActiveScene(label: string) {
      chromeState.active = label
      const n = Number(label.replace('scene', ''))
      const id = String(n).padStart(2, '0')
      const counter = document.getElementById('scene-counter')
      if (counter && counter.textContent !== id) {
        gsap
          .timeline()
          .to(counter, { autoAlpha: 0, y: -8, duration: 0.18, ease: 'power2.in' })
          .call(() => {
            counter.textContent = id
          })
          .to(counter, { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power2.out' })
      }
      document.querySelectorAll('#nav-dots button').forEach((b, i) => {
        b.classList.toggle('is-active', i === n - 1)
        if (i === n - 1) b.setAttribute('aria-current', 'true')
        else b.removeAttribute('aria-current')
      })
      document
        .querySelectorAll('#cinematic .scene')
        .forEach((s) => s.classList.toggle('is-active', s.id === `scene-${n}`))
      if (!chromeState.seen.has(label)) {
        chromeState.seen.add(label)
        track('scene_view', { scene: n, cycle: loop.cycle })
      }
    }

    /** counter, dots, progress line, .is-active — from nearest scene label.
     *  Uses the SCROLL-derived time (not the scrub-lagged playhead) so chrome
     *  stays correct across instant jumps (wrap, dots) with no further scroll. */
    function updateChrome(self: ScrollTrigger) {
      const master = ctl.master
      if (!master) return
      const t = self.progress * master.duration()
      let best: string = 'scene1'
      let bestDist = Infinity
      for (const l of SCENE_LABELS) {
        const lt = master.labels[l]
        if (lt == null) continue
        const d = Math.abs(lt - t)
        if (d < bestDist) {
          bestDist = d
          best = l
        }
      }
      if (best !== chromeState.active) setActiveScene(best)
      const fill = document.getElementById('progress-line-fill')
      if (fill) fill.style.transform = `scaleX(${self.progress})`
      const cue = document.getElementById('scroll-cue')
      if (cue) cue.classList.toggle('is-hidden', self.progress > 0.05)
    }

    function onMasterUpdate(self: ScrollTrigger) {
      updateChrome(self)
      loop.check(self) // forward-only wrap inside wrapZone
    }

    // ── master lifecycle ─────────────────────────────────────────────────────
    function buildForContext(UNIT: number, TRAVEL: number) {
      currentUNIT = UNIT
      currentTRAVEL = TRAVEL
      const handles = buildMasterTimeline({
        UNIT,
        TRAVEL,
        splits,
        onUpdate: onMasterUpdate,
        scene1CopyRevealed: introPlayed,
      })
      ctl.master = handles.master
      ctl.st = handles.st
      loop.refresh() // recompute WRAP_AT_PROGRESS after every (re)build
    }

    function teardownMaster() {
      ctl.st?.kill()
      ctl.master?.kill()
      ctl.st = null
      ctl.master = null
    }

    /** autoSplit re-split replaces word nodes — the scrubbed master must
     *  re-reference them. Deterministic state makes the rebuild invisible. */
    function requestRebuild() {
      if (!ctl.master) return // initial split, before first build
      clearTimeout(rebuildTimer)
      rebuildTimer = setTimeout(() => {
        if (disposed || !smoother) return
        const sc = smoother.scrollTop()
        teardownMaster()
        buildForContext(currentUNIT, currentTRAVEL)
        ScrollTrigger.refresh()
        smoother.scrollTop(sc)
      }, 150)
    }

    function scrollToLabel(label: string) {
      // navigating mid-intro would let the scrubbed copyOut record scene-1's
      // half-revealed copy as its start values — permanent ghost state
      if (!introPlayed || !ctl.st || !smoother) return
      smoother.scrollTo(ctl.st.labelToScroll(label), true)
    }
    scrollToLabelRef.current = scrollToLabel

    // ── input wiring (dots/skip use props; CTAs + keyboard here) ────────────
    function currentSceneIndex() {
      const n = Number(chromeState.active.replace('scene', ''))
      return Number.isFinite(n) && n >= 1 ? n : 1
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollToLabel(`scene${Math.min(7, currentSceneIndex() + 1)}`)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        scrollToLabel(`scene${Math.max(1, currentSceneIndex() - 1)}`)
      }
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>(
        'a[data-scroll-label], a[data-cta]',
      )
      if (!a) return
      const cta = a.getAttribute('data-cta')
      if (cta) track('cta_click', { cta })
      const label = a.getAttribute('data-scroll-label')
      if (label) {
        e.preventDefault()
        scrollToLabel(label)
      }
    }
    addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)

    // ── boot ─────────────────────────────────────────────────────────────────
    async function boot() {
      const imgs = Array.from(
        document.querySelectorAll<HTMLImageElement>('#cinematic img'),
      )
      const barFill = document.getElementById('preloader-bar-fill')
      let done = 0
      const bump = () => {
        done += 1
        if (barFill)
          barFill.style.transform = `scaleX(${done / Math.max(imgs.length, 1)})`
      }
      // Canon: EVERY image decodes before the experience starts — the loop
      // revisits all scenes. Broken assets resolve via their error event, so
      // this cannot trap the user; only the decode guarantee is absolute.
      await Promise.all(
        imgs.map(async (img) => {
          try {
            if (!img.complete)
              await new Promise((res) => {
                img.addEventListener('load', res, { once: true })
                img.addEventListener('error', res, { once: true })
              })
            await img.decode().catch(() => {})
          } finally {
            bump()
          }
        }),
      )
      await document.fonts.ready
      if (disposed) return

      // SplitText: build once per headline after fonts.ready; autoSplit
      // re-splits on resize/reflow (requestRebuild re-references words).
      for (const cfg of SCENES) {
        const h = document.querySelector(`#${cfg.id} .headline`)
        if (!h) continue
        const split = SplitText.create(h, {
          type: 'words',
          mask: 'words',
          wordsClass: 'split-word',
          autoSplit: true,
          onSplit: () => requestRebuild(),
        })
        splitInstances.push(split)
        splits.set(`#${cfg.id}`, split)
      }

      smoother = createSmoother() // paused until intro completes

      mm.add(
        {
          isMobile: `(max-width: ${MOBILE_BREAKPOINT}px)`,
          isDesktop: `(min-width: ${MOBILE_BREAKPOINT + 1}px)`,
        },
        (ctx) => {
          const { isMobile } = ctx.conditions as { isMobile: boolean }
          buildForContext(
            isMobile ? UNIT_MOBILE : UNIT_DESKTOP,
            isMobile ? TRAVEL_MOBILE : TRAVEL_DESKTOP,
          )
          return () => teardownMaster() // mm auto-reverts inline styles
        },
      )
      ScrollTrigger.refresh()
      loop.refresh()
      if (disposed) return

      const pre = document.getElementById('preloader')
      if (pre) {
        await gsap.to(pre, { autoAlpha: 0, duration: 0.8, ease: 'power1.inOut' })
        pre.style.display = 'none'
      }

      // time-based intro (not scrubbed) — plays once: settle the clean
      // backdrop, then dissolve the complete logo card in over it
      const intro = gsap.timeline()
      intro.fromTo(
        '#scene-1 .scene__bg',
        { scale: 1.08 },
        { scale: 1.0, duration: 2.4, ease: 'power2.out' },
        0,
      )
      intro.fromTo(
        '#scene-1 .bg-reveal',
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 1.8, ease: 'power2.inOut' },
        0.7,
      )
      await intro
      introPlayed = true // rebuilds now keep the reveal plate visible
      if (disposed) return
      smoother?.paused(false)
    }
    boot()

    return () => {
      disposed = true
      clearTimeout(rebuildTimer)
      removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
      mm.revert()
      splitInstances.forEach((s) => s.revert())
      smoother?.kill()
    }
  }, [])

  return (
    <>
      <Chrome onNavigate={(label) => scrollToLabelRef.current(label)} />
      <Preloader />
      <SmoothWrapper>
        <section
          id="cinematic"
          aria-label="Integrity Web Creations — cinematic introduction"
        >
          {/* the movie screen: 16:9 letterboxed frame; site chrome lives
              around it (Aaron, 2026-06-11) */}
          <div id="movie-frame">
            {SCENES.map((cfg, i) => (
              <Scene
                key={cfg.id}
                cfg={cfg}
                index={i}
                placeholder={PLACEHOLDERS[i]}
              />
            ))}
            <BlackBeat />
          </div>
        </section>
        {/* NOTHING after #cinematic on the homepage — the loop is the page */}
      </SmoothWrapper>
    </>
  )
}
