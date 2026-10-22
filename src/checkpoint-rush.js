// Pure, bounded checkpoint rules. The renderer only visualizes these authored gates.
const EXCLUDED = new Set(['gap', 'launch', 'tunnel', 'boost-tunnel', 'shortcut']);
const LANES = [-2.5, 2.5, 7.5, -7.5];

export function createCheckpointRush(track) {
  if (!track || !Number.isFinite(track.length) || track.length < 800 || !Array.isArray(track.sections))
    throw new RangeError('Invalid checkpoint track');
  const gates = [];
  for (let distance = 330; distance < track.length - 180; distance += 450) {
    if (track.sections.some(section => EXCLUDED.has(section.type) &&
      distance >= section.from - 70 && distance <= section.to + 70)) continue;
    const index = gates.length;
    gates.push({ distance, x: LANES[index % LANES.length], altitude: index % 3 === 2 ? 3 : 0,
      passed: false, missed: false });
  }
  return { gates, timeLeft: 28, passed: 0, missed: 0, expired: false };
}

export function stepCheckpointRush(state, previousDistance, car, dt) {
  if (state.expired || !Number.isFinite(dt) || dt <= 0 || dt > 0.1 ||
      !Number.isFinite(previousDistance) || !Number.isFinite(car?.distance) ||
      !Number.isFinite(car?.x) || !Number.isFinite(car?.altitude)) return 0;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  let bonus = 0;
  for (const gate of state.gates) {
    if (gate.distance > car.distance) break;
    if (gate.distance <= previousDistance || gate.passed || gate.missed) continue;
    if (Math.abs(car.x - gate.x) <= 3 && Math.abs(car.altitude - gate.altitude) <= 3) {
      gate.passed = true;
      state.passed++;
      bonus += 250;
      state.timeLeft = Math.min(60, state.timeLeft + 10);
    } else { gate.missed = true; state.missed++; }
  }
  state.expired = state.timeLeft <= 0;
  return bonus;
}
