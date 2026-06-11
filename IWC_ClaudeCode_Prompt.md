# IWC — Integrity Web Creations
## Looping Cinematic 3D Scroll Website — Claude Code Build Brief v3 (FINAL)

---

## MISSION

Build the new homepage and site for **Integrity Web Creations (IWC)** — a custom web design agency in Beaufort, SC, serving Lowcountry small businesses since 2010. The homepage is an **infinitely looping, scroll-driven cinematic experience**: one continuous virtual camera moving through 7 scenes, exactly as choreographed in `Storyboard.png`, that **wraps seamlessly back to Scene 2 (the car) and repeats** — like https://www.igloo.inc/.

### Canon rule — read first
`Storyboard.png` + this document are the ONLY sources of truth for sequence, transitions, and copy. **Do not invent scenes, copy, narrative, or reordering. Do not fill gaps with assumptions.** Copy strings are tagged `[APPROVED]` (use verbatim) or `[DRAFT]` (build with them, but surface for Aaron's confirmation before launch — see OPEN QUESTIONS). If anything is ambiguous or an asset doesn't match its description: STOP and ask.

### Non-negotiables
1. Scroll feel matches **igloo.inc** — liquid, scrubbed, reversible. Study it before coding.
2. Scene sequence + transition directions match **Storyboard.png** exactly. View the image first.
3. **The experience loops.** Scene 7 → T7 (descend) → Scene 2, seamlessly, forever. The wrap must be invisible.
4. Smooth on desktop AND mobile. **iOS Safari is validated FIRST** (Build Order step 3), not last.
5. Professionally published: preloader, analytics, SEO, accessibility, legal, performance budgets — all in scope.

---

## THE LOOP — experience model

**Cycle:** `[Logo intro — plays once] → Scene 2 → 3 → 4 → 5 → 6 → 7 → T7 descend → (invisible wrap) → Scene 2 → 3 → …`

- **Loop target is Scene 2 (the car), NOT the logo** — per the approved storyboard spec: "brings the user back to the car image and begins the sequence again." The logo (Scene 1) is the one-time opening; users can still reach it by scrolling fully up or via nav dot 1.
- **Forward-only wrap.** Scrolling up always reverses normally (after a wrap, scrolling up from Scene 2 reverses through T1 into the logo). Bidirectional infinite scroll is Phase 3 — do not build it now.
- **Structural consequence — no below-fold content exists.** The homepage IS the loop. Therefore:
  - Site navigation lives in fixed chrome (top nav: Services · Portfolio · About · Contact).
  - Legal line lives in fixed chrome (bottom-left: `© 2026 Integrity Web Creations · Privacy`).
  - Conversion paths: Scene 7 CTAs + persistent Contact nav link.
  - The `#skip-intro` accessibility link jumps to the **scene7 label** (the CTA), not "past" the cinematic.
- **Why the user can't get trapped:** Scene 7 holds for the longest weight (1.4) with the CTA fully revealed before T7 begins; nav dots jump anywhere instantly; reduced-motion users get a static page with a real footer (see Accessibility).

---

## ENVIRONMENT & STACK

```
Node:        20 LTS+
Framework:   Next.js 15 (App Router) + TypeScript (strict)
Styling:     Tailwind CSS v4 + CSS custom properties
Animation:   GSAP 3.13+ — ScrollTrigger, ScrollSmoother, SplitText
Fonts:       next/font (self-hosted Playfair Display + Inter — no Google Fonts <link>)
Backend:     Next.js API routes · Email: Resend
CMS:         Sanity.io (Phase 2 only)
Deploy:      Vercel
Install:     npm i gsap @gsap/react sharp resend zod
```

**GSAP licensing — settled:** GSAP 3.13+ (post-Webflow acquisition) is **100% free for commercial use including ScrollSmoother and SplitText**, shipped in the public `gsap` npm package. No token, no paid tier, and **no Lenis — do not install Lenis.**

---

## DESIGN SYSTEM

```
--deep-navy:  #050810   --panel-dark: #08090C
--gold:       #C9A84C   --gold-muted: #B89A5A
--silver:     #C8CDD6   --white:      #F5F2ED
```

Typography (next/font, display: swap):
```
Display:  Playfair Display — 900 headlines, 400 italic for gold accent words
          clamp(2.6rem, 7.5vw, 8.5rem), line-height 0.94, uppercase
Body/UI:  Inter — 100/200/300/400
          Labels: 0.55rem / letter-spacing 0.45em / uppercase / gold
          Body: clamp(0.75rem, 1.1vw, 0.95rem) / weight 200 / line-height 1.9
```
Two families only (Inter covers utility). Headlines corner-anchored, alternating bottom-left / top-right / center — never the same twice in a row. Labels ≤ 8 words; body ≤ 2 lines. Headline shadow `0 2px 40px rgba(0,0,0,.8)`.

---

## ARCHITECTURE

### DOM — chrome placement is critical
`position: fixed` breaks inside transformed ancestors; ScrollSmoother transforms `#smooth-content`. ALL fixed chrome lives OUTSIDE the wrapper:

```html
<body>
  <div id="chrome">                       <!-- OUTSIDE smooth wrapper -->
    <nav id="top-nav">Services · Portfolio · About · Contact</nav>
    <div id="scene-counter" aria-hidden="true">01</div>
    <div id="brand-mark">IWC / Integrity Web Creations</div>
    <nav id="nav-dots">…7 buttons, aria-label="Go to scene N"…</nav>
    <div id="progress-line"></div>
    <div id="scroll-cue">…</div>
    <div id="legal-line">© 2026 Integrity Web Creations · <a href="/privacy">Privacy</a></div>
    <a id="skip-intro" href="#" data-target="scene7">Skip to offer</a>
  </div>

  <div id="preloader">…</div>             <!-- also outside -->

  <div id="smooth-wrapper">
    <div id="smooth-content">
      <section id="cinematic">            <!-- pinned, height: 100svh -->
        <div class="scene" id="scene-1">…</div>
        … scenes 2–7 …
        <div id="black-beat"><p></p><span class="cursor-dot"></span></div>
      </section>
      <!-- NOTHING after #cinematic on the homepage — the loop is the page -->
    </div>
  </div>
</body>
```

### Scene nesting — depth and motion are SEPARATE layers (do not flatten)
Depth placement (static `translateZ`) and timeline motion (animated transforms) must never share an element, or they corrupt each other:

```html
<div class="scene" id="scene-N">                  <!-- transform-style: preserve-3d -->
  <div class="scene__depth scene__depth--far">    <!-- STATIC: translateZ(-220px) scale(1.19) -->
    <div class="scene__bg">                       <!-- TIMELINE: xPercent/yPercent/scale/autoAlpha
                                                       MOUSE: x/y px -->
      <Image fill sizes="100vw" quality={82} className="object-cover"
             style={{objectPosition: …}} priority={N<=2} alt="" />
    </div>
  </div>
  <div class="scene__depth scene__depth--mid">    <!-- STATIC: translateZ(-80px) scale(1.07) -->
    <div class="scene__grad"></div>
  </div>
  <div class="scene__depth scene__depth--near">   <!-- STATIC: translateZ(0) -->
    <div class="scene__copy">…label / headline / body / cta…</div>
  </div>
</div>
```

### TRANSFORM OWNERSHIP CONTRACT — violating this causes invisible-to-debug jank
```
.scene__depth--*   STATIC ONLY    translateZ + compensation scale (CSS, never tweened)
.scene__bg         TIMELINE       xPercent, yPercent, scale, autoAlpha (scrubbed master only)
.scene__bg         MOUSE          x, y in px (separate properties — GSAP combines additively)
.scene__copy       TIMELINE       autoAlpha, y (copyIn/copyOut)
.scene__copy       MOUSE          x, y in px (counter-drift)
```
`x`/`y` (px) and `xPercent`/`yPercent` are independent GSAP properties that compose — that's why mouse parallax never fights the scrub. `overwrite: 'auto'` on mouse tweens is safe because it only kills other x/y px tweens. **Never tween `scale` from two systems.**

Sizing: scenes `position:absolute; inset:0` in `#cinematic`. `.scene__bg` bleed `inset: -10% -5%`; scenes 2–3 bgs `width: 150%` (horizontal pan travel). Scenes 2–7 start hidden via `autoAlpha: 0` (gsap.set at build — see Determinism).

**No `data-speed`/`data-lag` anywhere inside `#cinematic`** (would double-transform). `effects: true` exists only for future non-pinned pages.

### Init — built inside gsap.matchMedia (breakpoint-correct rebuilds)
```javascript
gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText)

const smoother = ScrollSmoother.create({
  wrapper: '#smooth-wrapper', content: '#smooth-content',
  smooth: 1.5, effects: true, normalizeScroll: true, ignoreMobileResize: true,
})
smoother.paused(true)   // gated until preloader completes

const mm = gsap.matchMedia()
mm.add({ isMobile: '(max-width: 768px)', isDesktop: '(min-width: 769px)' }, (ctx) => {
  const { isMobile } = ctx.conditions
  const UNIT   = isMobile ? 70 : 115        // svh per weight unit
  const TRAVEL = isMobile ? 0.6 : 1.0       // multiply ALL transition xPercent/yPercent
  const master = buildMasterTimeline({ UNIT, TRAVEL })   // everything below lives here
  return () => { /* mm auto-reverts; kill splits + triggers */ }
})
```

### Master timeline — scenes, transitions, loop transition, wrap buffer
```javascript
master
  .add(scene1_hold(),  'scene1')      // logo — one-time intro territory
  .add(t1_panDown(),   't1')
  .add(scene2_hold(),  'scene2')      // ← LOOP LANDING POINT
  .add(t2_panRight(),  't2')
  .add(scene3_hold(),  'scene3')
  .add(t3_rise(),      't3')
  .add(scene4_hold(),  'scene4')
  .add(t4_zoomIn(),    't4')
  .add(scene5_hold(),  'scene5')
  .add(t5_liftOver(),  't5')          // black beat inside
  .add(scene6_hold(),  'scene6')
  .add(t6_glideOut(),  't6')
  .add(scene7_hold(),  'scene7')      // CTA — longest hold
  .add(t7_descendLoop(),'t7')         // water → back down to the driveway
  .add(wrapBuffer(),   'wrapZone')    // static hold, visuals ≡ scene2 rest state
```

### SEGMENT WEIGHT TABLE — exact
```
Segment            Weight   Notes
scene1 hold        1.0      logo push-in + copy
t1  pan down       0.6
scene2 hold        1.0      LOOP LANDING — copy re-types every cycle
t2  pan right      0.7      the one horizontal move
scene3 hold        1.0
t3  rise           0.6
scene4 hold        1.0
t4  zoom in        0.6
scene5 hold        1.5      services stagger — longest content hold
t5  lift over      1.0      includes black beat
scene6 hold        1.0
t6  glide out      0.7
scene7 hold        1.4      CTA breathes fully before loop
t7  descend loop   0.7      water → driveway
wrap buffer        0.2      static; identical to scene2 rest; wrap fires here
──────────────────────
TOTAL             13.0 units
PIN_DISTANCE = 13.0 × UNIT  →  ≈1495svh desktop · ≈910svh mobile
```

### TUNING KNOBS — the only feel adjustments permitted without sign-off
```
smooth:  1.2–1.8 (default 1.5) · scrub: 0.8–1.5 (default 1.2)
UNIT:    90–130 desktop / 55–85 mobile (defaults 115 / 70)
```
Weights, easings, travel percentages = locked choreography.

---

## STATE DETERMINISM RULES — what makes the loop seamless

The wrap works because **a single scrubbed timeline renders a deterministic visual state at any playhead time**: tweens before the playhead sit at end values, tweens after sit at start values. That guarantee holds ONLY under these rules:

1. **Every scene/copy tween in the master timeline is `fromTo` with explicit values.** No bare `.from()`, no implicit current-value `.to()` on properties that loop. Build-order and revisit ambiguity is how loops break.
2. **`autoAlpha` everywhere, never `opacity`,** for scene and copy visibility. At 0 it sets `visibility: hidden` — hidden scenes stop compositing (mobile GPU/memory win) and toggle deterministically.
3. **Canonical example of why rule 1 exists:** after one full cycle, Scene 2's bg was left at `xPercent: -45` (end of T2). T7's entrance MUST reset it:
   ```javascript
   tl.fromTo('#scene-2 .scene__bg',
     { xPercent: 0, yPercent: 38 * TRAVEL, autoAlpha: 0 },     // explicit — resets the -45
     { xPercent: 0, yPercent: 0, autoAlpha: 1, ease: 'power1.out', duration: 0.4 }, 0.12)
   ```
   Any property a later cycle depends on must appear explicitly in the `fromTo` pair.
4. **Side effects must be scrub-driven, never time-driven.** The typewriter is a tweened state object (below) — it types forward, erases on reverse, and resets correctly when the wrap jumps the playhead. No `setInterval`, no `tl.call` for visual state.
5. **`gsap.set` initial states for all scenes/copy at timeline build** (scenes 2–7 `autoAlpha: 0`; copy at its hidden from-values), so time=0 is also deterministic.

---

## LOOP MECHANICS — the wrap

**Contract:** the visual state at every point inside `wrapZone` is pixel-identical to the state at the `scene2` label (Scene 2 at rest: bg `xPercent:0, yPercent:0, scale:1, autoAlpha:1`; Scene 2 copy hidden at pre-copyIn from-values; all other scenes `autoAlpha:0`). T7 ends in exactly that state; `wrapBuffer()` is a 0.2-weight timeline that holds it (a no-op `tl.to({}, {duration: 0.2})`).

```javascript
const st = master.scrollTrigger

// Precompute once after build + refresh:
const WRAP_AT_PROGRESS = master.labels['wrapZone'] / master.duration()  // raw scroll progress
const LOOP_TO_SCROLL   = () => st.labelToScroll('scene2')               // px, refresh-safe

function onMasterUpdate(self) {
  updateChrome(self)                          // counter, dots, progress line, .is-active
  if (self.direction > 0 && self.progress >= WRAP_AT_PROGRESS) wrapLoop()
}

function wrapLoop() {
  smoother.scrollTop(LOOP_TO_SCROLL())        // instant scroll jump (no smoothing)
  const scrub = st.getTween()
  if (scrub) scrub.progress(1)                // snap scrubbed playhead — prevents a visible
                                              // reverse fly-through across all scenes
  track('loop_completed')                     // analytics
}
```

Notes:
- Wrap fires only on **forward** direction (`self.direction > 0`). Scrolling up inside wrapZone simply reverses T7 — valid and coherent.
- The 0.2-weight buffer absorbs scrub lag and fast-flick overshoot: even if the snap lands a few pixels off, both sides of the jump render the identical scene2-rest frame.
- After `mm` rebuilds (breakpoint change) or `ScrollTrigger.refresh()` (resize), recompute `WRAP_AT_PROGRESS`; `labelToScroll` is already refresh-safe as a function.
- Progress line resets to ~8% on wrap (scene2 position) — intentional; it visually communicates the cycle. Counter/dots are label-derived and remain correct automatically.

---

## 3D DEPTH SYSTEM

```css
#cinematic { perspective: 1200px; }
.scene     { transform-style: preserve-3d; }
/* compensation: scale = (perspective − z) / perspective */
.scene__depth--far  { transform: translateZ(-220px) scale(1.19); }
.scene__depth--mid  { transform: translateZ(-80px)  scale(1.07); }
.scene__depth--near { transform: translateZ(0); }
.scene__bg, .scene__copy { backface-visibility: hidden; }   /* Safari 3D flicker guard */
```

Dual-layer mouse parallax (desktop only) — background WITH cursor, copy AGAINST it:
```javascript
if (matchMedia('(pointer: fine)').matches) {
  let raf
  addEventListener('mousemove', (e) => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5
      gsap.to('.scene.is-active .scene__bg',   { x: x * 16, y: y * 10, duration: 1.8, ease: 'power1.out', overwrite: 'auto' })
      gsap.to('.scene.is-active .scene__copy', { x: x * -6, y: y * -4, duration: 1.8, ease: 'power1.out', overwrite: 'auto' })
    })
  })
}
```
`.is-active` toggled by `updateChrome` from nearest label. **Optional Phase 3 (do not build now):** Three.js depth-map displacement on Scenes 1/6/7; gyroscope parallax on mobile.

---

## PRELOADER & INTRO

1. `#preloader`: fixed overlay (`--deep-navy`), IWC monogram, thin gold progress bar. Visible < 100ms (inline critical CSS).
2. Preload + **`img.decode()`** all 7 scene images, advancing the bar per image. Await `document.fonts.ready`. **Every image decodes before the experience starts** — the loop revisits all scenes, so nothing inside `#cinematic` may lazy-load.
3. Then: `ScrollTrigger.refresh()` → build SplitText instances → fade preloader (0.8s) → **time-based intro** (not scrubbed): Scene 1 bg scale 1.08→1.0 over 2.4s + Scene 1 copyIn → `smoother.paused(false)`.
4. Budget: interactive < 3.5s on Fast 4G. Trim quality before dimensions.

---

## SCENES & TRANSITIONS (canon: Storyboard.png)

Hold pattern (replicate; duration = weight; copy occupies first ~40%):
```javascript
function scene2_hold() {
  const tl = gsap.timeline()
  tl.add(copyIn('#scene-2'), 0)
  tl.fromTo('#scene-2 .scene__bg', { xPercent: 0 }, { xPercent: -3, ease: 'none', duration: 1 }, 0)
  return tl
}
```

---

**SCENE 1 — OPEN: Logo Reveal** · `1000010663.png` · mobile focal `center 45%`
Hold: push-in scale 1.0→1.05 (fromTo, scrubbed).
Copy (center):
- Label `[DRAFT]` `Engineered by Design · Est. 2010`
- H1 `[APPROVED]` `Integrity / Web Creations` ("Web" italic gold)
- Body `[APPROVED]` `Design. Function. Integrity.`
- CTA `[APPROVED]` `Start Your Project` → `smoother.scrollTo(st.labelToScroll('scene7'), true)`
Gradient: `linear-gradient(160deg, rgba(5,8,20,.3), rgba(5,8,20,.85))`

**T1 — PAN DOWN to Driveway** (0.6) — camera tilts down; world shifts up-frame; new content reveals from bottom.
```javascript
function t1_panDown() {
  const tl = gsap.timeline()
  tl.fromTo('#scene-1 .scene__bg', { yPercent: 0 },   { yPercent: -30 * TRAVEL, ease: 'none', duration: 0.6 }, 0)
  tl.fromTo('#scene-1',            { autoAlpha: 1 },  { autoAlpha: 0, ease: 'power1.in', duration: 0.25 }, 0.3)
  tl.fromTo('#scene-2 .scene__bg', { xPercent: 0, yPercent: 35 * TRAVEL }, { xPercent: 0, yPercent: 0, ease: 'none', duration: 0.6 }, 0)
  tl.fromTo('#scene-2',            { autoAlpha: 0 },  { autoAlpha: 1, ease: 'power1.out', duration: 0.3 }, 0.1)
  tl.add(copyOut('#scene-1'), 0)
  return tl
}
```

**SCENE 2 — Brand Promise (LOOP LANDING)** · `1000010657.png` · mobile focal `62% center` (keep grille)
Copy (bottom-left):
- Label `[DRAFT]` `The Brand Promise`
- H2 `[DRAFT]` `Premium From / Day One` ("Day One" gold)
- Body `[APPROVED]` `Engineered for businesses that want to look established, trusted, and premium from day one.`
Gradient: `linear-gradient(to top, rgba(8,9,12,.92), rgba(8,9,12,.1) 55%, transparent)`

**T2 — PAN RIGHT Into Home** (0.7) — the only horizontal move; keep it singular.
```javascript
tl.fromTo('#scene-2 .scene__bg', { xPercent: -3 }, { xPercent: -45 * TRAVEL, ease: 'none', duration: 0.7 }, 0)
tl.fromTo('#scene-2', { autoAlpha: 1 }, { autoAlpha: 0, ease: 'power1.in', duration: 0.28 }, 0.35)
tl.fromTo('#scene-3 .scene__bg', { xPercent: 50 * TRAVEL, yPercent: 0 }, { xPercent: 0, yPercent: 0, ease: 'none', duration: 0.7 }, 0)
tl.fromTo('#scene-3', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.12)
tl.add(copyOut('#scene-2'), 0)
```

**SCENE 3 — Designed to Convert** · `1000010659.png` · mobile focal `40% center`
Copy (top-right):
- Label `[DRAFT]` `The Experience`
- H2 `[DRAFT]` `Designed / to Convert` ("Convert" gold)
- Body `[APPROVED]` `We design websites that don't just look good — they guide customers, build trust, and convert attention into action.`
Gradient: `linear-gradient(to right, rgba(8,9,12,.9), rgba(8,9,12,.2) 60%, transparent)`

**T3 — RISE Into Office** (0.6) — camera ascends; scenes move down-frame; new content from above.
```javascript
tl.fromTo('#scene-3 .scene__bg', { yPercent: 0 }, { yPercent: 40 * TRAVEL, ease: 'none', duration: 0.6 }, 0)
tl.fromTo('#scene-3', { autoAlpha: 1 }, { autoAlpha: 0, ease: 'power1.in', duration: 0.25 }, 0.3)
tl.fromTo('#scene-4 .scene__bg', { xPercent: 0, yPercent: -40 * TRAVEL, scale: 1 }, { xPercent: 0, yPercent: 0, scale: 1, ease: 'none', duration: 0.6 }, 0)
tl.fromTo('#scene-4', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.12)
tl.add(copyOut('#scene-3'), 0)
```

**SCENE 4 — The Expert** · `1000010658.png` · mobile focal `center 38%`
Hold: push toward monitors, scale 1.0→1.06 (foreshadows T4).
Copy (bottom-left):
- Label `[DRAFT]` `The Expert Behind the Build`
- H2 `[APPROVED]` `Strategy. Design. / Development. Execution.` ("Execution." gold)
- Body `[DRAFT]` `Fifteen years of custom builds. Zero templates.`
Gradient: `linear-gradient(to top, rgba(8,9,12,.95), rgba(8,9,12,.3) 50%, transparent)`

**T4 — ZOOM Into Monitor** (0.6)
```javascript
tl.fromTo('#scene-4 .scene__bg', { scale: 1.06, yPercent: 0 }, { scale: 1.55, yPercent: -6 * TRAVEL, ease: 'power1.in', duration: 0.6 }, 0)
tl.fromTo('#scene-4', { autoAlpha: 1 }, { autoAlpha: 0, ease: 'power1.in', duration: 0.22 }, 0.4)
tl.fromTo('#scene-5 .scene__bg', { scale: 0.92, xPercent: 0, yPercent: 0 }, { scale: 1, xPercent: 0, yPercent: 0, ease: 'power1.out', duration: 0.45 }, 0.18)
tl.fromTo('#scene-5', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.22)
tl.add(copyOut('#scene-4'), 0)
```

**SCENE 5 — Services** · `1000010660.png` · mobile focal `center 30%` · weight 1.5
Copy (bottom-left):
- Label `[DRAFT]` `The Process`
- H2 `[DRAFT]` `Built With / Intention` ("Intention" gold)
- Body `[APPROVED]` `Every project is planned, coded, refined, and built with intention.`
- Services `[APPROVED list]` as gold-bordered chips, fromTo scrub-stagger 0.08:
  `Website Design · Branding · SEO Setup · Business Email · Hosting · Maintenance · AI Integration`
Gradient: `linear-gradient(135deg, rgba(8,9,12,.85), rgba(8,9,12,.1) 60%)`

**T5 — LIFT OVER Screen to Window — with BLACK BEAT** (1.0)
Camera pushes into the dark monitor (screen fills frame = the black moment), scrub-driven typewriter fires, camera lifts over to the window.
```javascript
function t5_liftOver() {
  const tl = gsap.timeline()
  tl.fromTo('#scene-5 .scene__bg', { scale: 1, yPercent: 0 }, { scale: 1.5, yPercent: -10 * TRAVEL, ease: 'power1.in', duration: 0.35 }, 0)
  tl.fromTo('#black-beat', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08, ease: 'power2.in' }, 0.26)
  tl.fromTo('#scene-5', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.1 }, 0.3)

  // SCRUB-SAFE typewriter — types forward, erases on reverse, resets on wrap
  const TW = 'initializing_greatness.exe'
  const state = { n: 0 }
  tl.fromTo(state, { n: 0 }, {
    n: TW.length, ease: 'none', duration: 0.22, snap: { n: 1 },
    onUpdate: () => { document.querySelector('#black-beat p').textContent = TW.slice(0, state.n) }
  }, 0.34)

  tl.fromTo('#scene-6 .scene__bg', { yPercent: -35 * TRAVEL, scale: 1.12, xPercent: 0 },
            { yPercent: 0, scale: 1.04, xPercent: 0, ease: 'power1.out', duration: 0.4 }, 0.58)
  tl.fromTo('#black-beat', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.14, ease: 'power2.out' }, 0.62)
  tl.fromTo('#scene-6', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.58)
  tl.add(copyOut('#scene-5'), 0)
  return tl
}
```
`#black-beat`: absolute in `#cinematic`, `#000`, centered Inter 100, letter-spacing 0.5em, blinking gold cursor dot (pure CSS animation — allowed, it's stateless decoration).

**SCENE 6 — Built for Growth** · `1000010661.png` · mobile focal `center 40%`
Hold: zoom-out scale 1.04→1.0 (breathing room after the black beat — note T5 lands it at 1.04).
Copy (top-right):
- Label `[DRAFT]` `The Transformation`
- H2 `[DRAFT]` `Built for / Growth` ("Growth" gold)
- Body `[APPROVED]` `From idea to launch, we create digital foundations built for growth.`
Gradient: `linear-gradient(to bottom, rgba(8,9,12,.7), rgba(8,9,12,.1) 40%, rgba(8,9,12,.75))`

**T6 — GLIDE OUT Over Water** (0.7) — through the glass; the most expansive moment.
```javascript
tl.fromTo('#scene-6 .scene__bg', { scale: 1.0 }, { scale: 1.35, ease: 'power1.in', duration: 0.7 }, 0)
tl.fromTo('#scene-6', { autoAlpha: 1 }, { autoAlpha: 0, ease: 'power1.in', duration: 0.28 }, 0.38)
tl.fromTo('#scene-7 .scene__bg', { scale: 1.18, xPercent: 0, yPercent: 0 }, { scale: 1, xPercent: 0, yPercent: 0, ease: 'power2.out', duration: 0.55 }, 0.18)
tl.fromTo('#scene-7', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.22)
tl.add(copyOut('#scene-6'), 0)
```

**SCENE 7 — Final CTA** · `1000010664.png` · mobile focal `center 55%` · weight 1.4
Hold: floating drift yPercent 2→-2 (fromTo).
Copy (center):
- Label `[DRAFT]` `The Lowcountry's Digital Agency · Beaufort, SC · Since 2010`
- H2 `[DRAFT]` `More Than a Website. / A Digital Presence.` ("Digital Presence." gold)
- Body `[APPROVED]` `Your business deserves more than a website. It deserves a digital presence.`
- CTA primary `[APPROVED]` `Claim Your June Website Offer` → `/contact`
- CTA ghost `[APPROVED]` `Book a Free Consultation` → `/contact`
Gradient: `linear-gradient(to top, rgba(8,9,12,.97), rgba(8,9,12,.35) 55%, transparent)`

**T7 — DESCEND Back to the Driveway (LOOP TRANSITION)** (0.7) — camera comes down from over the water back to street level; mirrors T1's downward grammar. Scene 2 re-enters image-only (its copy re-types during the next scene2 hold).
```javascript
function t7_descendLoop() {
  const tl = gsap.timeline()
  tl.fromTo('#scene-7 .scene__bg', { yPercent: 0, scale: 1 }, { yPercent: -32 * TRAVEL, scale: 1.06, ease: 'none', duration: 0.7 }, 0)
  tl.fromTo('#scene-7', { autoAlpha: 1 }, { autoAlpha: 0, ease: 'power1.in', duration: 0.26 }, 0.4)
  // EXPLICIT resets — scene 2 was left at xPercent:-45/autoAlpha:0 by T2 last cycle:
  tl.fromTo('#scene-2 .scene__bg', { xPercent: 0, yPercent: 38 * TRAVEL, scale: 1 },
            { xPercent: 0, yPercent: 0, scale: 1, ease: 'power1.out', duration: 0.45 }, 0.12)
  tl.fromTo('#scene-2', { autoAlpha: 0 }, { autoAlpha: 1, ease: 'power1.out', duration: 0.3 }, 0.18)
  tl.add(copyOut('#scene-7'), 0)
  return tl
}

function wrapBuffer() {
  return gsap.timeline().to({}, { duration: 0.2 })   // static hold ≡ scene2 rest state
}
```
**End-state contract check (must verify in QA):** at T7 end and throughout wrapZone: scene2 bg `{xPercent:0, yPercent:0, scale:1, autoAlpha:1}`, scene2 copy hidden at pre-copyIn from-values, scenes 1 & 3–7 `autoAlpha:0`, black-beat `autoAlpha:0`, typewriter `n:0` after wrap renders scene2 label state. Identical to the `scene2` label render. If any property differs, the wrap will flash — fix the fromTo pairs, not the wrap.

---

## SHARED HELPERS

```javascript
function copyIn(sel) {       // ALL fromTo — explicit values (Determinism rule 1)
  const s = document.querySelector(sel)
  const split = splits.get(sel)            // built once after fonts.ready; autoSplit handles resize
  const tl = gsap.timeline()
  tl.fromTo(s.querySelector('.label'), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power3.out' }, 0)
  tl.fromTo(split.words, { autoAlpha: 0, yPercent: 110 }, { autoAlpha: 1, yPercent: 0, stagger: 0.04, duration: 0.45, ease: 'power3.out' }, 0.08)
  tl.fromTo(s.querySelector('.body-copy'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power3.out' }, 0.35)
  const cta = s.querySelector('.cta-wrap')
  if (cta) tl.fromTo(cta, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power3.out' }, 0.5)
  return tl
}

function copyOut(sel) {
  return gsap.timeline().to(
    `${sel} .label, ${sel} .headline .split-word, ${sel} .body-copy, ${sel} .cta-wrap`,
    { autoAlpha: 0, y: -18, duration: 0.2, stagger: 0.03, ease: 'power2.in' })
}
```
SplitText: build once per headline after `document.fonts.ready`, with `autoSplit: true` (GSAP 3.13 re-splits on resize/reflow automatically). Store instances in a `splits` Map; never re-split per scroll.

Navigation:
```javascript
navDots.forEach((dot, i) =>
  dot.addEventListener('click', () => smoother.scrollTo(st.labelToScroll('scene' + (i + 1)), true)))
skipIntro.addEventListener('click', e => { e.preventDefault(); smoother.scrollTo(st.labelToScroll('scene7'), true) })
addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') smoother.scrollTo(st.labelToScroll(nextSceneLabel()), true)
  if (e.key === 'ArrowUp')   smoother.scrollTo(st.labelToScroll(prevSceneLabel()), true)
})
```
`updateChrome(self)`: nearest scene label from `master.time()` → counter "01"–"07" crossfade, dot active state, `.is-active` scene class, progress line `width = self.progress * 100%`, scroll-cue fade after 5%, wrap check (Loop Mechanics).

---

## MOBILE SPECIFICATION

1. `#cinematic { height: 100svh }` — never bare `100vh`. `normalizeScroll` + `ignoreMobileResize` already set.
2. `UNIT = 70` (≈910svh total) and `TRAVEL = 0.6` — both injected via the matchMedia context. Never fork timeline code.
3. Per-scene `objectPosition` mobile focal values as specified; verify each visually at 390×844.
4. **Memory:** mobile gets 1536w image variants via `sizes` — seven decoded 4K images inside one pin will pressure iOS. Desktop 2560w.
5. No mouse parallax on touch (pointer guard). Gyro = Phase 3.
6. Nav dots ≥ 44×44px hit area. Top nav collapses to a minimal menu button.
7. Loop on mobile: identical wrap mechanics; verify with momentum flicks (fast inertial scroll across wrapZone must still wrap cleanly — the 0.2 buffer exists for this).

---

## ACCESSIBILITY & REDUCED MOTION

- `prefers-reduced-motion: reduce` → no smoother, no master timeline, no loop. Render scenes as static stacked `100svh` sections in storyboard order, copy visible, **plus a real footer block at the end** (contact info, nav links, legal) since the loop's chrome-only model doesn't apply.
- `#skip-intro` ("Skip to offer"): visible on focus, jumps to scene7 label.
- Semantic: `<h1>` Scene 1, `<h2>` Scenes 2–7; real text in DOM always; bg images `alt=""`; counter `aria-hidden`; dots labeled.
- Keyboard: arrows between scenes; logical tab order; visible gold focus rings. The loop never traps focus — tab order runs chrome → scene copy → CTAs.

---

## ASSET PIPELINE

Source (quote it — the path contains spaces):
```
"C:\Users\Aaron and Janay\Desktop\Integrity Web Creations\Claude\Web Projects\integrity-web-creations-v2\Storyboard\"
```

Mapping — **open and view every image, confirm against its Storyboard.png frame, before wiring:**
```
Scene 1 → 1000010663.png   IWC logo / navy / spider web / skyline
Scene 2 → 1000010657.png   Black BMW, modern home, golden hour   (LOOP LANDING)
Scene 3 → 1000010659.png   Penthouse living room, sunset windows
Scene 4 → 1000010658.png   Developer at triple monitors
Scene 5 → 1000010660.png   VS Code workspace, sticky notes
Scene 6 → 1000010661.png   Skyline through window panels
Scene 7 → 1000010664.png   Skyline over water, twilight
Reference → Storyboard.png  → /docs/storyboard.png
```

`scripts/optimize-images.mjs` (sharp): per scene output AVIF + WebP at **2560w (desktop) and 1536w (mobile)** → `/public/images/scenes/`. Budgets: WebP ≤ 400KB @2560 / ≤ 220KB @1536; AVIF ≤ 280KB / ≤ 160KB. Also generate `/public/og.jpg` (1200×630, Scene 1 art + wordmark) and favicons from the IWC monogram.

---

## PAGES (Phase 1 scope)

- **/contact:** Name, Business Name, Email, Phone, Service Interest (select: the 7 services), Message → API route → Zod validation + honeypot → Resend → `process.env.CONTACT_TO`. Animated success + failure states (failure shows direct email fallback). Matches cinematic aesthetic; standard scroll (smoother active, no pin).
- **/privacy:** minimal stub page (chrome legal link target). Copy = OPEN QUESTION.
- /services, /portfolio, /about: Phase 2.

---

## ANALYTICS (Phase 1 — cheap and valuable)

Vercel Analytics custom events: `scene_view` (fire once per scene per cycle, with `{scene, cycle}`), `loop_completed` (in `wrapLoop`), `cta_click` (`{cta: 'start_project' | 'june_offer' | 'consultation'}`), `contact_submitted`. These tell Aaron exactly where attention dies in the loop and which CTA converts.

---

## COMPONENT ARCHITECTURE

```
/app
  page.tsx · contact/page.tsx · privacy/page.tsx · api/contact/route.ts
/components/cinematic
  Preloader.tsx · SmoothWrapper.tsx
  Cinematic.tsx          ← matchMedia contexts, builds master, wrap logic
  Scene.tsx · SceneDepth.tsx · SceneBg.tsx · SceneCopy.tsx · BlackBeat.tsx
  transitions.ts         ← t1…t7, holds, wrapBuffer, copyIn/copyOut
  loop.ts                ← WRAP_AT, LOOP_TO, wrapLoop()
  chrome/  TopNav · NavDots · SceneCounter · ProgressLine · ScrollCue · LegalLine · SkipIntro
/lib
  gsap.ts ('use client' registration) · sceneData.ts · analytics.ts
/hooks
  useScrollSmoother.ts · useMasterTimeline.ts · useMouseParallax.ts
/scripts  optimize-images.mjs
/docs     storyboard.png
```

```typescript
interface SceneConfig {
  id: string; image: string
  objectPosition: { desktop: string; mobile: string }
  gradient: string
  copyLayout: 'bottom-left' | 'top-right' | 'center'
  label: string; headline: string[]; goldLine: number; body: string
  copyStatus: Record<'label'|'headline'|'body', 'approved' | 'draft'>   // see canon rule
  services?: string[]
  ctas?: { text: string; href: string; variant: 'primary' | 'ghost' }[]
  holdWeight: number
  cameraHold: 'push-in' | 'drift-left' | 'zoom-out' | 'float' | 'none'
}
```
**`sceneData.ts` is the single source of truth for all copy.** Claude Code must not alter `approved` strings or invent replacements for `draft` ones — drafts ship as written and are flagged in the launch review.

---

## BUILD ORDER — vertical slices with a checkpoint

1. Scaffold: Next 15 + TS strict + Tailwind v4 + next/font + tokens.
2. Asset pipeline: run optimizer; **view every scene image** and confirm mapping against Storyboard.png; generate og/favicons.
3. **Cinematic shell de-risk:** chrome (outside wrapper) + pinned `#cinematic` with 7 solid-color placeholder scenes + full segment table + **the wrap working between placeholder colors**. Verify pin, scrub, AND loop wrap on desktop + **real iOS Safari** now. If the shell or wrap is wrong here, nothing else matters.
4. Preloader + Scene 1 intro.
5. T1 + Scene 2 complete. **CHECKPOINT — stop and request Aaron's review:** compare feel against igloo.inc; tune ONLY the three knobs; get explicit sign-off on this one transition before replicating.
6. Scenes 3–7 + T2–T6 (T5 scrub-safe typewriter).
7. T7 + wrapBuffer + wrap wiring with real imagery. Run the **end-state contract check** (T7/wrapZone state ≡ scene2 label render).
8. Chrome wiring (labelToScroll everywhere) + depth pass (nested layers + dual mouse parallax).
9. Mobile pass: matchMedia values live, focal points, 1536w path, 390×844 + iPad + momentum-flick wrap test.
10. Reduced motion (static + footer) + a11y + SEO (meta/OG, LocalBusiness JSON-LD, sitemap, robots).
11. /contact + /privacy + Resend + analytics events.
12. Performance pass + full QA. Vercel preview → Aaron approval → production.

---

## QA ACCEPTANCE CRITERIA — "done" = all pass

**Loop:**
- Three consecutive forward cycles: every wrap invisible — no flash, no jump, no copy ghost, typewriter resets.
- Scroll up immediately after a wrap: reverses cleanly through T1 into the logo.
- Fast momentum flick across wrapZone (desktop wheel + mobile inertia): wrap still seamless.
- Nav dots / counter / Scene 1 CTA / skip link all land precisely after multiple wraps.
- Memory stable across 5 cycles (no climbing heap; check DevTools Performance monitor).

**Behavioral:**
- Full 0→end→0 traverse: everything reverses; no stuck autoAlpha or transforms.
- Hard refresh mid-pin: correct state restores (`invalidateOnRefresh`).
- Resize desktop↔mobile breakpoint: matchMedia rebuilds; wrap positions recompute; no breakage.
- Black beat never visible outside T5.

**Matrix:** Chrome / Safari / Firefox / Edge desktop · iOS Safari (real device) · Android Chrome.
**Budgets:** Lighthouse Perf ≥ 90 desktop / ≥ 80 mobile · A11y ≥ 95 · LCP < 2.5s · CLS < 0.05 · zero console errors / GSAP warnings · scene payload ≤ 2.8MB desktop / ≤ 1.6MB mobile (AVIF path).
**Visual:** every transition matches its Storyboard.png arrow; headline anchors alternate; gold only on designated italic words.

---

## ENV & DEPLOY

```
RESEND_API_KEY=…        CONTACT_TO=…   (see Open Questions)
NEXT_PUBLIC_SITE_URL=https://www.integritywebcreations.com
```
Vercel: production branch `main`, preview deployments on PRs, Vercel Analytics enabled. Domain: integritywebcreations.com (+ www redirect).

---

## OPEN QUESTIONS — Aaron must answer before launch (build proceeds with drafts meanwhile)

1. **Copy approval:** every `[DRAFT]` label/headline above (S1 label; S2/S3/S5/S6/S7 headlines + labels; S4 body). Approve or replace — strings live in `sceneData.ts`.
2. **Loop landing confirmed?** Wrap returns to **Scene 2 (car)** per your original storyboard description; logo is intro-only. Confirm, or switch wrap target to Scene 1.
3. **CONTACT_TO address:** prior work used both `info@` and `aaron@integritywebcreations.com` — which receives form submissions?
4. **Privacy page copy** (legal line links to it).
5. **June offer end date:** Scene 7 says "June" — confirm whether copy should auto-expire or be manually swapped July 1.

---

## PHASES

**Phase 1 (this build):** looping cinematic homepage + /contact + /privacy + analytics + deploy.
**Phase 2:** /services /portfolio /about, Sanity, blog.
**Phase 3:** PWA, A/B CTA variants, exit-intent capture, Three.js depth maps, gyro parallax, bidirectional infinite scroll (if desired).

## SUCCESS TEST

Open igloo.inc and scroll slowly — that liquid scrub is the feel target (`smooth 1.5`, `scrub 1.2`). Open Storyboard.png — that's the sequence target. The build is done when scrolling the IWC homepage feels like scrubbing the storyboard's promotional video — logo → pan down to the driveway → pan right into the home → rise into the office → zoom into the monitor → black beat → lift over to the window → glide out over the water → CTA → **descend back to the driveway and begin again, seamlessly, forever** — forward and backward, desktop and phone, with zero visible seam at the wrap.
