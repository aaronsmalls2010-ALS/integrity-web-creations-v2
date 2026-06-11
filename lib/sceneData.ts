/**
 * SINGLE SOURCE OF TRUTH for all cinematic copy — canon: Storyboard.png + build brief v3.
 *
 * Copy status (canon rule):
 *  - 'approved' strings ship VERBATIM. Do not alter.
 *  - 'draft' strings ship as written but are flagged for Aaron's confirmation
 *    before launch (see OPEN QUESTIONS in the brief).
 *
 * Asset note: source files arrived as IWC_Concept_N.png (N = scene number) in
 * /Storyboard — contents verified 1:1 against the brief's 10000106xx.png
 * descriptions and against each Storyboard.png frame before wiring.
 */

export interface SceneCta {
  text: string
  href: string
  variant: 'primary' | 'ghost'
  /** when set, the CTA scrubs to a master-timeline label instead of navigating */
  scrollLabel?: string
  analyticsId: 'start_project' | 'june_offer' | 'consultation'
}

export interface SceneConfig {
  id: string
  image: string
  objectPosition: { desktop: string; mobile: string }
  gradient: string
  copyLayout: 'bottom-left' | 'top-right' | 'center'
  label: string
  headline: string[]
  /** index into `headline` of the line containing the gold accent */
  goldLine: number
  /** exact substring of headline[goldLine] rendered italic gold */
  goldText: string
  body: string
  copyStatus: Record<'label' | 'headline' | 'body', 'approved' | 'draft'>
  services?: string[]
  ctas?: SceneCta[]
  holdWeight: number
  cameraHold: 'push-in' | 'drift-left' | 'zoom-out' | 'float' | 'none'
}

export const SCENES: SceneConfig[] = [
  {
    // SCENE 1 — OPEN: Logo Reveal · source IWC_Concept_1.png
    id: 'scene-1',
    image: '/images/scenes/scene-1-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: 'center 45%' },
    gradient: 'linear-gradient(160deg, rgba(5,8,20,.3), rgba(5,8,20,.85))',
    copyLayout: 'center',
    label: 'Engineered by Design · Est. 2010', // [DRAFT]
    headline: ['Integrity', 'Web Creations'], // [APPROVED]
    goldLine: 1,
    goldText: 'Web',
    body: 'Design. Function. Integrity.', // [APPROVED]
    copyStatus: { label: 'draft', headline: 'approved', body: 'approved' },
    ctas: [
      {
        text: 'Start Your Project', // [APPROVED]
        href: '/contact',
        variant: 'primary',
        scrollLabel: 'scene7',
        analyticsId: 'start_project',
      },
    ],
    holdWeight: 1.0,
    cameraHold: 'push-in',
  },
  {
    // SCENE 2 — Brand Promise (LOOP LANDING) · source IWC_Concept_2.png
    id: 'scene-2',
    image: '/images/scenes/scene-2-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: '62% center' }, // keep grille
    gradient:
      'linear-gradient(to top, rgba(8,9,12,.92), rgba(8,9,12,.1) 55%, transparent)',
    copyLayout: 'bottom-left',
    label: 'The Brand Promise', // [DRAFT]
    headline: ['Premium From', 'Day One'], // [DRAFT]
    goldLine: 1,
    goldText: 'Day One',
    body: 'Engineered for businesses that want to look established, trusted, and premium from day one.', // [APPROVED]
    copyStatus: { label: 'draft', headline: 'draft', body: 'approved' },
    holdWeight: 1.0,
    cameraHold: 'drift-left',
  },
  {
    // SCENE 3 — Designed to Convert · source IWC_Concept_3.png
    id: 'scene-3',
    image: '/images/scenes/scene-3-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: '40% center' },
    gradient:
      'linear-gradient(to right, rgba(8,9,12,.9), rgba(8,9,12,.2) 60%, transparent)',
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
    // SCENE 4 — The Expert · source IWC_Concept_4.png
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
    // SCENE 5 — Services · source IWC_Concept_5.png
    id: 'scene-5',
    image: '/images/scenes/scene-5-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: 'center 30%' },
    gradient: 'linear-gradient(135deg, rgba(8,9,12,.85), rgba(8,9,12,.1) 60%)',
    copyLayout: 'bottom-left',
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
    // SCENE 6 — Built for Growth · source IWC_Concept_6.png
    id: 'scene-6',
    image: '/images/scenes/scene-6-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: 'center 40%' },
    gradient:
      'linear-gradient(to bottom, rgba(8,9,12,.7), rgba(8,9,12,.1) 40%, rgba(8,9,12,.75))',
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
    // SCENE 7 — Final CTA · source IWC_Concept_7.png
    id: 'scene-7',
    image: '/images/scenes/scene-7-desktop.webp',
    objectPosition: { desktop: 'center center', mobile: 'center 55%' },
    gradient:
      'linear-gradient(to top, rgba(8,9,12,.97), rgba(8,9,12,.35) 55%, transparent)',
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
