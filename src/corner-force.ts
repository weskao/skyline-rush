// Kart handling (owner, 2026-11-28): steering turns the nose and the car runs along it. Released, the nose keeps its
// direction, so a bend turns the road away and the car meets the rail; on a straight it holds its line. AUTO is an
// automatic throttle only, never a lane keeper.
import { CROSSWIND_SPEED, ROAD_LIMIT } from './game.js'; // read only inside functions, so an import cycle cannot hit the TDZ
import { legacyClassicRoad } from './classic-road-routes.ts';
import type { CourseGraph } from './course-graph.ts';
import type { CourseRuntime } from './course-race.ts';
import { DRIFT_LATERAL } from './drive-rules.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';
import { COURSE_TRACKS, raceTrack } from './race-tracks.ts';
import { trackFrame } from './track-paths.ts';

const CELL = 4; // m per cached curvature sample
const REACH = 8; // m either side: reads the bend rather than a frame seam on measured routes
const TURN_STEPS = 2 ** 30; // per rad/m
const KNOCK_GRACE = 1.5; // s, the cooldown `knock` grants
const TURN_RATE = 2; // rad/s the nose turns at full lock: out-turns MAX_BEND at NITRO's 118 m/s
const FULL_TURN_SPEED = 20; // m/s; slower, the nose turns in proportion, and a stopped car does not turn
// shortcut: authored kinks (Stormline turns 115 degrees in 4 m) would spin the nose, so the road turns it at most
// 1/60 rad/m (a 60 m radius) and the rest stays road-relative. Upgrade if a course gets real hairpins tighter than that.
const MAX_BEND = 1 / 60;
const MAX_HEADING = .5; // rad, about 29 degrees off the road

interface ForceRace { trackId: string; elapsed: number; course?: CourseRuntime; endless?: { practice?: boolean } }
interface ForceCar {
  distance: number; x: number; speed: number; altitude: number; steering: number; cooldown: number; impact?: { time: number } | null;
  span?: boolean; inShortcut?: boolean; section?: string | null; heading?: number;
}

const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));
const yaw = (forward: readonly number[]): number => Math.atan2(forward[0], -forward[2]);
// Series, not Math.sin/cos: engines differ in their last bit and the replay hashes must not. Error < 2e-6 within MAX_HEADING.
const sine = (h: number): number => h * (1 - h * h / 6 * (1 - h * h / 20));
const cosine = (h: number): number => 1 - h * h / 2 * (1 - h * h / 12);

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

/** The road's turn in rad/m at a distance, capped at MAX_BEND (positive yaws the road toward +x). */
export const roadBend = (id: string, distance: number): number => clamp(roadTurn(id, distance), -MAX_BEND, MAX_BEND);

/** rad/s full lock turns the nose at this speed. */
export const turnAuthority = (speed: number): number => TURN_RATE * Math.min(1, Math.max(0, speed) / FULL_TURN_SPEED);

// A knocked car is never turned back into what it hit during the knock's grace (clamp -> shove loop).
const knocked = (race: ForceRace, car: ForceCar): boolean => car.cooldown > 0 && race.elapsed - (car.impact?.time ?? -Infinity) < KNOCK_GRACE;

/**
 * rad/s the road turns away from the nose, now or `ahead` metres on (a graph course stops at its edge's end): test
 * bots steer against it and turn in early, as a player does.
 */
export const cornerRate = (race: ForceRace, car: ForceCar, ahead = 0): number =>
  -car.speed * clamp(cornerTurn(race, car, ahead), -MAX_BEND, MAX_BEND);

/** The road's turn under the car in rad/m, 0 where the car keeps the road's line (knock, span, shortcut, practice). */
function cornerTurn(race: ForceRace, car: ForceCar, ahead = 0): number {
  if (knocked(race, car) || car.span || car.inShortcut || race.endless?.practice) return 0;
  if (race.course) {
    const { travel } = race.course.cars.get('YOU')!;
    return edgeTurn(race.course.spec.graph, travel.currentEdgeId, travel.localS + ahead);
  }
  // Endless replaces a long-form course's route with the shared highway.
  if (race.endless && Object.hasOwn(COURSE_TRACKS, race.trackId)) return turnOver(legacyClassicRoad.heading, car.distance + ahead, Infinity);
  return roadTurn(race.trackId, car.distance + ahead);
}

/** The car's x after this step's move, stopped at the rail. Nothing steers it back: `resolveRail` places it. */
export function meetRail(car: ForceCar, lateralPosition: number): number {
  if (Math.abs(lateralPosition) <= ROAD_LIMIT) return lateralPosition;
  car.heading = 0; // the rail lines the nose up with the road
  return Math.sign(lateralPosition) * ROAD_LIMIT;
}

/** Metres along the road this step: a car angled across the road covers less of it. */
export const roadAdvance = (car: { speed: number; heading?: number }, dt: number): number => car.speed * cosine(car.heading ?? 0) * dt;

/**
 * Metres of sideways travel this step. Steering turns the nose (`heading`, rad, positive toward +x) at up to
 * `turnAuthority`, and a bend turns the road away from it at `cornerRate`; the car runs along the nose. Released, the
 * heading changes only with the road, so the car holds its line on a straight and meets the outside rail in a bend.
 * A drift keeps the road's line and slides sideways by the lock; crosswind moves every car.
 */
export function roadDrift(race: ForceRace, car: ForceCar, section: { dir?: number } | undefined, drifting: boolean, dt: number): number {
  const wind = car.section === 'crosswind' ? (section?.dir ?? 1) * CROSSWIND_SPEED : 0;
  if (drifting) { car.heading = 0; return (car.steering * Math.min(9, car.speed * 0.22) * DRIFT_LATERAL + wind) * dt; }
  const from = car.heading ?? 0;
  const heading = clamp(from + (car.steering * turnAuthority(car.speed) + cornerRate(race, car)) * dt, -MAX_HEADING, MAX_HEADING);
  car.heading = heading;
  // The midpoint heading keeps the slide the same per second at any frame rate.
  return (car.speed * sine((from + heading) / 2) + wind) * dt;
}
