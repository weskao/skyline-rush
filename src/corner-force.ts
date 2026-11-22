// Curves push a grounded car outward on every track. AUTO's edge guard only fades that push near the rail.
import { CROSSWIND_SPEED, ROAD_LIMIT } from './game.js'; // read only inside functions, so an import cycle cannot hit the TDZ
import { legacyClassicRoad } from './classic-road-routes.ts';
import type { CourseGraph } from './course-graph.ts';
import type { CourseRuntime } from './course-race.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';
import { COURSE_TRACKS, raceTrack } from './race-tracks.ts';
import { trackFrame } from './track-paths.ts';

const PUSH_FROM = 35; // m/s
const PUSH_SCALE = .25;
const MAX_PUSH = 2.8; // m/s, under a third of the 9 m/s steering authority
const CELL = 4; // m per cached curvature sample
const REACH = 8; // m either side: reads the bend rather than a frame seam on measured routes
const TURN_STEPS = 2 ** 30; // per rad/m; one step moves the push by under 1e-5 m/s
const GUARD_ZONE = 2.5; // m over which AUTO fades outward force
const GUARD_MARGIN = .5; // m inside the rail where outward force reaches zero
const KNOCK_GRACE = 1.5; // s, the cooldown `knock` grants

interface ForceRace { trackId: string; elapsed: number; course?: CourseRuntime; endless?: { practice?: boolean } }
interface ForceCar {
  distance: number; x: number; speed: number; altitude: number; steering: number; cooldown: number; impact?: { time: number } | null;
  span?: boolean; inShortcut?: boolean; section?: string | null; cornerDrift?: number; cornerX?: number;
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

function cornerRate(race: ForceRace, car: ForceCar): number {
  // A knocked car is never pressed back into what it hit during the knock's grace (clamp -> shove loop).
  const recovering = car.cooldown > 0 && race.elapsed - (car.impact?.time ?? -Infinity) < KNOCK_GRACE;
  if (car.speed <= PUSH_FROM || car.altitude >= .1 || recovering || car.span || car.inShortcut || race.endless?.practice) return 0;
  if (race.course) {
    const { travel } = race.course.cars.get('YOU')!;
    return pushFor(edgeTurn(race.course.spec.graph, travel.currentEdgeId, travel.localS), car.speed);
  }
  // Endless replaces a long-form course's route with the shared highway.
  if (race.endless && Object.hasOwn(COURSE_TRACKS, race.trackId)) return pushFor(turnOver(legacyClassicRoad.heading, car.distance, Infinity), car.speed);
  return cornerPush(race.trackId, car.distance, car.speed);
}

/** Metres of sideways travel this step from corners and crosswind. The guard removes outward force and never adds any. */
export function roadDrift(race: ForceRace, car: ForceCar, section: { dir?: number } | undefined, drifting: boolean, edgeGuard: boolean, dt: number): number {
  const wind = car.section === 'crosswind' ? (section?.dir ?? 1) * CROSSWIND_SPEED : 0;
  const force = (drifting ? 0 : cornerRate(race, car)) + wind;
  const fade = edgeGuard && !drifting && force * car.x > 0 ? clamp((ROAD_LIMIT - GUARD_MARGIN - Math.abs(car.x)) / GUARD_ZONE, 0, 1) : 1;
  const metres = force * fade * dt;
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
