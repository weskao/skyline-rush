// A small, frame-rate-neutral score overlay on the existing stunt physics.
export const createStuntAttack = () => ({
  combo: 0, maxCombo: 0, bonus: 0, airTime: 0, lastEvent: 0,
  nearMisses: 0, rings: 0, collisions: 0, falls: 0, lastDrift: -1, lastTrick: -1,
});

export function scoreStuntAttack(state, car, earned, dt, elapsed) {
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
