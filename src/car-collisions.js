import { carGap, courseHazardBlockers } from './course-race-step.ts';
import { ROAD_LIMIT } from './game.js';
import { hazardReach, hazardTouch, nudge } from './hazard-race.ts';
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
const AI_LOOK_TIME = 1.5; // s: a fast car (a rival on NITRO) looks this far ahead when it outruns AI_LOOKAHEAD
const BARRIER_HEIGHT = 2.5; // drawn gauntlet barrier height (width in hazard-race.ts)
export const TRAFFIC_ACCEL = 5; // m/s² a knocked traffic car regains toward its cruise speed
const blockers = []; // reused every call: no per-frame allocation on this hot path
function laneFree(x) {
  if (Math.abs(x) > ROAD_LIMIT) return false;
  for (let i = 0; i < blockers.length; i += 2) if (x + AI_HALF_WIDTH > blockers[i] && x - AI_HALF_WIDTH < blockers[i + 1]) return false;
  return true;
}
// A car alongside, or one ahead this car closes on within ~3 s, blocks its own width.
function carBlocker(race, other, altitude, pace, car, carPace, look) {
  const gap = carGap(race, other, car) ?? -Infinity; // cars on different graph branches never block
  if (gap > -4.4 && gap < Math.min(look, 4.4 + (pace - carPace) * 3) && Math.abs((car.altitude || 0) - altitude) < 1.8) {
    blockers.push(car.x - AI_HALF_WIDTH, car.x + AI_HALF_WIDTH);
  }
}
export function avoidObstacles(race, other, pace, dt) {
  const { props, hazards } = race, d = other.distance, altitude = other.altitude || 0, look = Math.max(AI_LOOKAHEAD, pace * AI_LOOK_TIME);
  blockers.length = 0;
  for (const car of race.traffic) if (car !== other) carBlocker(race, other, altitude, pace, car, car.speed, look);
  for (const car of race.rivals) if (car !== other) carBlocker(race, other, altitude, pace, car, car.pace ?? car.speed, look);
  carBlocker(race, other, altitude, pace, race.player, race.player.speed, look);
  for (let i = firstProp(props, d); i < props.length && props[i].from < d + look; i++) {
    const p = props[i];
    if (p.to > d - 2.2 && p.top > altitude && p.bottom < altitude + 1.8) blockers.push(p.left, p.right);
  }
  if (altitude < BARRIER_HEIGHT) for (const h of hazards) {
    if (h.distance > d + look) break;
    if (h.distance < d - 2.2) continue;
    const reach = hazardReach(h); // covers a moving hazard's whole sweep; 0 = a trigger, never steered around
    if (reach) blockers.push(h.x - reach, h.x + reach);
  }
  if (race.course && altitude < BARRIER_HEIGHT) courseHazardBlockers(race, other, blockers); // graph hazards: steer to the safe side
  let target = other.seekX ?? other.homeX ?? other.x; // seekX: a rival's item lane (rival-items.ts), only while free
  if (!laneFree(target)) {
    target = other.x; // nowhere free: hold the line rather than swerve into something else
    let best = Infinity;
    for (let i = 0; i < blockers.length; i++) {
      const x = i % 2 ? blockers[i] + AI_MARGIN : blockers[i] - AI_MARGIN;
      if (Math.abs(x - other.x) < best && laneFree(x)) { best = Math.abs(x - other.x); target = x; }
    }
  }
  const shift = other.laneShift ?? LANE_SHIFT; // a rival's skill (rival-driver.ts), never past the player's 9 m/s
  other.x += clamp(target - other.x, -shift * dt, shift * dt);
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
    const { effect, x: obstacleX } = hazardTouch(hazard, other, race.elapsed);
    if (effect === 'block') return void knock(race, other, Math.sign(other.x - obstacleX) || -1, 0.7, 0.6);
    nudge(other, effect, hazard); // gusts and rough terrain treat every car alike
  }
}
export function bumpCars(race, a, b) {
  if ((a.cooldown > 0 && b.cooldown > 0) || Math.abs(carGap(race, a, b) ?? Infinity) >= 4.4 || Math.abs(a.x - b.x) >= 1.7 ||
    Math.abs((a.altitude || 0) - (b.altitude || 0)) >= 1.8) return;
  const side = Math.sign(a.x - b.x) || -1, intensity = clamp(Math.abs(a.speed - b.speed) / 70, 0.25, 1);
  if (!(a.cooldown > 0)) knock(race, a, side, intensity, aiRetention(a));
  if (!(b.cooldown > 0)) knock(race, b, -side, intensity, aiRetention(b));
}

