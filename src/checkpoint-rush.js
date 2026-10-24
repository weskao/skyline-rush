// Pure, bounded checkpoint rules. The renderer only visualizes these authored gates.
const EXCLUDED = new Set(['gap', 'launch', 'tunnel', 'boost-tunnel', 'shortcut']);
const LANES = [-2.5, 2.5, 7.5, -7.5];

export function createCheckpointRush(track, obstacles = []) {
  if (!track || !Number.isFinite(track.length) || track.length < 800 || track.length > 100000 ||
      !Array.isArray(track.sections) || track.sections.length > 200 ||
      !track.sections.every(section => Number.isFinite(section.from) && Number.isFinite(section.to) &&
        section.from >= 0 && section.from < section.to && section.to <= track.length))
    throw new RangeError('Invalid checkpoint track');
  if (!Array.isArray(obstacles) || obstacles.length > 2000 || !obstacles.every(o =>
    o && [o.from, o.to, o.left, o.right, o.bottom, o.top].every(Number.isFinite) &&
    o.from < o.to && o.left < o.right && o.bottom < o.top))
    throw new RangeError('Invalid checkpoint obstacle bounds');
  const gates = [];
  for (let distance = 330; distance < track.length - 180; distance += 450) {
    if (track.sections.some(section => EXCLUDED.has(section.type) &&
      distance >= section.from - 70 && distance <= section.to + 70)) continue;
    const index = gates.length;
    const altitude = index % 3 === 2 ? 3 : 0;
    // Keep each gate on the real road; shift lanes before discarding a blocked checkpoint.
    // The footprint includes its 6.4 m-wide frame, not just the car's centre.
    const preferred = index % LANES.length;
    const x = [...LANES.slice(preferred), ...LANES.slice(0, preferred)].find(lane =>
      obstacles.every(o => distance < o.from - 4 || distance > o.to + 4 ||
        lane + 3.2 < o.left || lane - 3.2 > o.right ||
        altitude > o.top + 1 || altitude + 4.8 < o.bottom));
    if (x === undefined) continue;
    gates.push({ distance, x, altitude, passed: false, missed: false });
  }
  return { gates, timeLeft: 28, passed: 0, missed: 0, perfect: 0, expired: false };
}

export function checkpointDirection(car, gate) {
  if (!car || !gate) return 'center';
  if (gate.x < car.x - 1) return 'left';
  if (gate.x > car.x + 1) return 'right';
  if (gate.altitude > car.altitude + 1) return 'up';
  if (gate.altitude < car.altitude - 1) return 'down';
  return 'center';
}

export function stepCheckpointRush(state, previousDistance, car, dt) {
  if (state.expired || !Number.isFinite(dt) || dt <= 0 || dt > 0.1 ||
      !Number.isFinite(previousDistance) || !Number.isFinite(car?.distance) ||
      !Number.isFinite(car?.x) || !Number.isFinite(car?.altitude)) return 0;
  if (!Number.isFinite(state.timeLeft) || state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.expired = true;
    return 0;
  }
  let remaining = state.timeLeft;
  let lastFraction = 0;
  let bonus = 0;
  const distanceTraveled = car.distance - previousDistance;
  for (const gate of state.gates) {
    if (gate.distance > car.distance) break;
    if (gate.distance <= previousDistance || gate.passed || gate.missed) continue;
    // Spend time at the actual crossing, not the frame's end.
    const fraction = distanceTraveled > 0 ? (gate.distance - previousDistance) / distanceTraveled : 1;
    remaining = Math.max(0, remaining - dt * (fraction - lastFraction));
    lastFraction = fraction;
    if (remaining <= 0) {
      state.timeLeft = 0;
      state.expired = true;
      return bonus;
    }
    if (Math.abs(car.x - gate.x) <= 3 && Math.abs(car.altitude - gate.altitude) <= 3) {
      gate.passed = true;
      state.passed++;
      const perfect = Math.abs(car.x - gate.x) <= 0.8 && Math.abs(car.altitude - gate.altitude) <= 0.8;
      if (perfect) state.perfect++;
      bonus += perfect ? 400 : 250;
      remaining = Math.min(60, remaining + 10);
    } else { gate.missed = true; state.missed++; }
  }
  state.timeLeft = Math.max(0, remaining - dt * (1 - lastFraction));
  state.expired = state.timeLeft <= 0;
  return bonus;
}
