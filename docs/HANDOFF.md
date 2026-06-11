# IWC Cinematic Rebuild — Session Hand-off (2026-06-11)

Read this first in a fresh session, alongside `IWC_ClaudeCode_Prompt.md`
(the original brief — many of its specifics have since been superseded by
Aaron's live direction; THIS document + the git log are current truth).

## What this is

A ground-up Next.js 15 rebuild of integritywebcreations.com: an
igloo.inc-style, infinitely looping, scroll-driven cinematic homepage plus
themed subpages. Lives on branch **`feat/cinematic-rebuild`**. The old
Astro 6 + Supabase-CRM site still runs production on `master` — DO NOT
touch master until Aaron approves cutover.

- **Review URL (Aaron tests here, public, no login):**
  https://iwc-cinematic-preview.vercel.app
  Separate Vercel project `iwc-cinematic-preview` (scope
  `aaron-smalls-projects`), git auto-deploy DISCONNECTED on purpose.
- Aaron's machine **cannot run the site locally** — never ask him to, and
  avoid long-running local servers; verify on the deployment.

## Deploy workflow (every iteration)

```powershell
npm run build                       # must pass first
git add -A; git commit -F .git\COMMIT_MSG_TMP.txt; git push   # write msg to file first (PS heredocs corrupt)
Rename-Item .vercel .vercel.main -Force
npx vercel link --yes --project iwc-cinematic-preview --scope aaron-smalls-projects
npx vercel deploy --prod --yes
Rename-Item .vercel .vercel.preview -Force; Rename-Item .vercel.main .vercel -Force
Remove-Item .vercel.preview -Recurse -Force
```

## Verification (no local browser)

- `node scripts/verify-deployed.mjs` — CDP probe: opening timeline, T1
  phases, wrap landing. Wait on STATE (e.g. `--wipe` >= 139%), not time —
  headless tabs are rAF-throttled and GSAP time-based animation crawls.
- `node scripts/screenshot-deployed.mjs` — boots the page, scrolls to
  timeline fractions, saves PNGs at desktop/mobile/landscape emulation.
  Keep its `TOTAL` constant in sync with the master timeline's total units
  (currently ~31.3; recompute after weight/copy changes — holds extend when
  sequential copyIn exceeds the weight: duration = max(weight, units×per)).
- `--virtual-time-budget` screenshots only ever capture the preloader —
  don't trust them for post-boot states.

## Architecture map

- `lib/sceneData.ts` — single source of truth for ALL cinematic copy +
  per-scene config (images, gradients, layouts, mobile headline variants,
  points/columns/ctas/form flags). Scene 1+2 copy is transcribed verbatim
  from Aaron's mockups (concepts 1 and 3).
- `components/cinematic/` — Cinematic.tsx (orchestrator: boot, splits,
  matchMedia, chrome updates, nav/keyboard, intro), transitions.ts (holds,
  t1–t7, sequential copyIn/copyOut), loop.ts (forward-only wrap →
  **scene 1**), config.ts (tuning knobs + weight table), chrome/* (TopNav,
  BrandMark, ProgressLine, ScrollCue, LegalLine, SkipIntro — counter+dots
  were removed), Scene/SceneBg/SceneCopy/BlackBeat/SmoothWrapper.
- `components/site/` — SubpageShell (chrome + footer), SubpageFx
  (IntersectionObserver sequential reveals), ContactForm (two-column
  condensed; used on /contact and embedded in scene 7).
- `app/api/contact/route.ts` — zod + honeypot + nodemailer over Bluehost
  SMTP (`SMTP_*` env, `CONTACT_TO` defaults to SMTP_USER=asmalls@). SMTP
  vars are SET on the preview Vercel project.
- `scripts/optimize-images.mjs` — sharp pipeline; concepts 0–8 in
  /Storyboard are before/after pairs (0=clean logo backdrop, 1=complete
  logo card → ships as scene-1b reveal plate, 2=clean car, 3=car mockup
  whose text is DOM, 4–8=scenes 3–7). og/favicons from concept 1.

## The experience, as Aaron has shaped it (supersedes the brief)

- Opening: BLACK → backdrop fades (1s×F) → complete logo card wipes in
  top→bottom (3s×F); F = 1.5 desktop / 2.5 mobile. Landing = image only
  (sr-only h1 for SEO). Loop wraps back to **scene 1** (landing), not the
  car. Wrap = scrollTop + ScrollTrigger.update() + scrub.progress(1) +
  totalTime fallback (prevents reverse fly-through; verified glitch-free).
- Landing never zooms IN on scroll: hold 1.0→0.96, T1 pulls back to 0.6,
  THEN pans down; image 2 rises flat. All transitions span 3× scroll
  (timeScale 1/T_SCALE on canon timelines) and fade out→black→in.
- Text reveals are STRICTLY sequential: top→bottom then left→right, one
  line at a time, nothing starts until the prior finishes; headlines split
  by LINES (SplitText mask lines). Per-line duration = scene budget ÷ line
  count (fewer lines ⇒ slower). The scene-7 form panel fades 2.5× slower.
- Mobile (≤768px width OR ≤520px height — landscape counts as mobile, incl.
  for gsap.matchMedia UNIT/TRAVEL): headers-only (all small text hidden),
  `headlineMobile` fuller wordings, bigger icons/titles, pure-white heavier
  type; scroll cue always visible; UNIT 90 (desktop 60); scenes 1+3 use
  object-fit contain (complete images, letterboxed); scene-3's points sit
  in the bottom dark band; scene-5 copy lifted onto the dark monitor.
- Chrome: boxed white nav (Home·About·Services·Portfolio·Contact), IWC
  mark links home, hamburger+overlay (closable: X morph, ✕ button,
  backdrop) on small/short screens, upward gold chevron cue, progress line.
- Subpages: live-site copy (fetched from www.integritywebcreations.com),
  fade-in from black + sequential IO reveals, dark theme, real footer.

## Known gotchas (hard-won)

- Next image optimizer caches transforms under the same filename — clear
  `.next/cache/images` locally after regenerating assets; a hung in-flight
  optimizer encode poisons all duplicate requests until server restart.
- PowerShell 5.1 round-trips mojibake UTF-8 (— · etc): use
  `[System.IO.File]::ReadAllText/WriteAllText` with UTF8Encoding(false),
  or the Write/Edit tools. Commit messages via `git commit -F file`.
- TypeScript 6 breaks Next 15.5 CSS imports — pinned `typescript@~5.9`.
- sharp allows ONE resize per pipeline (resize→extend needs two passes).
- gsap fromTo determinism rules from the brief still apply everywhere.
- `vercel.json` carries `"framework": "nextjs"` (the SHARED main project
  prj_r31xJHA4l3yiTTunYo5MwCxMRMyo is preset to astro — keep the override
  for the eventual master merge).

## Open items / next session backlog

1. **Subpage cinematics: BUILT (2026-06-11), awaiting Aaron's review.**
   SubpageShell now takes a `hero` prop → full-bleed concept-plate hero
   (Services=scene-5 monitor, About=scene-4 office, Portfolio=scene-7
   water skyline, Contact=scene-6 window; privacy keeps the plain header),
   slow Ken Burns PULL-BACK (landing rule: never zoom in), film grain +
   vignette, sequential masked line reveals, gold-diamond label, downward
   gold chevron. Signature moments: Services process steps light up in
   sequence; About gold timeline 2010→now (**timeline copy is DRAFT** —
   needs Aaron's read); Portfolio gold-matted frames w/ hover tilt + serif
   pull-quotes (typographic plaques — NO live-site screenshots exist yet;
   capture + add if Aaron wants real thumbnails); Contact form docks in
   slowly (scene-7 grammar). Magnetic CTA hovers (fine pointers only) and
   fade-through-black route exits (SubpageFx intercepts internal links —
   full page loads, no client-side nav, intentional). Gutters moved off
   `.subpage` onto `.subpage__pad`; footer carries its own padding.
   Verify with `node scripts/screenshot-subpages.mjs [baseUrl]`.
   **DEPLOY BLOCKER:** the harness permission classifier denies
   `vercel deploy --prod`/`vercel promote` (treats the preview project's
   prod alias as a production deploy). A protected (login-walled) build of
   this work exists. Aaron must promote it (or add a Bash allow rule for
   vercel deploy/promote on this project), e.g. re-link to
   iwc-cinematic-preview then
   `npx vercel promote dpl_3L3iaqmsvb1hJHeB9XaJvaAF4T4o` (this id also
   carries the 2026-06-11 PM chrome scale-down: fluid nav boxes, 1rem
   brand mark, hamburger ≤960px — fixes the desktop nav/IWC clash;
   measured via `scripts/probe-chrome-clash.mjs`).
2. Brief's remaining steps: mouse parallax (hooks/useMouseParallax.ts is
   written, never enabled — depth layers currently neutralized, would need
   re-enabling carefully after the full-screen scale fix), reduced-motion
   full static page + footer, SEO (sitemap/robots/JSON-LD LocalBusiness,
   per-page canonicals), performance/Lighthouse pass (≥90/80, a11y ≥95),
   real-device QA matrix, production cutover plan (replaces Astro site AND
   its CRM/crons — needs Aaron's explicit go + env vars on the main
   project + possibly framework preset flip).
3. Brief open questions Aaron never answered: draft copy approvals, privacy
   page copy, June-offer expiry, CONTACT_TO address ("Vender" vs "Vendor"
   spelling on scene 3 — shipped Vendor, flagged).
4. Scene 5 chips = the longest reveal sequence; Aaron hasn't complained,
   but it's the first candidate if "too long" feedback comes.
5. Old brief assets: sources are 1536px native (brief wanted 2560) — ask
   for re-exports if large-display sharpness comes up.

## Memory

`~/.claude/.../memory/iwc-cinematic-rebuild.md` mirrors the highlights;
this file is the deeper companion. Keep both updated at session end.
