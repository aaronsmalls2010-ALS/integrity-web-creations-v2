/**
 * SINGLE SOURCE OF TRUTH for all cinematic copy.
 *
 * Canon: build brief v3 + Aaron's checkpoint direction (2026-06-11):
 * concepts 0–8 are before/after pairs — clean plates ship as imagery, the
 * "after" mockups (concepts 1 and 3) define text that lives in the DOM and
 * staggers in tied to the scroll. Scene 1 + 2 copy below is transcribed
 * VERBATIM from those mockups and supersedes the brief's earlier strings.
 *
 * Copy status (canon rule):
 *  - 'approved' strings ship VERBATIM. Do not alter.
 *  - 'draft' strings ship as written but are flagged for Aaron's confirmation
 *    before launch (see OPEN QUESTIONS in the brief).
 */

export interface SceneCta {
  text: string
  href: string
  variant: 'primary' | 'ghost'
  /** when set, the CTA scrubs to a master-timeline label instead of navigating */
  scrollLabel?: string
  analyticsId: 'start_project' | 'june_offer' | 'consultation'
}

export interface SceneColumn {
  title: string
  body: string
  icon: 'target' | 'monitor' | 'squares' | 'code'
}

export interface SceneConfig {
  id: string
  image: string
  /** second plate that dissolves in over `image` on load (scene 1: the
   *  complete logo card — image text, not DOM text, per Aaron 2026-06-11) */
  revealImage?: string
  /** headline/body exist for SEO/a11y only (visually hidden) — the text is
   *  part of the artwork */
  textInImage?: boolean
  objectPosition: { desktop: string; mobile: string }
  gradient: string
  copyLayout: 'bottom-left' | 'top-right' | 'center' | 'spread'
  /** large brand monogram above the label (scene 1 / concept-1 mockup) */
  monogram?: string
  label: string
  headline: string[]
  /** index into `headline` of the line containing the gold accent (-1 = none) */
  goldLine: number
  /** exact substring of headline[goldLine] rendered italic gold */
  goldText: string
  body: string
  copyStatus: Record<'label' | 'headline' | 'body', 'approved' | 'draft'>
  services?: string[]
  /** icon columns row (scene 2 / concept-3 mockup) */
  columns?: SceneColumn[]
  /** bottom strap line (scene 2 / concept-3 mockup) */
  strap?: string
  ctas?: SceneCta[]
  holdWeight: number
  cameraHold: 'push-in' | 'drift-left' | 'zoom-out' | 'float' | 'none'
}

export const SCENES: SceneConfig[] = [
  {
    // SCENE 1 — OPEN: Logo Reveal (LOOP LANDING)
    // Aaron 2026-06-11: complete images, no DOM text — load starts on the
    // clean backdrop (concept 0) and dissolves into the full logo card
    // (concept 1). headline/body remain for SEO/a11y only (visually hidden).
    id: 'scene-1',
    image: '/images/scenes/scene-1-desktop.webp', // concept 0 — clean backdrop
    revealImage: '/images/scenes/scene-1b-desktop.webp', // concept 1 — full card
    textInImage: true,
    objectPosition: { desktop: 'center 42%', mobile: 'center 42%' },
    gradient: 'linear-gradient(160deg, rgba(5,8,20,.12), rgba(5,8,20,.4))',
    copyLayout: 'center',
    label: 'Engineered by Design',
    headline: ['Integrity', 'Web Creations'], // [APPROVED — sr-only]
    goldLine: -1,
    goldText: '',
    body: 'Design. Function. Integrity.', // [APPROVED — sr-only]
    copyStatus: { label: 'approved', headline: 'approved', body: 'approved' },
    holdWeight: 1.0,
    cameraHold: 'push-in',
  },
  {
    // SCENE 2 — The Car (LOOP LANDING) · plate IWC_Concept_2.png (clean)
    // composition target: IWC_Concept_3.png mockup — supersedes brief v3's
    // "Premium From / Day One" copy per Aaron 2026-06-11
    id: 'scene-2',
    image: '/images/scenes/scene-2-desktop.webp',
    objectPosition: { desktop: 'center 55%', mobile: '62% center' }, // keep grille
    gradient:
      'linear-gradient(115deg, rgba(8,9,12,.8), rgba(8,9,12,.28) 40%, transparent 62%), linear-gradient(to top, rgba(8,9,12,.88), rgba(8,9,12,.08) 50%, rgba(8,9,12,.25))',
    copyLayout: 'spread',
    label: '',
    headline: ['Engineered for Eternity.', 'Crafted for Legacy.'], // concept-3 mockup
    goldLine: -1,
    goldText: '',
    body: 'We blend strategy, creativity, and code to build digital experiences that stand the test of time.', // concept-3 mockup
    copyStatus: { label: 'approved', headline: 'approved', body: 'approved' },
    // legibility: extra upper-left scrim under the headline (bright sky there)
    // — composited with the base gradient below
    columns: [
      // concept-3 mockup, verbatim
      {
        title: 'Marketing',
        body: 'Data-driven strategies that attract, engage, and convert.',
        icon: 'target',
      },
      {
        title: 'Websites',
        body: 'Beautiful, responsive websites built for performance and results.',
        icon: 'monitor',
      },
      {
        title: 'Branding',
        body: 'Strong identities that make your brand memorable and trusted.',
        icon: 'squares',
      },
      {
        title: 'Coding',
        body: 'Clean, scalable code that powers seamless digital experiences.',
        icon: 'code',
      },
    ],
    strap: 'Strategy. Design. Development. Growth.', // concept-3 mockup
    holdWeight: 1.0,
    cameraHold: 'drift-left',
  },
  {
    // SCENE 3 — Designed to Convert · plate IWC_Concept_4.png
    id: 'scene-3',
    image: '/images/scenes/scene-3-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: '40% center' },
    gradient:
      'linear-gradient(to left, rgba(8,9,12,.85), rgba(8,9,12,.22) 52%, transparent)',
    copyLayout: 'top-right',
    label: 'The Experience', // [DRAFT]
    headline: ['Designed', 'to Convert'], // [DRAFT]
    goldLine: 1,
    goldText: 'Convert',
    body: "We design websites that don't just look good — they guide customers, build trust, and convert attention into action.", // [APPROVED]
    copyStatus: { label: 'draft', headline: 'draft', body: 'approved' },
    holdWeight: 1.0,
    cameraHold: 'none',
  },
  {
    // SCENE 4 — The Expert · plate IWC_Concept_5.png
    id: 'scene-4',
    image: '/images/scenes/scene-4-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: 'center 38%' },
    gradient:
      'linear-gradient(to top, rgba(8,9,12,.95), rgba(8,9,12,.3) 50%, transparent)',
    copyLayout: 'bottom-left',
    label: 'The Expert Behind the Build', // [DRAFT]
    headline: ['Strategy. Design.', 'Development. Execution.'], // [APPROVED]
    goldLine: 1,
    goldText: 'Execution.',
    body: 'Fifteen years of custom builds. Zero templates.', // [DRAFT]
    copyStatus: { label: 'draft', headline: 'approved', body: 'draft' },
    holdWeight: 1.0,
    cameraHold: 'push-in',
  },
  {
    // SCENE 5 — Services · plate IWC_Concept_6.png
    id: 'scene-5',
    image: '/images/scenes/scene-5-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: 'center 30%' },
    gradient: 'radial-gradient(ellipse at center, rgba(5,6,9,.55), transparent 68%), linear-gradient(135deg, rgba(8,9,12,.6), rgba(8,9,12,.1) 60%)',
    copyLayout: 'center', // Aaron 2026-06-11: centered on the monitor screen
    label: 'The Process', // [DRAFT]
    headline: ['Built With', 'Intention'], // [DRAFT]
    goldLine: 1,
    goldText: 'Intention',
    body: 'Every project is planned, coded, refined, and built with intention.', // [APPROVED]
    copyStatus: { label: 'draft', headline: 'draft', body: 'approved' },
    services: [
      // [APPROVED list]
      'Website Design',
      'Branding',
      'SEO Setup',
      'Business Email',
      'Hosting',
      'Maintenance',
      'AI Integration',
    ],
    holdWeight: 1.5,
    cameraHold: 'none',
  },
  {
    // SCENE 6 — Built for Growth · plate IWC_Concept_7.png
    id: 'scene-6',
    image: '/images/scenes/scene-6-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: 'center 40%' },
    gradient:
      'linear-gradient(to bottom, rgba(8,9,12,.84), rgba(8,9,12,.16) 46%, rgba(8,9,12,.75))',
    copyLayout: 'top-right',
    label: 'The Transformation', // [DRAFT]
    headline: ['Built for', 'Growth'], // [DRAFT]
    goldLine: 1,
    goldText: 'Growth',
    body: 'From idea to launch, we create digital foundations built for growth.', // [APPROVED]
    copyStatus: { label: 'draft', headline: 'draft', body: 'approved' },
    holdWeight: 1.0,
    cameraHold: 'zoom-out',
  },
  {
    // SCENE 7 — Final CTA · plate IWC_Concept_8.png
    id: 'scene-7',
    image: '/images/scenes/scene-7-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: 'center 55%' },
    gradient:
      'radial-gradient(ellipse at center, rgba(5,6,9,.5), transparent 70%), linear-gradient(to top, rgba(8,9,12,.97), rgba(8,9,12,.35) 55%, transparent)',
    copyLayout: 'center',
    label: "The Lowcountry's Digital Agency · Beaufort, SC · Since 2010", // [DRAFT]
    headline: ['More Than a Website.', 'A Digital Presence.'], // [DRAFT]
    goldLine: 1,
    goldText: 'Digital Presence.',
    body: 'Your business deserves more than a website. It deserves a digital presence.', // [APPROVED]
    copyStatus: { label: 'draft', headline: 'draft', body: 'approved' },
    ctas: [
      {
        text: 'Claim Your June Website Offer', // [APPROVED]
        href: '/contact',
        variant: 'primary',
        analyticsId: 'june_offer',
      },
      {
        text: 'Book a Free Consultation', // [APPROVED]
        href: '/contact',
        variant: 'ghost',
        analyticsId: 'consultation',
      },
    ],
    holdWeight: 1.4,
    cameraHold: 'float',
  },
]

/** typewriter string for the T5 black beat (canon) */
export const BLACK_BEAT_TEXT = 'initializing_greatness.exe'
