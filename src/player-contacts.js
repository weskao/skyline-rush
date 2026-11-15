import { aiRetention, clearOf, hitProp, knock, propTouches } from './car-collisions.js';
import { carGap, syncCourseContact } from './course-race-step.ts';
import { recoveryRetention } from './bonus-gates.ts';
import { ROAD_LIMIT, SCRAPE_RATIO, shortcutPylons } from './game.js';
import { SHORTCUT_TOLERANCE } from './road-falls.ts';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roadX = x => clamp(x, -ROAD_LIMIT, ROAD_LIMIT);
const CAR_WIDTH = 1.7;
const PYLON_HALF_WIDTH = 1.2;
const overlappingCars = (race, a, b) => Math.abs(carGap(race, a, b) ?? Infinity) < 4.4 &&
  Math.abs(a.x - b.x) < CAR_WIDTH && Math.abs((b.altitude || 0) - a.altitude) < 1.8;

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

export function contact(race, kind, obstacleX, intensity, retention) {
  const car = race.player;
  if (car.cooldown > 0) return false;
  if (car.effects.shield > 0) {
    car.effects.shield = 0;
    car.shieldBlock = { x: car.x, altitude: car.altitude, distance: car.distance, time: race.elapsed };
    car.cooldown = 1;
    return true;
  }
  const side = Math.sign(car.x - obstacleX) || -1, x = car.x;
  const speedLost = knock(race, car, side, intensity, recoveryRetention(car, retention));
  car.impact = { kind, intensity, side, speedLost, x, altitude: car.altitude, distance: car.distance, time: race.elapsed };
  car.collisions++;
  car.combo = 0;
  car.drift = null;
  car.trick = null;
  return true;
}

function separateCars(car, other, side) {
  const overlap = CAR_WIDTH + 0.01 - side * (car.x - other.x);
  if (overlap <= 0) return;
  const centre = roadX((car.x + other.x) / 2);
  const inside = clamp(centre, -ROAD_LIMIT + CAR_WIDTH / 2 + 0.005, ROAD_LIMIT - CAR_WIDTH / 2 - 0.005);
  car.x = inside + side * (CAR_WIDTH / 2 + 0.005);
  other.x = inside - side * (CAR_WIDTH / 2 + 0.005);
}

function resolveVehicles(race, opponents, exit, retention) {
  const car = race.player;
  for (const other of opponents) {
    if (exit?.cars.has(other) || !overlappingCars(race, car, other)) continue;
    const side = Math.sign(car.x - other.x) || -1;
    const intensity = clamp(Math.abs(car.speed - other.speed) / 70, 0.25, 1);
    if (contact(race, 'vehicle', other.x, intensity, retention) && !(other.cooldown > 0)) {
      knock(race, other, -side, intensity, aiRetention(other));
    }
    separateCars(car, other, side);
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

export function resolvePlayerContacts(race, previousDistance, lateralPosition, roofHit, section, nitro) {
  const car = race.player;
  const retention = nitro ? 0.7 : 0.45;
  if (car.effects.ghost <= 0) {
    const exit = phaseExits.get(car);
    resolveVehicles(race, race.traffic, exit, retention);
    resolveVehicles(race, race.rivals, exit, retention);
    const prop = hitProp(race.props, car, previousDistance, exit?.props.length ? part => exit.props.some(old => samePart(old, part)) : undefined);
    if (prop) {
      contact(race, 'barrier', (prop.left + prop.right) / 2, clamp(car.speed / 100, 0.25, 1), retention);
      car.x = clearOf(prop, car.x);
    }
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
