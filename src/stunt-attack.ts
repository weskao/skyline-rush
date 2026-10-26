export interface StuntAttackState {
  combo: number; maxCombo: number; bonus: number; airTime: number; lastEvent: number;
  nearMisses: number; rings: number; collisions: number; falls: number;
  lastDrift: number; lastTrick: number;
}
export interface StuntCar {
  speed: number;
  altitude: number;
  nearMisses?: number;
  rings?: number;
  collisions?: number;
  falls?: number;
  driftPayout?: { time: number } | null;
  trickPayout?: { time: number; hard?: boolean } | null;
}
// A small, frame-rate-neutral score overlay on the existing stunt physics.
export const createStuntAttack = (): StuntAttackState => ({
  combo: 0, maxCombo: 0, bonus: 0, airTime: 0, lastEvent: 0,
  nearMisses: 0, rings: 0, collisions: 0, falls: 0, lastDrift: -1, lastTrick: -1,
});

export function scoreStuntAttack(state: StuntAttackState, car: StuntCar | null | undefined, earned: number, dt: number, elapsed: number): number {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1 || !Number.isFinite(elapsed) || !car) return 0;
  if (car.speed >= 18 && car.altitude > 0.25) state.airTime += dt;
  const crash = (car.collisions || 0) > state.collisions || (car.falls || 0) > state.falls;
  state.collisions = car.collisions || 0;
  state.falls = car.falls || 0;
  if (crash || elapsed - state.lastEvent > 6) state.combo = 0;
  let actions = Math.max(0, (car.nearMisses || 0) - state.nearMisses) + Math.max(0, (car.rings || 0) - state.rings);
  state.nearMisses = car.nearMisses || 0;
  state.rings = car.rings || 0;
  if (car.driftPayout && car.driftPayout.time > state.lastDrift) {
    state.lastDrift = car.driftPayout.time;
    actions++;
  }
  let cleanLanding = false;
  if (car.trickPayout && car.trickPayout.time > state.lastTrick) {
    state.lastTrick = car.trickPayout.time;
    actions++;
    cleanLanding = !car.trickPayout.hard;
  }
  if (!crash && actions && car.speed >= 10) {
    state.combo = Math.min(5, state.combo + actions);
    state.lastEvent = elapsed;
  }
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  const bonus = (Math.max(0, Number.isFinite(earned) ? earned : 0) * state.combo / 5) + (cleanLanding && !crash ? 200 * state.combo : 0);
  state.bonus += bonus;
  return bonus;
}

/** Local Stunt medals scale with the selected driving duration; never Career medals. */
export function stuntMedal(score: number, duration: number = 120): 'gold' | 'silver' | 'bronze' | null {
  if (!Number.isFinite(score) || score < 0 || ![120, 180, 300].includes(duration)) return null;
  const normalized = score * 120 / duration;
  return normalized >= 8000 ? 'gold' : normalized >= 4000 ? 'silver' : normalized >= 1500 ? 'bronze' : null;
}
