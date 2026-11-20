import { aiRetention, clearOf, hitProp, knock, knockX, propTouches } from './car-collisions.js';
import { carGap, syncCourseContact } from './course-race-step.ts';
import { FINISH_IMPACT_RETENTION, isParkedRival, pushFinishedRival } from './finished-rival.js';
import { recoveryRetention } from './bonus-gates.ts';
import { ROAD_LIMIT, SCRAPE_RATIO, shortcutPylons } from './game.js';
import { SHORTCUT_TOLERANCE } from './road-falls.ts';
import { bodiesShareHeight, vehicleContactSize } from './vehicle-contact-size.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const SIDE_CLEARANCE = 0.01, FOLLOW_CLEARANCE = 0.03, RELEASE_CLEARANCE = 0.12;
const PYLON_HALF_WIDTH = 1.2;
const overlapsLength = (gap, a, b) => gap !== null && gap < a.front + b.rear && gap > -(a.rear + b.front);

function overlappingCars(race, car, other) {
  const a = vehicleContactSize(race, car), b = vehicleContactSize(race, other);
  return Math.abs(car.x - other.x) < a.halfWidth + b.halfWidth && bodiesShareHeight(car, other) &&
    overlapsLength(carGap(race, car, other), a, b);
}

// Only overlaps present when the timer ends may finish passing through. Scenery
// parts are identified by bounds because Endless can regenerate the same chunk.
const phaseExits = new WeakMap();
const samePart = (a, b) => a === b || a.from === b.from && a.to === b.to && a.left === b.left &&
  a.right === b.right && a.bottom === b.bottom && a.top === b.top;

export function trackPhaseExit(race, dt) {
  const car = race.player;
  if (car.effects.ghost > dt) { phaseExits.delete(car); return; }
  if (car.effects.ghost > 0) {
    const cars = new Set([...race.traffic, ...race.rivals].filter(other => overlappingCars(race, car, other)));
    const props = race.props.filter(prop => propTouches(prop, car, car.distance));
    if (cars.size || props.length) phaseExits.set(car, { cars, props });
    return;
  }
  const exit = phaseExits.get(car);
  if (!exit) return;
  for (const other of exit.cars) if (!overlappingCars(race, car, other)) exit.cars.delete(other);
  exit.props = exit.props.filter(prop => propTouches(prop, car, car.distance));
  if (!exit.cars.size && !exit.props.length) phaseExits.delete(car);
}

export function contact(race, kind, obstacleX, intensity, retention, sideways = true) {
  const car = race.player;
  if (car.cooldown > 0) return false;
  if (car.effects.shield > 0) {
    car.effects.shield = 0;
    car.shieldBlock = { x: car.x, altitude: car.altitude, distance: car.distance, time: race.elapsed };
    car.cooldown = 1;
    return true;
  }
  const side = Math.sign(car.x - obstacleX) || -1, x = car.x;
  const speedLost = knock(race, car, sideways ? side : 0, intensity, recoveryRetention(car, retention));
  car.impact = { kind, intensity, side, speedLost, x, altitude: car.altitude, distance: car.distance, time: race.elapsed };
  car.collisions++;
  car.combo = 0;
  car.drift = null;
  car.trick = null;
  return true;
}

const following = new WeakMap();
export function clearRecoveryContacts(car) {
  following.delete(car);
  vehicleContacts.delete(car);
}
export const isFollowingVehicle = car => following.has(car);
const vehicleContacts = new WeakMap();
const paceOf = other => other.pace ?? other.speed;

function spaceFree(race, car, body, x, partner, opponents, exit) {
  if (Math.abs(x) > ROAD_LIMIT) return false;
  for (const other of opponents) {
    if (other === car || other === partner || (car === race.player && exit?.cars.has(other))) continue;
    const otherBody = vehicleContactSize(race, other);
    if (Math.abs(x - other.x) < body.halfWidth + otherBody.halfWidth && bodiesShareHeight(car, other) &&
        overlapsLength(carGap(race, car, other), body, otherBody)) return false;
  }
  return !hitProp(race.props, { distance: car.distance, altitude: car.altitude, x, body }, car.distance);
}

function separation(race, car, body, other, otherBody, side, intensity, fresh, opponents, exit) {
  // Test both resulting positions against the road and other cars before moving either car.
  let x = fresh && !(car.effects.shield > 0) ? knockX(car.x, side, intensity) : car.x;
  let ox = fresh && !(other.cooldown > 0) ? knockX(other.x, -side, intensity) : other.x;
  const half = (body.halfWidth + otherBody.halfWidth + SIDE_CLEARANCE) / 2;
  if (side * (x - ox) < 2 * half) {
    const centre = clamp((x + ox) / 2, -ROAD_LIMIT + half, ROAD_LIMIT - half);
    x = centre + side * half;
    ox = centre - side * half;
  }
  if (spaceFree(race, car, body, x, other, opponents, exit) && spaceFree(race, other, otherBody, ox, car, opponents)) return { x, ox };
  x = other.x + side * 2 * half;
  return spaceFree(race, car, body, x, other, opponents, exit) ? { x, ox: other.x } : null;
}

// A held rear bumper is one encounter. Steering still decides when to leave the lane.
function follow(race, other, gap, followGap, retention) {
  const car = race.player;
  if (following.get(car) !== other && !vehicleContacts.get(car)?.has(other)) contact(race, 'vehicle', other.x,
    clamp(Math.abs(car.speed - paceOf(other)) / 70, 0.25, 1), retention, false);
  following.set(car, other);
  car.speed = Math.min(car.speed, paceOf(other));
  car.distance += gap - followGap;
  if (race.course) syncCourseContact(race, car);
}

function resolveVehicles(race, previousDistance, previousX, retention, exit) {
  const car = race.player, body = vehicleContactSize(race, car);
  const leader = following.get(car);
  const opponents = [...race.traffic, ...race.rivals];
  let contacts = vehicleContacts.get(car);
  if (contacts) for (const other of contacts) {
    const gap = opponents.includes(other) ? carGap(race, car, other) : null;
    const size = vehicleContactSize(race, other);
    if (gap === null || gap > body.front + size.rear + FOLLOW_CLEARANCE + RELEASE_CLEARANCE ||
        gap < -(body.rear + size.front + RELEASE_CLEARANCE) ||
        Math.abs(car.x - other.x) > body.halfWidth + size.halfWidth + RELEASE_CLEARANCE ||
        !bodiesShareHeight(car, other)) contacts.delete(other);
  }
  if (leader) {
    const gap = !isParkedRival(leader) && opponents.includes(leader) && !exit?.cars.has(leader) ? carGap(race, car, leader) : null;
    const size = vehicleContactSize(race, leader), followGap = body.front + size.rear + FOLLOW_CLEARANCE;
    // A car put ahead of its leader (gap respawn) has left the queue: holding on dragged it back, a fall per frame.
    if (gap !== null && gap <= followGap + RELEASE_CLEARANCE && gap > -(body.rear + size.front) &&
        Math.abs(car.x - leader.x) < body.halfWidth + size.halfWidth && bodiesShareHeight(car, leader)) {
      if (gap < followGap) follow(race, leader, gap, followGap, retention);
    } else following.delete(car);
  }
  for (const other of opponents) {
    const size = vehicleContactSize(race, other), width = body.halfWidth + size.halfWidth;
    if (exit?.cars.has(other) || Math.abs(car.x - other.x) >= width || !bodiesShareHeight(car, other)) continue;
    if (isParkedRival(other)) {
      if (car.fall?.time !== race.elapsed) {
        const intensity = pushFinishedRival(race, car, other, previousDistance);
        if (intensity) contact(race, 'vehicle', other.x, intensity, FINISH_IMPACT_RETENTION, false);
      }
      continue;
    }
    const gap = carGap(race, car, other), front = body.front + size.rear, rear = body.rear + size.front;
    if (gap === null || gap >= front) continue;
    const previousGap = gap + car.distance - previousDistance;
    if (gap <= -rear) {
      if (previousGap >= front && car.fall?.time !== race.elapsed) follow(race, other, gap, front + FOLLOW_CLEARANCE, retention); // a respawn jump is not a sweep
      continue;
    }
    const lateralGap = Math.abs(car.x - other.x);
    const side = Math.sign(car.x - other.x) || -1;
    const intensity = clamp(Math.abs(car.speed - other.speed) / 70, 0.25, 1);
    // The outer hull can brush even where the original collision core was clear.
    // Blend the penalty by penetration so touching a fender feels like a scrape.
    const core = 1.7;
    const severity = clamp((width - lateralGap) / (width - core), 0, 1);
    const impactRetention = 1 - (1 - retention) * severity * severity;
    const fresh = car.cooldown === 0 && !contacts?.has(other);
    let positions = separation(race, car, body, other, size, side, intensity, fresh, opponents, exit) ??
      (Math.abs(car.x - other.x) < 0.5 ? separation(race, car, body, other, size, -side, intensity, fresh, opponents, exit) : null);
    const blockedSteer = !positions && Math.abs(previousX - other.x) + 1e-8 >= width &&
      spaceFree(race, car, body, previousX, other, opponents, exit);
    if (blockedSteer) positions = { x: previousX, ox: other.x };
    const flank = Math.abs(car.x - other.x) / width > Math.abs(gap) / (gap >= 0 ? front : rear);
    if (!positions && flank) {
      // In a tight pack split only the encroaching edge; a full shove can hit the
      // opposite flank. The candidate must still clear every other solid car.
      const x = other.x + side * (width + SIDE_CLEARANCE);
      if (spaceFree(race, car, body, x, other, opponents, exit)) positions = { x, ox: other.x };
    }
    if (!positions && previousGap > 0) {
      follow(race, other, gap, front + FOLLOW_CLEARANCE, retention);
      continue;
    }
    if (!positions) {
      // A faster car can reach an already boxed-in player from behind. Keep the
      // player out of the leader and put the trailing nose behind the rear bumper.
      other.distance += -rear - FOLLOW_CLEARANCE - gap;
      other.speed = Math.min(other.speed, car.speed);
      if (typeof other.pace === 'number') other.pace = Math.min(other.pace, car.speed);
      positions = { x: car.x, ox: other.x };
    }
    const movesSideways = !blockedSteer && (positions.x !== car.x || positions.ox !== other.x);
    if (fresh && contact(race, 'vehicle', other.x, intensity, impactRetention, movesSideways) && movesSideways && !(other.cooldown > 0)) {
      knock(race, other, -side, intensity, aiRetention(other));
    }
    if (!contacts) vehicleContacts.set(car, contacts = new Set());
    contacts.add(other);
    car.x = positions.x;
    other.x = positions.ox;
    if (race.course) syncCourseContact(race, other);
  }
}

function resolveRail(race, lateralPosition, intensity) {
  const car = race.player, side = Math.sign(lateralPosition);
  if (Math.abs(lateralPosition) <= ROAD_LIMIT || car.altitude >= 1.3 || car.speed <= 12 || car.railContactSide === side) return;
  if (Math.abs(car.steering) < 0.9 && Math.abs(car.steering * Math.min(9, car.speed * 0.22)) / car.speed < SCRAPE_RATIO) {
    car.x = side * (ROAD_LIMIT - 0.3);
    if (car.cooldown > 0 || car.scrapeCooldown > 0) return;
    car.speed *= 0.92;
    car.scrapeCooldown = 0.5;
    car.scrape = { side, x: car.x, time: race.elapsed };
  } else {
    contact(race, 'barrier', side * (ROAD_LIMIT + 1), intensity, 0.75);
    car.railContactSide = side;
  }
}

export function resolvePlayerContacts(race, previousDistance, previousX, lateralPosition, roofHit, section, nitro) {
  const car = race.player;
  const retention = nitro ? 0.7 : 0.45;
  if (car.effects.ghost <= 0) {
    const exit = phaseExits.get(car);
    resolveVehicles(race, previousDistance, previousX, retention, exit);
    const prop = hitProp(race.props, car, previousDistance, exit?.props.length ? part => exit.props.some(old => samePart(old, part)) : undefined);
    if (prop) {
      contact(race, 'barrier', (prop.left + prop.right) / 2, clamp(car.speed / 100, 0.25, 1), retention);
      car.x = clearOf(prop, car.x);
    }
  } else {
    following.delete(car);
    vehicleContacts.delete(car);
  }
  const intensity = clamp(car.speed / 100, 0.25, 1);
  if (roofHit) contact(race, 'barrier', Math.sign(car.x) * (ROAD_LIMIT + 1), intensity, 0.75);
  const pylon = car.section === 'shortcut' && shortcutPylons(section).find(p => p.distance > previousDistance && p.distance <= car.distance &&
    Math.abs(p.x - car.x) < PYLON_HALF_WIDTH && Math.abs(p.altitude - car.altitude) < SHORTCUT_TOLERANCE);
  if (pylon) {
    contact(race, 'barrier', pylon.x, intensity, 0.75);
    car.x = pylon.x + Math.sign(section.x - pylon.x) * (PYLON_HALF_WIDTH + 0.86);
  }
  resolveRail(race, lateralPosition, intensity);
  if (race.course) syncCourseContact(race, car);
}
