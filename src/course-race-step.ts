// Glue between the shared race loop (game.js, car-collisions.js, race-finish.js) and the per-car CourseGraph
// runtime (spec §5.3, H1–H7). Every hook is `race.course ? <graph path> : <legacy expression, verbatim>`.
import { physicalGap } from './circuit-track.ts';
import { chooseCourseNextEdge } from './course-ai-standings.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';
import { COURSE_RUNTIMES, isCourseRuntime } from './course-runtimes.ts';
import { chooseBranchByLateral, courseCarGap, courseNoRoadAt, courseRemaining, createCourseRuntime, placeCourseCar,
  rankCourseRuntime, recoverCourseCar, stepCourseCar, type CourseHazard, type CourseRuntime, type CourseStepEvent } from './course-race.ts';
import { dropCar, type FallingCar } from './road-falls.ts';
import { knock } from './car-collisions.js';
// Read only inside functions, so the game.js ↔ course-race-step.ts import cycle cannot hit the TDZ.
import { FLY_DRAIN, GAP_CLEARANCE, GAP_LIFT_RESERVE, GAP_SLOWDOWN, GAP_WARN_DISTANCE } from './game.js';

interface Car { distance: number; id?: string }
interface RaceCar extends Car { x: number; altitude: number; finishTime?: number | null }
type Player = RaceCar & FallingCar & { fuel: number };
type Rival = RaceCar & { pace: number; speed: number; cooldown?: number };
interface CourseRef { course?: CourseRuntime; player: object }
interface CourseHost extends CourseRef {
  trackId: string; seed: number; elapsed: number; player: Player; rivals: Rival[]; result: { time: number } | null;
  rings: unknown[]; pickups: unknown[]; traffic: unknown[]; hazards: unknown[]; sections: unknown[];
}
type Contact = (race: CourseHost, kind: 'barrier', obstacleX: number, intensity: number, retention: number) => void;

export const PLAYER_ID = 'YOU';
export const BRANCH_DEADBAND = 2.5; // m, one lane: inside it the player keeps the ground route (§6)
// Rivals and traffic carry `id`; traffic never runs on a course (attachCourse empties it).
const idOf = (race: CourseRef, car: Car): string => car === race.player ? PLAYER_ID : car.id as string;
const travelOf = (rt: CourseRuntime, id: string) => {
  const car = rt.cars.get(id);
  if (!car) throw new Error(`Unknown course car: ${id}`);
  return car.travel;
};

/** H1: graph courses get a runtime and no 1D-keyed lists (Q3); every other track is left untouched. */
export function attachCourse(race: CourseHost): void {
  if (!isCourseRuntime(race.trackId)) return;
  const grid = [race.player, ...race.rivals].map(car => ({ id: idOf(race, car), distance: car.distance, x: car.x }));
  race.course = createCourseRuntime(COURSE_RUNTIMES[race.trackId].spec, grid);
  race.rings = []; race.pickups = []; race.traffic = []; race.hazards = []; race.sections = [];
}

// `travelled` is this frame's physical speed·dt (pace·dt for rivals), never the odometer delta: an odometer rewrite
// (a 1D respawn setting `distance`) then sweeps further than the bound and is rejected, not silently accepted.
function stepCar(rt: CourseRuntime, id: string, car: RaceCar, travelled: number, chooseEdge: (node: string) => string | null): CourseStepEvent {
  const course = rt.cars.get(id)!, { travel, last } = course;
  if (travel.finished) return 'finished';
  const curvature = sampleRoute(rt.spec.graph, travel.currentEdgeId, travel.localS).curvature;
  // Spec §5.3: speed·dt·(1 + |x|·curvature) + |Δx| + |Δaltitude| + 0.01. stepCourseCar adds the sampled frame's
  // discrete turn under the lever.
  const maxStep = travelled * (1 + Math.abs(car.x) * curvature) +
    Math.abs(car.x - last.x) + Math.abs(car.altitude - last.altitude) + 0.01;
  return stepCourseCar(rt, id, car, maxStep, chooseEdge);
}

const HAZARD_HEIGHT = 2.4; // m: a car at or above it clears a hazard (hazard-race.ts barrier height)
/** The first hazard swept from (prevEdge, prevS) to the car's travel at lane `x`, across at most one node. */
function hazardCrossed(rt: CourseRuntime, id: string, prevEdge: string, prevS: number, x: number, altitude: number): CourseHazard | null {
  const { travel } = rt.cars.get(id)!;
  if (altitude >= HAZARD_HEIGHT) return null;
  for (const h of rt.spec.hazards) {
    const from = h.edgeId === prevEdge ? prevS : h.edgeId === travel.currentEdgeId ? -1 : NaN; // NaN: another edge
    const to = h.edgeId === travel.currentEdgeId ? travel.localS : Infinity;
    if (h.localS > from && h.localS <= to && Math.abs(x - h.lateral) < h.radius) return h;
  }
  return null;
}

const CAR_CLEARANCE = 4.4; // m: the engine's car-vs-car contact length
/** §8: re-seat through placeCourseCar at the first slot clear of other cars on that edge and of hazard footprints. */
function recover(rt: CourseRuntime, id: string): { edgeId: string; localS: number; odometer: number } {
  const isClear = (edgeId: string, s: number): boolean =>
    [...rt.cars].every(([other, c]) => other === id || c.travel.currentEdgeId !== edgeId || Math.abs(c.travel.localS - s) >= CAR_CLEARANCE) &&
    rt.spec.hazards.every(h => h.edgeId !== edgeId || Math.abs(h.localS - s) >= h.radius);
  return recoverCourseCar(rt, id, isClear) ?? recoverCourseCar(rt, id, () => true)!; // all slots taken: the first, with respawn grace
}

/**
 * H2 + H6 for the player, called right after its odometer integration (game.js `gapNow`): measured step; over a flight
 * gap below GAP_CLEARANCE, or on a rejected sweep, a `dropCar` fall re-seated by `recoverCourseCar` — that frame sweeps
 * no gate, hazard or score; else the hazard sweep. Returns false: the legacy 1D gap drop never runs on a course.
 */
export function stepCoursePlayer(race: CourseHost, dt: number, contact: Contact): false {
  const rt = race.course!, player = race.player, { travel } = rt.cars.get(PLAYER_ID)!;
  const prevEdge = travel.currentEdgeId, prevS = travel.localS;
  const event = stepCar(rt, PLAYER_ID, player, player.speed * dt,
    () => chooseBranchByLateral(rt.spec.graph, prevEdge, player.x, BRANCH_DEADBAND));
  if (event === 'rejected' || (courseNoRoadAt(rt, PLAYER_ID) && player.altitude < GAP_CLEARANCE)) {
    const seat = recover(rt, PLAYER_ID);
    dropCar(player, seat.odometer, player.distance, race.elapsed, GAP_SLOWDOWN); // fall.from: the odometer where it fell
    placeCourseCar(rt, PLAYER_ID, seat.edgeId, seat.localS, player);
    return false;
  }
  const hazard = event !== 'finished' && player.cooldown === 0 ? hazardCrossed(rt, PLAYER_ID, prevEdge, prevS, player.x, player.altitude) : null;
  if (hazard) contact(race, 'barrier', hazard.lateral, 0.7, 0.6); // stepPlayerHazards' block response
  return false;
}

/** H2 for rivals, after this frame's distance integration: poses, gates, hazards, branch choice, finish times, standings. */
export function stepCourseCars(race: CourseHost, dt: number): void {
  const rt = race.course;
  if (!rt) return;
  const graph = rt.spec.graph, finishTimes: Record<string, number> = {};
  race.rivals.forEach((rival, i) => {
    const id = idOf(race, rival), { travel } = rt.cars.get(id)!, prevEdge = travel.currentEdgeId, prevS = travel.localS;
    // Q8: rivals are ground-only; seeded per driver so both ground alternates are raced.
    const event = stepCar(rt, id, rival, rival.pace * dt, node => chooseCourseNextEdge(graph, node, i + 1, false, race.seed));
    if (event === 'rejected') {
      const seat = recover(rt, id);
      rival.distance = seat.odometer;
      placeCourseCar(rt, id, seat.edgeId, seat.localS, rival);
    } else if (event !== 'finished' && !(rival.cooldown! > 0)) {
      const hazard = hazardCrossed(rt, id, prevEdge, prevS, rival.x, rival.altitude);
      if (hazard) knock(race, rival, Math.sign(rival.x - hazard.lateral) || -1, 0.7, 0.6); // aiImpacts' block response
    }
    if (event === 'finished' && rival.finishTime === null) rival.finishTime = race.elapsed - dt + dt * rt.cars.get(id)!.finishFraction!;
    if (rival.finishTime != null) finishTimes[id] = rival.finishTime;
  });
  if (race.result) finishTimes[PLAYER_ID] = race.result.time;
  rankCourseRuntime(rt, finishTimes);
}

/** AI avoidance (car-collisions.js): within a hazard's aiPreview ahead on the car's edge, block its unsafe side to the road edge. */
export function courseHazardBlockers(race: CourseRef, car: Car, out: number[]): void {
  const rt = race.course!, { travel } = rt.cars.get(idOf(race, car))!;
  for (const h of rt.spec.hazards) {
    const ahead = h.localS - travel.localS;
    if (h.edgeId !== travel.currentEdgeId || ahead < -2.2 || ahead > h.aiPreview) continue;
    if (h.safePassSide === 'right') out.push(-Infinity, h.lateral + h.radius); // right = +x (the road frame's right)
    else out.push(h.lateral - h.radius, Infinity);
  }
}

/** First no-road interval on `edgeId` (starting `offset` m past the player's edge start) not yet passed at `s`. */
function gapWarning(race: CourseHost, edgeId: string | null, offset: number, s: number): { from: number; need: number } | null | undefined {
  const car = race.player, rt = race.course!;
  for (const [from, to] of (edgeId && rt.spec.noRoad[edgeId]) || []) {
    if (offset + to <= s) continue;
    if (offset + from - s > GAP_WARN_DISTANCE) return undefined;
    const need = FLY_DRAIN * (offset + to - Math.max(s, offset + from)) / Math.max(car.speed, 18) + (car.altitude >= GAP_CLEARANCE ? 0 : GAP_LIFT_RESERVE);
    return car.fuel < need ? { from: rt.cars.get(PLAYER_ID)!.edgeStart + offset + from, need } : null;
  }
  return undefined;
}
/** §11 gapChargeWarning on the graph: the next gap within GAP_WARN_DISTANCE on the player's edge, else on the branch its lane picks. */
export function courseGapWarning(race: CourseHost): { from: number; need: number } | null {
  const rt = race.course!, { travel } = rt.cars.get(PLAYER_ID)!, graph = rt.spec.graph;
  if (travel.finished) return null;
  const next = chooseBranchByLateral(graph, travel.currentEdgeId, race.player.x, BRANCH_DEADBAND);
  const here = gapWarning(race, travel.currentEdgeId, 0, travel.localS); // null: a gap in range, enough charge
  return here !== undefined ? here : gapWarning(race, next, routeLength(graph, travel.currentEdgeId), travel.localS) ?? null;
}

/** H3: signed metres from `a` to `b`; null = no interaction (another branch, or a car already past FINISH). */
export function carGap(race: CourseRef & { trackId: string }, a: Car, b: Car): number | null {
  const rt = race.course;
  if (!rt) return physicalGap(race.trackId, a.distance, b.distance);
  const from = idOf(race, a), to = idOf(race, b);
  if (travelOf(rt, from).finished || travelOf(rt, to).finished) return null;
  return courseCarGap(rt, from, to);
}

/** H4: how far `to` is ahead of `from` in race progress (remaining metres to FINISH on the graph). */
export function progressGap(race: CourseRef, from: Car, to: Car): number {
  const rt = race.course;
  return rt ? courseRemaining(rt, idOf(race, from)) - courseRemaining(rt, idOf(race, to)) : to.distance - from.distance;
}

/** H5: crossed FINISH (graph gate) / reached the race length (legacy). */
export function courseFinished(race: CourseRef & { length: number }, car: Car): boolean {
  const rt = race.course;
  return rt ? travelOf(rt, idOf(race, car)).finished : car.distance >= race.length;
}
