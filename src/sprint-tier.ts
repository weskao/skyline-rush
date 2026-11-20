/** The sprint ladder: one home for "how strong is this sprint", read by the HUD, the touch buttons, the camera,
 * the lens, the speed lines and the exhaust. A new tier is a new row here, never a branch in a consumer.
 * `level` orders the tiers. `share` is the screen-layer strength (FOV, blur, speed lines) before the NITRO chain lift.
 * Rule and owners: docs/designs/sprint-tiers/DESIGN.md. */
export const SPRINT_TIERS = {
  idle: { level: 0, share: 0 },
  boost: { level: 1, share: 0.8 },
  nitro: { level: 2, share: 1 },
  // NITRO with BOOST held: same top speed as NITRO, 12 m/s² more acceleration (drive-rules.ts).
  'nitro-boost': { level: 3, share: 1 },
} as const;
export type SprintTierId = keyof typeof SPRINT_TIERS;

/** The tier a car is in. `boost` is whatever the caller already treats as BOOST (held BOOST, or a mini-boost). */
export const sprintTier = (nitro: boolean, boost: boolean): SprintTierId =>
  nitro ? (boost ? 'nitro-boost' : 'nitro') : boost ? 'boost' : 'idle';
