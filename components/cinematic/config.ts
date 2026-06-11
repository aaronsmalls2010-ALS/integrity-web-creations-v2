/**
 * TUNING KNOBS — the only feel adjustments permitted without sign-off:
 *   SMOOTH: 1.2–1.8 (default 1.5) · SCRUB: 0.8–1.5 (default 1.2)
 *   UNIT:   90–130 desktop / 55–85 mobile (defaults 115 / 70)
 * Weights, easings, travel percentages = locked choreography.
 */
export const SMOOTH = 1.5
export const SCRUB = 1.2
// Aaron (2026-06-11): "way too much scrolling between transitions" — cut to
// roughly half the brief's defaults (115/70), below its 90/55 floor by
// explicit client direction.
export const UNIT_DESKTOP = 60 // svh per weight unit
export const UNIT_MOBILE = 45
export const TRAVEL_DESKTOP = 1.0 // multiplies ALL transition xPercent/yPercent
export const TRAVEL_MOBILE = 0.6

export const MOBILE_BREAKPOINT = 768

/**
 * SEGMENT WEIGHT TABLE — client-tuned (Aaron 2026-06-11; supersedes the
 * brief's locked 13.0-unit table).
 *
 * Transition timelines keep their canon internal timings and are stretched
 * to T_SCALE× their weight via timeScale in the master builder ("all
 * transitions take 3x more scrolls"). Scene holds were widened so text
 * reveals get more scroll between elements.
 */
export const T_SCALE = 3 // every tN spans WEIGHTS.tN × T_SCALE scroll units

export const WEIGHTS = {
  scene1: 1.0, // logo at rest, gentle zoom-out begins — LOOP LANDING
  t1: 0.6, //    zoom out, then pan down (spans 1.8 scaled)
  scene2: 1.8, // car — headline/body/columns/strap spread across the hold
  t2: 0.7, //    pan right — the one horizontal move (2.1 scaled)
  scene3: 1.4,
  t3: 0.6, //    rise (1.8 scaled)
  scene4: 1.4,
  t4: 0.6, //    zoom in (≈1.9 scaled)
  scene5: 2.0, // services stagger — longest content hold
  t5: 1.0, //    lift over — includes black beat (3.0 scaled)
  scene6: 1.4,
  t6: 0.7, //    glide out (2.1 scaled)
  scene7: 1.6, // CTA breathes fully before loop
  t7: 0.7, //    descend loop — water → landing (2.1 scaled)
  wrapZone: 0.2, // static; identical to scene1 rest; wrap fires here
} as const

/** total scroll units including transition scaling (≈25.6) */
export const TOTAL_WEIGHT =
  Object.entries(WEIGHTS).reduce(
    (a, [k, v]) => a + (k.startsWith('t') ? v * T_SCALE : v),
    0,
  )

export const SCENE_LABELS = [
  'scene1',
  'scene2',
  'scene3',
  'scene4',
  'scene5',
  'scene6',
  'scene7',
] as const
export type SceneLabel = (typeof SCENE_LABELS)[number]
