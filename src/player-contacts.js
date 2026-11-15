import { aiRetention, clearOf, hitProp, knock, knockX, propTouches } from './car-collisions.js';
import { carGap, syncCourseContact } from './course-race-step.ts';
import { recoveryRetention } from './bonus-gates.ts';
import { ROAD_LIMIT, SCRAPE_RATIO, shortcutPylons } from './game.js';
import { SHORTCUT_TOLERANCE } from './road-falls.ts';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const CAR_WIDTH = 1.7, CAR_LENGTH = 4.4;
const SIDE_CLEARANCE = 0.005, FOLLOW_GAP = CAR_LENGTH + 0.01;
const RELEASE_GAP = FOLLOW_GAP + 0.12;
const PYLON_HALF_WIDTH = 1.2;
const verticalOverlap = (a, b) => Math.abs((a.altitude || 0) - (b.altitude || 0)) < 1.8;
const overlappingCars = (race, a, b) => Math.abs(carGap(race, a, b) ?? Infinity) < CAR_LENGTH &&
  Math.abs(a.x - b.x) < CAR_WIDTH && verticalOverlap(a, b);

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
export const isFollowingVehicle = car => following.has(car);
const vehicleContacts = new WeakMap();
const paceOf = other => other.pace ?? other.speed;

function spaceFree(race, car, x, partner, opponents, exit) {
  if (Math.abs(x) > ROAD_LIMIT) return false;
  for (const other of opponents) {
    if (other === car || other === partner || (car === race.player && exit?.cars.has(other))) continue;
    if (Math.abs(x - other.x) < CAR_WIDTH && verticalOverlap(car, other) &&
        Math.abs(carGap(race, car, other) ?? Infinity) < CAR_LENGTH) return false;
  }
  return !hitProp(race.props, { distance: car.distance, altitude: car.altitude, x }, car.distance);
}

function separation(race, car, other, side, intensity, fresh, opponents, exit) {
  // Keep the existing knock in open space. Test both resulting positions before committing it.
  let x = fresh && !(car.effects.shield > 0) ? knockX(car.x, side, intensity) : car.x;
  let ox = fresh && !(other.cooldown > 0) ? knockX(other.x, -side, intensity) : other.x;
  const half = CAR_WIDTH / 2 + SIDE_CLEARANCE;
  if (side * (x - ox) < 2 * half) {
    const centre = clamp((x + ox) / 2, -ROAD_LIMIT + half, ROAD_LIMIT - half);
    x = centre + side * half;
    ox = centre - side * half;
  }
  if (spaceFree(race, car, x, other, opponents, exit) && spaceFree(race, other, ox, car, opponents)) return { x, ox };
  // A third car can block the partner's side, even when the player has room.
  x = other.x + side * (CAR_WIDTH + 2 * SIDE_CLEARANCE);
  return spaceFree(race, car, x, other, opponents, exit) ? { x, ox: other.x } : null;
}

// A held rear bumper is one encounter. Keep the existing lane when neither
// lateral separation fits. Steering still decides when to leave that lane.
function follow(race, other, gap, previousDistance, retention) {
  const car = race.player;
  if (following.get(car) !== other && !vehicleContacts.get(car)?.has(other)) contact(race, 'vehicle', other.x,
    clamp(Math.abs(car.speed - paceOf(other)) / 70, 0.25, 1), retention, false);
  following.set(car, other);
  car.speed = Math.min(car.speed, paceOf(other));
  car.distance = Math.max(previousDistance, car.distance + gap - FOLLOW_GAP);
}

function resolveVehicles(race, previousDistance, previousX, retention, exit) {
  const car = race.player;
  const leader = following.get(car);
  const opponents = [...race.traffic, ...race.rivals];
  let contacts = vehicleContacts.get(car);
  if (contacts) for (const other of contacts) {
    const gap = opponents.includes(other) ? carGap(race, car, other) : null;
    if (gap === null || Math.abs(gap) > RELEASE_GAP || Math.abs(car.x - other.x) > CAR_WIDTH + 0.12 ||
        !verticalOverlap(car, other)) contacts.delete(other);
  }
  if (leader) {
    const gap = opponents.includes(leader) ? carGap(race, car, leader) : null;
    if (gap !== null && gap >= 0 && gap <= RELEASE_GAP && Math.abs(car.x - leader.x) < CAR_WIDTH && verticalOverlap(car, leader)) {
      if (gap < FOLLOW_GAP) follow(race, leader, gap, previousDistance, retention);
    } else following.delete(car);
  }
  for (const other of opponents) {
    if (exit?.cars.has(other) || Math.abs(car.x - other.x) >= CAR_WIDTH || !verticalOverlap(car, other)) continue;
    const gap = carGap(race, car, other);
    if (gap === null || gap >= CAR_LENGTH) continue;
    const previousGap = gap + car.distance - previousDistance;
    if (gap <= -CAR_LENGTH) {
      if (previousGap >= CAR_LENGTH) follow(race, other, gap, previousDistance, retention);
      continue;
    }
    const side = Math.sign(car.x - other.x) || -1;
    const intensity = clamp(Math.abs(car.speed - other.speed) / 70, 0.25, 1);
    const fresh = car.cooldown === 0 && !contacts?.has(other);
    let positions = separation(race, car, other, side, intensity, fresh, opponents, exit) ??
      (Math.abs(car.x - other.x) < 0.5 ? separation(race, car, other, -side, intensity, fresh, opponents, exit) : null);
    const blockedSteer = !positions && Math.abs(previousX - other.x) + 1e-8 >= CAR_WIDTH &&
      spaceFree(race, car, previousX, other, opponents, exit);
    if (blockedSteer) positions = { x: previousX, ox: other.x };
    if (!positions) {
      if (previousGap > 0) follow(race, other, gap, previousDistance, retention);
      continue;
    }
    if (fresh && contact(race, 'vehicle', other.x, intensity, retention, !blockedSteer) && !blockedSteer && !(other.cooldown > 0)) {
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
