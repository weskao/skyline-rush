// Glue between the shared race loop (game.js, car-collisions.js, race-finish.js) and the per-car CourseGraph
// runtime (spec §5.3, H1–H5, H7). Every hook is `race.course ? <graph path> : <legacy expression, verbatim>`.
import { physicalGap } from './circuit-track.ts';
import { chooseCourseNextEdge } from './course-ai-standings.ts';
import { sampleRoute } from './course-route-frame.ts';
import { COURSE_RUNTIMES, isCourseRuntime } from './course-runtimes.ts';
import { chooseBranchByLateral, courseCarGap, courseRemaining, createCourseRuntime, rankCourseRuntime, stepCourseCar,
  type CourseRuntime, type CourseStepEvent } from './course-race.ts';

interface Car { distance: number; id?: string }
interface RaceCar extends Car { x: number; altitude: number; finishTime?: number | null }
interface CourseRef { course?: CourseRuntime; player: object }
interface CourseHost extends CourseRef {
  trackId: string; seed: number; elapsed: number; player: RaceCar; rivals: RaceCar[]; result: { time: number } | null;
  rings: unknown[]; pickups: unknown[]; traffic: unknown[]; hazards: unknown[]; sections: unknown[];
}

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

function stepCar(rt: CourseRuntime, id: string, car: RaceCar, chooseEdge: (node: string) => string | null): CourseStepEvent {
  const course = rt.cars.get(id)!, { travel, last } = course;
  if (travel.finished) return 'finished';
  const curvature = sampleRoute(rt.spec.graph, travel.currentEdgeId, travel.localS).curvature;
  // Spec §5.3: speed·dt·(1 + |x|·curvature) + |Δx| + |Δaltitude| + 0.01, speed·dt being this frame's odometer delta
  // (pace for rivals). stepCourseCar adds the sampled frame's discrete turn under the lever.
  const maxStep = Math.abs(car.distance - last.distance) * (1 + Math.abs(car.x) * curvature) +
    Math.abs(car.x - last.x) + Math.abs(car.altitude - last.altitude) + 0.01;
  return stepCourseCar(rt, id, car, maxStep, chooseEdge);
}

/** H2, after this frame's distance integration: poses, gates, branch choice, rival finish times, standings. */
export function stepCourseCars(race: CourseHost, dt: number): void {
  const rt = race.course;
  if (!rt) return;
  const graph = rt.spec.graph, player = race.player;
  stepCar(rt, PLAYER_ID, player, () => chooseBranchByLateral(graph, travelOf(rt, PLAYER_ID).currentEdgeId, player.x, BRANCH_DEADBAND));
  const finishTimes: Record<string, number> = {};
  race.rivals.forEach((rival, i) => {
    const id = idOf(race, rival);
    // Q8: rivals are ground-only; seeded per driver so both ground alternates are raced.
    const event = stepCar(rt, id, rival, node => chooseCourseNextEdge(graph, node, i + 1, false, race.seed));
    if (event === 'finished' && rival.finishTime === null) rival.finishTime = race.elapsed - dt + dt * rt.cars.get(id)!.finishFraction!;
    if (rival.finishTime != null) finishTimes[id] = rival.finishTime;
  });
  if (race.result) finishTimes[PLAYER_ID] = race.result.time;
  rankCourseRuntime(rt, finishTimes);
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
