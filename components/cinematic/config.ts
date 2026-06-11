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
 * SEGMENT WEIGHT TABLE — exact (locked).
 * Total 13.0 units → PIN_DISTANCE = 13.0 × UNIT svh
 * (≈1495svh desktop · ≈910svh mobile).
 */
export const WEIGHTS = {
  scene1: 1.0, // logo push-in — LOOP LANDING (copy revealed by intro / re-staggered by T7)
  t1: 0.6, //    pan down
  scene2: 1.0,
  t2: 0.7, //    pan right — the one horizontal move
  scene3: 1.0,
  t3: 0.6, //    rise
  scene4: 1.0,
  t4: 0.6, //    zoom in
  scene5: 1.5, // services stagger — longest content hold
  t5: 1.0, //    lift over — includes black beat
  scene6: 1.0,
  t6: 0.7, //    glide out
  scene7: 1.4, // CTA breathes fully before loop
  t7: 0.7, //    descend loop — water → landing
  wrapZone: 0.2, // static; identical to scene1 rest; wrap fires here
} as const

export const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0) // 13.0

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
