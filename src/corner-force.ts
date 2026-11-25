// Curves turn the road away from a car's nose on every track, so a released car runs into the outer rail.
// AUTO steers a car back off a rail it touched.
import { CROSSWIND_SPEED, ROAD_LIMIT } from './game.js'; // read only inside functions, so an import cycle cannot hit the TDZ
import { legacyClassicRoad } from './classic-road-routes.ts';
import { onNeonRoof } from './neon-roof.ts';
import type { CourseGraph } from './course-graph.ts';
import type { CourseRuntime } from './course-race.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';
import { COURSE_TRACKS, raceTrack } from './race-tracks.ts';
import { trackFrame } from './track-paths.ts';

const PUSH_FROM = 35; // m/s
const PUSH_SCALE = .5;
const MAX_PUSH = 6; // m/s, two thirds of the 9 m/s steering authority (owner, 2026-11-24: corners passed themselves)
const MAX_FORCE = 7; // m/s, corner plus crosswind: full lock always keeps 2 m/s to steer out
const CELL = 4; // m per cached curvature sample
const REACH = 8; // m either side: reads the bend rather than a frame seam on measured routes
const TURN_STEPS = 2 ** 30; // per rad/m; one step moves the push by under 1e-5 m/s
const RAIL_HEIGHT = 1.3; // m, the altitude below which a car meets the rail (`resolveRail`)
const RECOVER_LOCK = .85; // AUTO's steer off the rail: 7.65 m/s beats the 7 m/s force cap, under the .9 lock of a hard hit
const RECOVER_UNTIL = 1.5; // m from the centre where AUTO lets go and the corners carry the car again
const KNOCK_GRACE = 1.5; // s, the cooldown `knock` grants
const NOSE_TURN = .35; // rad/s the nose turns at full lock: released, the sharpest bend at 88 m/s meets the rail in about 1 s
const AIR_SHARE = .5; // owner, 2026-11-25: taking off must not skip a corner, so it acts at half strength in the air

interface ForceRace { trackId: string; elapsed: number; course?: CourseRuntime; endless?: { practice?: boolean } }
interface ForceCar {
  distance: number; x: number; speed: number; altitude: number; steering: number; cooldown: number; impact?: { time: number } | null;
  span?: boolean; inShortcut?: boolean; section?: string | null; cornerDrift?: number; cornerX?: number; autoRecover?: number; heading?: number;
}

const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));
const yaw = (forward: readonly number[]): number => Math.atan2(forward[0], -forward[2]);
const pushFor = (turn: number, speed: number): number =>
  clamp(-turn * PUSH_SCALE * Math.max(0, speed - PUSH_FROM) ** 2, -MAX_PUSH, MAX_PUSH);

function turnOver(heading: (s: number) => number, s: number, end: number): number {
  const from = Math.max(0, s - REACH), to = Math.min(end, s + REACH), delta = heading(to) - heading(from);
  // Snapped to 2^-30 rad/m: engines differ in the last bit of sin/cos/atan2, and the replay hashes must not.
  return to > from ? Math.round(Math.atan2(Math.sin(delta), Math.cos(delta)) / (to - from) * TURN_STEPS) / TURN_STEPS : 0;
}

// Lazily filled so a race start has no hitch. Track geometry is immutable, so a filled cell is never invalidated.
const roadTurns = new WeakMap<object, Float64Array>();
const edgeTurns = new WeakMap<CourseGraph, Map<string, Float64Array>>();
const blankCells = (metres: number): Float64Array => new Float64Array(Math.ceil(metres / CELL) + 1).fill(NaN);

/** Two track lengths cover Endless: odd runs mirror the road and loops repeat. */
function roadTurn(id: string, distance: number): number {
  const track = raceTrack(id)!, period = track.length * 2;
  let cells = roadTurns.get(track);
  if (!cells) roadTurns.set(track, cells = blankCells(period));
  const cell = Math.floor((((distance % period) + period) % period) / CELL), cached = cells[cell];
  if (cached === cached) return cached;
  return cells[cell] = turnOver(s => yaw(trackFrame(id, s, true).forward), (cell + .5) * CELL, Infinity);
}

/** Graph courses read the car's own edge, so an alternate branch gets its own curvature. */
function edgeTurn(graph: CourseGraph, edgeId: string, localS: number): number {
  let edges = edgeTurns.get(graph);
  if (!edges) edgeTurns.set(graph, edges = new Map());
  let cells = edges.get(edgeId);
  if (!cells) edges.set(edgeId, cells = blankCells(routeLength(graph, edgeId)));
  const cell = Math.min(cells.length - 1, Math.floor(localS / CELL)), cached = cells[cell];
  if (cached === cached) return cached;
  return cells[cell] = turnOver(s => yaw(sampleRoute(graph, edgeId, s).forward), (cell + .5) * CELL, routeLength(graph, edgeId));
}

/** Outward push in m/s on a road addressed by distance (positive heading turns right, so the push is negative). */
export const cornerPush = (id: string, distance: number, speed: number): number => pushFor(roadTurn(id, distance), speed);

// A knocked car is never pressed back into what it hit during the knock's grace (clamp -> shove loop).
const knocked = (race: ForceRace, car: ForceCar): boolean => car.cooldown > 0 && race.elapsed - (car.impact?.time ?? -Infinity) < KNOCK_GRACE;

/** The car's corner push in m/s right now, without crosswind: test bots read it to lean into a bend. */
export function cornerRate(race: ForceRace, car: ForceCar): number {
  if (car.speed <= PUSH_FROM || knocked(race, car) || car.span || car.inShortcut || race.endless?.practice) return 0;
  return groundRate(race, car) * (car.altitude >= .1 && !onNeonRoof(race.trackId, car) ? AIR_SHARE : 1);
}

function groundRate(race: ForceRace, car: ForceCar): number {
  if (race.course) {
    const { travel } = race.course.cars.get('YOU')!;
    return pushFor(edgeTurn(race.course.spec.graph, travel.currentEdgeId, travel.localS), car.speed);
  }
  // Endless replaces a long-form course's route with the shared highway.
  if (race.endless && Object.hasOwn(COURSE_TRACKS, race.trackId)) return pushFor(turnOver(legacyClassicRoad.heading, car.distance, Infinity), car.speed);
  return cornerPush(race.trackId, car.distance, car.speed);
}

/**
 * AUTO's steering target. It never softens a corner: a hands-free car runs on into the rail. Once it touches, AUTO steers
 * it back toward the centre on the normal steering ramp and lets go there. The player's own steering always wins.
 */
export function assistSteer(car: ForceCar, steer: number, laneAssist: boolean): number {
  if (!laneAssist || steer !== 0) {
    if (car.autoRecover) car.autoRecover = 0; // written only when set, so a race without AUTO keeps its replay state
    return steer;
  }
  if (car.autoRecover && car.autoRecover * car.x < RECOVER_UNTIL) car.autoRecover = 0;
  return car.autoRecover ? -car.autoRecover * RECOVER_LOCK : 0;
}

/** The car's x after this step's move, stopped at the rail. AUTO starts steering back only once a move really reached it. */
export function meetRail(car: ForceCar, lateralPosition: number, laneAssist: boolean): number {
  if (Math.abs(lateralPosition) <= ROAD_LIMIT) return lateralPosition;
  car.heading = 0; // the rail lines the nose up with the road
  if (laneAssist && car.altitude < RAIL_HEIGHT) car.autoRecover = Math.sign(lateralPosition);
  return Math.sign(lateralPosition) * ROAD_LIMIT;
}

/**
 * Metres of sideways travel this step from corners and crosswind, on top of the steering's own `steering * authority`.
 * A bend turns the road away from the nose (`heading`, rad, positive toward +x) at the lock its push asks for. Steering
 * against that first holds and straightens the nose; only the lock left over moves the car across. Held at the bend's
 * lock the car keeps its lane as a constant push would; released, the nose keeps its line and the slide grows.
 */
export function roadDrift(race: ForceRace, car: ForceCar, section: { dir?: number } | undefined, drifting: boolean, dt: number): number {
  const wind = car.section === 'crosswind' ? (section?.dir ?? 1) * CROSSWIND_SPEED : 0;
  const corner = drifting ? 0 : clamp(cornerRate(race, car) + wind, -MAX_FORCE, MAX_FORCE) - wind;
  const authority = Math.min(9, car.speed * .22), from = drifting || knocked(race, car) ? 0 : car.heading ?? 0, turn = NOSE_TURN * dt;
  let heading = from + (corner && corner / authority * turn), lock = car.steering;
  if (lock * heading < 0) {
    const back = Math.min(Math.abs(heading), Math.abs(lock) * turn);
    heading -= Math.sign(heading) * back;
    lock -= Math.sign(lock) * back / turn;
    // Counter-steer also settles the nose, fully once it matches the bend: a held lock that lagged the bend's entry
    // keeps its lane as the old constant push did, while a released car keeps its line.
    const share = Math.abs(car.steering) * authority >= Math.abs(corner) ? 1 : Math.abs(car.steering) * authority / Math.abs(corner);
    heading *= Math.exp(-NOSE_TURN * car.speed / authority * share * dt);
  }
  car.heading = heading;
  // The midpoint heading keeps the slide the same per second at any frame rate.
  const metres = (car.speed * Math.sin((from + heading) / 2) + (lock - car.steering) * authority + wind) * dt;
  if (race.course) {
    // An inward move since the last step (rail, a placed lane, steering back) undoes that much of what the corners carried;
    // steering outward is the driver's own choice of lane, so the fork reads it in full.
    const carried = car.cornerDrift ?? 0, pulled = car.x - (car.cornerX ?? car.x);
    const kept = carried * pulled < 0 ? Math.sign(carried) * Math.max(0, Math.abs(carried) - Math.abs(pulled)) : carried;
    car.cornerDrift = car.steering * kept > 0 ? 0 : kept + metres;
    car.cornerX = car.x + metres;
  }
  return metres;
}
