import { physicalGap } from './circuit-track.ts';
import { ROAD_LIMIT } from './game.js';
import { hazardX } from './hazards.ts';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Index of the first scenery part (sorted by `from`, each under 20 m deep) that can still reach distance d.
function firstProp(props, d) {
  let lo = 0, hi = props.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (props[mid].from < d - 20) lo = mid + 1; else hi = mid; }
  return lo;
}

// Car body against scenery parts (sorted by distance); the swept range catches thin parts at high speed.
export function hitProp(props, car, previousDistance) {
  const altitude = car.altitude || 0;
  for (let i = firstProp(props, previousDistance - 2.2); i < props.length; i++) {
    const p = props[i];
    if (p.from > car.distance + 2.2) break;
    if (p.to > previousDistance - 2.2 && p.right > car.x - 0.85 && p.left < car.x + 0.85 &&
      p.top > altitude && p.bottom < altitude + 1.8) return p;
  }
  return null;
}
// A solid prop cannot be driven through: step out to its open-road side (it never reaches past ROAD_CLEARANCE).
export const clearOf = (prop, x) => prop.left > 0 ? Math.min(x, prop.left - 1.1) : Math.max(x, prop.right + 1.1);

// Rivals and traffic steer around solid scenery, gauntlet barriers and slower cars ahead instead of driving
// through them: they keep their own lane while it is clear, else take the nearest free line beside the obstacle.
// Scenery parts stay under 20 m deep (largest: a scaled train, ~9 m), which bounds the look-back.
const AI_LOOKAHEAD = 80, LANE_SHIFT = 6, AI_HALF_WIDTH = 0.85, AI_MARGIN = 1.4; // m ahead, m/s sideways, m, m
export const BARRIER_HALF_WIDTH = 1.55, BARRIER_HEIGHT = 2.5; // drawn gauntlet barrier: 3.1 x 2.5 m
export const TRAFFIC_ACCEL = 5; // m/s² a knocked traffic car regains toward its cruise speed
const blockers = []; // reused every call: no per-frame allocation on this hot path
function laneFree(x) {
  if (Math.abs(x) > ROAD_LIMIT) return false;
  for (let i = 0; i < blockers.length; i += 2) if (x + AI_HALF_WIDTH > blockers[i] && x - AI_HALF_WIDTH < blockers[i + 1]) return false;
  return true;
}
// A car alongside, or one ahead this car closes on within ~3 s, blocks its own width.
function carBlocker(race, d, altitude, pace, car, carPace) {
  const gap = physicalGap(race.trackId, d, car.distance);
  if (gap > -4.4 && gap < Math.min(AI_LOOKAHEAD, 4.4 + (pace - carPace) * 3) && Math.abs((car.altitude || 0) - altitude) < 1.8) {
    blockers.push(car.x - AI_HALF_WIDTH, car.x + AI_HALF_WIDTH);
  }
}
export function avoidObstacles(race, other, pace, dt) {
  const { props, hazards } = race, d = other.distance, altitude = other.altitude || 0;
  blockers.length = 0;
  for (const car of race.traffic) if (car !== other) carBlocker(race, d, altitude, pace, car, car.speed);
  for (const car of race.rivals) if (car !== other) carBlocker(race, d, altitude, pace, car, car.pace ?? car.speed);
  carBlocker(race, d, altitude, pace, race.player, race.player.speed);
  for (let i = firstProp(props, d); i < props.length && props[i].from < d + AI_LOOKAHEAD; i++) {
    const p = props[i];
    if (p.to > d - 2.2 && p.top > altitude && p.bottom < altitude + 1.8) blockers.push(p.left, p.right);
  }
  if (altitude < BARRIER_HEIGHT) for (const h of hazards) {
    if (h.distance > d + AI_LOOKAHEAD) break;
    if (h.distance < d - 2.2) continue;
    const reach = (h.halfWidth ?? BARRIER_HALF_WIDTH) + (h.moving ? 1.8 : 0); // a moving barrier blocks its whole sweep
    blockers.push(h.x - reach, h.x + reach);
  }
  let target = other.homeX ?? other.x;
  if (!laneFree(target)) {
    target = other.x; // nowhere free: hold the line rather than swerve into something else
    let best = Infinity;
    for (let i = 0; i < blockers.length; i++) {
      const x = i % 2 ? blockers[i] + AI_MARGIN : blockers[i] - AI_MARGIN;
      if (Math.abs(x - other.x) < best && laneFree(x)) { best = Math.abs(x - other.x); target = x; }
    }
  }
  other.x += clamp(target - other.x, -LANE_SHIFT * dt, LANE_SHIFT * dt);
}

// The one collision response every car shares (player, rivals, traffic): speed loss, a sideways knock, a short grace.
export function knock(race, car, side, intensity, retention) {
  const retainedSpeed = race.config.collision === 'relaxed' ? Math.max(retention, 0.8) : retention;
  const speedLost = car.speed * (1 - retainedSpeed);
  car.speed *= retainedSpeed;
  car.x = clamp(car.x + side * (0.4 + intensity * 0.6), -ROAD_LIMIT, ROAD_LIMIT);
  car.cooldown = 1.5;
  return speedLost;
}

// Rivals and traffic take the player's hits, with the same boxes, when avoidance cannot save them.
export const aiRetention = other => other.nitroTime > 0 ? 0.7 : 0.45;
export function aiImpacts(race, other, before, pace) {
  if (other.cooldown > 0) return;
  const prop = hitProp(race.props, other, before);
  if (prop) {
    knock(race, other, Math.sign(other.x - (prop.left + prop.right) / 2) || -1, clamp(pace / 100, 0.25, 1), aiRetention(other));
    other.x = clearOf(prop, other.x);
    return;
  }
  if ((other.altitude || 0) >= 2.4) return;
  for (const hazard of race.hazards) {
    if (hazard.distance > other.distance) break;
    if (hazard.distance <= before) continue;
    const obstacleX = hazardX(hazard, race.elapsed);
    if (Math.abs(other.x - obstacleX) < (hazard.halfWidth ?? BARRIER_HALF_WIDTH) + .25 && (other.altitude || 0) < (hazard.height ?? BARRIER_HEIGHT) - .1) return void knock(race, other, Math.sign(other.x - obstacleX) || -1, 0.7, 0.6);
  }
}
export function bumpCars(race, a, b) {
  if ((a.cooldown > 0 && b.cooldown > 0) || Math.abs(physicalGap(race.trackId, a.distance, b.distance)) >= 4.4 || Math.abs(a.x - b.x) >= 1.7 ||
    Math.abs((a.altitude || 0) - (b.altitude || 0)) >= 1.8) return;
  const side = Math.sign(a.x - b.x) || -1, intensity = clamp(Math.abs(a.speed - b.speed) / 70, 0.25, 1);
  if (!(a.cooldown > 0)) knock(race, a, side, intensity, aiRetention(a));
  if (!(b.cooldown > 0)) knock(race, b, -side, intensity, aiRetention(b));
}

