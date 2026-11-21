/** The sprint ladder: one home for "how strong is this sprint", read by the HUD, the touch buttons, the camera,
 * the lens, the speed lines and the exhaust. A new tier is a new row here, never a branch in a consumer.
 * `level` orders the tiers. Screen-layer strengths, before the NITRO chain lift (`createSprintVfx`):
 * - `share` (0 to 1): camera FOV, the landscape re-aim and the light (exhaust strength, bloom, airflow opacity).
 *   NITRO with BOOST held keeps NITRO's top speed, so it keeps NITRO's share: no second FOV jump, no more light.
 * - `blur`: the held lens radial blur. `lines`: airflow speed-line density and travel speed.
 * - `punch`: the ignition FOV overshoot and its blur flash, capped at a x3 NITRO punch (the camera guards' limit).
 * Rule and owners: docs/designs/sprint-tiers/DESIGN.md. Numbers: docs/designs/sprint-tiers/evidence-screen.md. */
export const SPRINT_TIERS = {
  idle: { level: 0, share: 0, blur: 0, lines: 0, punch: 0 },
  boost: { level: 1, share: 0.8, blur: 0.8, lines: 0.8, punch: 0.8 },
  nitro: { level: 2, share: 1, blur: 1, lines: 1.3, punch: 1.2 },
  // NITRO with BOOST held: same top speed as NITRO, 12 m/s² more acceleration (drive-rules.ts).
  'nitro-boost': { level: 3, share: 1, blur: 1.3, lines: 1.6, punch: 1.4 },
} as const;
export type SprintTierId = keyof typeof SPRINT_TIERS;
export type SprintCue = 'share' | 'blur' | 'lines' | 'punch';

/** The tier a car is in. `boost` is whatever the caller already treats as BOOST (held BOOST, or a mini-boost). */
export const sprintTier = (nitro: boolean, boost: boolean): SprintTierId =>
  nitro ? (boost ? 'nitro-boost' : 'nitro') : boost ? 'boost' : 'idle';

/** One cue from the NITRO and BOOST channel intensities (0 to 1): each tier weighted by how fully it is on. */
export const sprintCue = (nitro: number, boost: number, cue: SprintCue): number => Math.max(
  nitro * SPRINT_TIERS.nitro[cue], boost * SPRINT_TIERS.boost[cue], Math.min(nitro, boost) * SPRINT_TIERS['nitro-boost'][cue]);
