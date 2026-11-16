// When the mini-boost start cue (mini-boost-streaks.js) plays. Every source records `car.miniBoostEvent`
// through `grantMiniBoost` (drive-rules.ts); the cue plays once per boost, never once per refresh.
export const MINI_BOOST_STREAK_LIFE = 0.8; // s, one play

export interface MiniBoostEvent { time: number; tier: number }
export interface MiniBoostCar { miniBoost: number; miniBoostEvent?: MiniBoostEvent | null; braking?: boolean }
export interface MiniBoostCue { event: MiniBoostEvent | null; boost: number; age: number; tier: number }

export const createMiniBoostCue = (): MiniBoostCue => ({ event: null, boost: 0, age: Infinity, tier: 0 });

/** Advances the cue by `dt`; true when a play starts this frame. A new event starts one when the boost was empty or
 * the last play is over, so chained slipstream rings (`Math.max` refreshes) never restart a running play. Braking
 * cancels a mini-boost (game.js), so it never starts one. `armed`: the player is racing. */
export function stepMiniBoostCue(cue: MiniBoostCue, car: MiniBoostCar, dt: number, armed: boolean): boolean {
  const event = car.miniBoostEvent ?? null;
  const start = armed && event !== null && event !== cue.event && !car.braking &&
    (cue.boost <= 0 || cue.age + dt >= MINI_BOOST_STREAK_LIFE);
  cue.event = event;
  cue.boost = car.miniBoost;
  if (start && event) { cue.age = 0; cue.tier = event.tier; }
  cue.age += dt; // the source fired during the step just run: the play shows this frame
  return start;
}
