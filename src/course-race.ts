/** Pure per-car CourseGraph race runtime (spec §5.2, §6, §7). No DOM, no Three.js, no engine imports. */
import type { CourseEdge, CourseGraph, CoursePoint3 } from './course-graph.ts';
import { routeLength, sampleRoute, type CourseRouteFrame } from './course-route-frame.ts';
import { createCourseTravel, type CourseTravel } from './course-travel.ts';
import { advanceMeasuredCourseTravel } from './course-measured-motion.ts';
import type { GateHeightBand } from './course-signed-gates.ts';
import { rankCourseFleet, type CourseStanding } from './course-ai-standings.ts';

export interface CourseHazard { readonly id: string; readonly edgeId: string; readonly localS: number;
  readonly lateral: number; readonly radius: number; readonly safePassSide: 'left' | 'right'; readonly aiPreview: number }
export interface CourseRaceSpec {
  readonly graph: CourseGraph; readonly gateHeight: GateHeightBand;
  readonly noRoad: Readonly<Record<string, readonly (readonly [number, number])[]>>; // graph metres
  readonly recoveryEdge: Readonly<Record<string, string>>;  // flight edge id -> ground edge id
  readonly hazards: readonly CourseHazard[];
}
export interface CoursePose { readonly point: number[]; readonly forward: number[]; readonly right: number[]; readonly up: number[] } // length 3, overwritten in place
export interface CourseKinematics { readonly distance: number; readonly x: number; readonly altitude: number }
export interface CourseCar { travel: CourseTravel; edgeStart: number; readonly last: { distance: number; x: number; altitude: number };
  readonly pose: CoursePose; finishFraction: number | null }
export interface CourseRuntime { readonly spec: CourseRaceSpec; readonly cars: Map<string, CourseCar>;
  rejections: number; standings: CourseStanding[] }
export type CourseStepEvent = 'moved' | 'crossed' | 'finished' | 'rejected';

function edgeById(graph: CourseGraph, id: string): CourseEdge {
  for (const edge of graph.edges) if (edge.id === id) return edge;
  throw new RangeError(`Unknown CourseGraph edge: ${id}`);
}
function carOf(rt: CourseRuntime, id: string): CourseCar {
  const car = rt.cars.get(id);
  if (!car) throw new Error(`Unknown course car: ${id}`);
  return car;
}
function inNoRoad(spec: CourseRaceSpec, edgeId: string, s: number): boolean {
  const gaps = spec.noRoad[edgeId];
  if (gaps) for (const [from, to] of gaps) if (s >= from && s < to) return true;
  return false;
}
// The signed gate rejects a sweep starting within 1e-6 m of the node plane, so a car is never left
// closer than this to a node; a clamp in metres, not rounding (lateral·curvature < 0.5 keeps it > 1e-6).
const NODE_CLEARANCE = 1e-4;
const copyLast = (car: CourseCar, k: CourseKinematics): void => {
  car.last.distance = k.distance; car.last.x = k.x; car.last.altitude = k.altitude;
};
const solidFlight = (spec: CourseRaceSpec, edgeId: string, s: number): boolean =>
  edgeById(spec.graph, edgeId).mode === 'flight' && !inNoRoad(spec, edgeId, s);

/** out = frame.point + ahead·forward + x·right + altitude·up (world metres). */
function placeOnFrame(out: number[], f: CourseRouteFrame, ahead: number, x: number, altitude: number): void {
  for (let i = 0; i < 3; i++) out[i] = f.point[i] + f.forward[i] * ahead + f.right[i] * x + f.up[i] * altitude;
}
function writePose(graph: CourseGraph, car: CourseCar): void {
  const t = car.travel, f = sampleRoute(graph, t.currentEdgeId, t.localS), pose = car.pose;
  placeOnFrame(pose.point, f, 0, t.lateral, t.altitude);
  for (let i = 0; i < 3; i++) { pose.forward[i] = f.forward[i]; pose.right[i] = f.right[i]; pose.up[i] = f.up[i]; }
}
/** Index of the first mandatory checkpoint still ahead of `node` (the node itself included). */
function checkpointsBefore(graph: CourseGraph, node: string): number {
  const reaches = (from: string, to: string): boolean =>
    from === to || graph.edges.some(e => e.from === from && reaches(e.to, to));
  const index = graph.checkpoints.findIndex(cp => reaches(node, cp));
  return index < 0 ? graph.checkpoints.length : index;
}

/** Road traffic shares the runtime (poses, gaps, collisions, recovery) but is never ranked. */
export const TRAFFIC_PREFIX = 'traffic-';

/** A car on the start edge at `slot.distance`; re-seat it elsewhere with `placeCourseCar`. */
export function addCourseCar(rt: Pick<CourseRuntime, 'spec' | 'cars'>, slot: { id: string; distance: number; x: number }): void {
  if (rt.cars.has(slot.id)) throw new Error(`Duplicate course car: ${slot.id}`);
  const car: CourseCar = {
    travel: { ...createCourseTravel(rt.spec.graph), localS: slot.distance, lateral: slot.x },
    edgeStart: 0, last: { distance: slot.distance, x: slot.x, altitude: 0 }, finishFraction: null,
    pose: { point: [0, 0, 0], forward: [0, 0, 0], right: [0, 0, 0], up: [0, 0, 0] },
  };
  writePose(rt.spec.graph, car);
  rt.cars.set(slot.id, car);
}

export function createCourseRuntime(spec: CourseRaceSpec, grid: readonly { id: string; distance: number; x: number }[]): CourseRuntime {
  const rt: CourseRuntime = { spec, cars: new Map<string, CourseCar>(), rejections: 0, standings: [] };
  for (const slot of grid) addCourseCar(rt, slot);
  rankCourseRuntime(rt, {});
  return rt;
}

/** Recovery / test placement: odometer `kinematics.distance` sits at `localS` on `edgeId`. */
export function placeCourseCar(rt: CourseRuntime, id: string, edgeId: string, localS: number, kinematics: CourseKinematics): void {
  const car = carOf(rt, id), graph = rt.spec.graph, edge = edgeById(graph, edgeId);
  car.travel = { currentEdgeId: edgeId, localS: Math.min(localS, routeLength(graph, edgeId) - NODE_CLEARANCE),
    lateral: kinematics.x, altitude: kinematics.altitude, nextCheckpoint: checkpointsBefore(graph, edge.to), finished: false };
  car.edgeStart = kinematics.distance - localS;
  copyLast(car, kinematics);
  car.finishFraction = null;
  writePose(graph, car);
}

/**
 * §8 recovery seat for a car that fell into a flight gap or had a sweep rejected: the flight edge's recovery edge (both
 * leave the same split node), else the start of its own ground edge, at the first slot 5…65 m in that `isClear` accepts.
 * The odometer is the edge-start (split) odometer: a recovery never credits progress. Re-seat with `placeCourseCar`.
 */
export function recoverCourseCar(rt: CourseRuntime, id: string, isClear: (edgeId: string, localS: number) => boolean):
  { edgeId: string; localS: number; odometer: number } | null {
  const car = carOf(rt, id), current = car.travel.currentEdgeId;
  const edgeId = edgeById(rt.spec.graph, current).mode === 'flight' ? rt.spec.recoveryEdge[current] : current;
  for (let localS = 5; localS <= 65; localS += 5) if (isClear(edgeId, localS)) return { edgeId, localS, odometer: car.edgeStart };
  return null;
}

// Reused per step (no allocation); the shared modules read but never retain the motion.
const from: [number, number, number] = [0, 0, 0], to: [number, number, number] = [0, 0, 0];
const motion = { edgeId: '', fromS: 0, toS: 0, fromPosition: from as CoursePoint3, toPosition: to as CoursePoint3,
  maxStepMetres: 0, nextEdgeId: undefined as string | undefined, flightAuthorized: false,
  gateHeight: undefined as GateHeightBand | undefined };

/**
 * Advance one car from its stored pose to the host's new odometer/lane/altitude as a measured
 * sweep. A step reaching the edge end crosses the node plane (checkpoint/finish) and continues
 * the remainder on `chooseEdge(node)` in the same sweep. `now` is copied into `last` (alias-safe).
 * `maxStepMetres` is the host's envelope; the turn of the sampled road frame under the lane/height lever is added
 * here, because the shared arc-length LUT frame turns in steps (a short step across a LUT boundary at x = 2.5 m
 * swings 1 cm more than `distance · (1 + |x| · curvature)`).
 */
export function stepCourseCar(rt: CourseRuntime, id: string, now: CourseKinematics, maxStepMetres: number,
  chooseEdge: (nodeId: string) => string | null): CourseStepEvent {
  const car = carOf(rt, id), { spec } = rt, graph = spec.graph, travel = car.travel;
  if (travel.finished) return 'finished';
  const length = routeLength(graph, travel.currentEdgeId), target = now.distance - car.edgeStart;
  const node = target >= length ? edgeById(graph, travel.currentEdgeId).to : null;
  const atFinish = node === graph.finish, nextId = node && !atFinish ? chooseEdge(node) : null;
  if (node && !atFinish && !nextId) { rt.rejections++; return 'rejected'; }
  const toS = node ? target : Math.min(target, length - NODE_CLEARANCE);
  const destEdge = nextId ?? travel.currentEdgeId, destS = nextId ? target - length : toS;
  const f = sampleRoute(graph, destEdge, atFinish ? length : destS), end = atFinish ? f : null;
  placeOnFrame(to, f, atFinish ? target - length : 0, now.x, now.altitude);
  let turnR = 0, turnU = 0;
  for (let i = 0; i < 3; i++) { turnR += (f.right[i] - car.pose.right[i]) ** 2; turnU += (f.up[i] - car.pose.up[i]) ** 2; }
  for (let i = 0; i < 3; i++) from[i] = car.pose.point[i];
  motion.edgeId = travel.currentEdgeId; motion.fromS = travel.localS; motion.toS = toS;
  motion.maxStepMetres = maxStepMetres + Math.abs(now.x) * Math.sqrt(turnR) + Math.abs(now.altitude) * Math.sqrt(turnU);
  motion.nextEdgeId = nextId ?? undefined; motion.gateHeight = spec.gateHeight;
  // Physics state only (§5.2): airborne, or on a solid-road interval of a flight edge at either end of the sweep.
  motion.flightAuthorized = now.altitude > 0 || solidFlight(spec, travel.currentEdgeId, travel.localS) ||
    solidFlight(spec, destEdge, destS);
  const next = advanceMeasuredCourseTravel(graph, travel, motion);
  if (next === travel) { rt.rejections++; return 'rejected'; }
  if (end) { // node-plane crossing fraction of this sweep, for finish-time interpolation (§6)
    let before = 0, after = 0;
    for (let i = 0; i < 3; i++) { before += (from[i] - end.point[i]) * end.forward[i]; after += (to[i] - end.point[i]) * end.forward[i]; }
    car.finishFraction = before / (before - after);
  }
  if (nextId) car.edgeStart += length;
  car.travel = next;
  copyLast(car, now);
  writePose(graph, car);
  return next.finished ? 'finished' : nextId ? 'crossed' : 'moved';
}

/** Player fork choice (§6): the branch on the side of `lateral`; inside the deadband the ground route. */
export function chooseBranchByLateral(graph: CourseGraph, incomingEdgeId: string, lateral: number, deadband: number): string | null {
  const incoming = edgeById(graph, incomingEdgeId);
  const candidates = graph.edges.filter(e => e.from === incoming.to);
  if (candidates.length < 2) return candidates[0]?.id ?? null;
  if (!(Math.abs(lateral) > deadband)) return candidates.find(e => graph.groundRoute.includes(e.id))?.id ?? candidates[0].id;
  const end = sampleRoute(graph, incomingEdgeId, routeLength(graph, incomingEdgeId));
  let best = candidates[0].id, bestTurn = lateral < 0 ? Infinity : -Infinity;
  for (const edge of candidates) {
    const p = sampleRoute(graph, edge.id, 30).point;
    const turn = (p[0] - end.point[0]) * end.right[0] + (p[1] - end.point[1]) * end.right[1] + (p[2] - end.point[2]) * end.right[2];
    if (lateral < 0 ? turn < bestTurn : turn > bestTurn) { best = edge.id; bestTurn = turn; }
  }
  return best;
}

export function courseNoRoadAt(rt: CourseRuntime, id: string): boolean {
  const travel = carOf(rt, id).travel;
  return inNoRoad(rt.spec, travel.currentEdgeId, travel.localS);
}

/** Signed metres from `from` to `to` along the path; null when they are not on the same or adjacent edges. */
export function courseCarGap(rt: CourseRuntime, from: string, to: string): number | null {
  const a = carOf(rt, from).travel, b = carOf(rt, to).travel, graph = rt.spec.graph;
  if (a.currentEdgeId === b.currentEdgeId) return b.localS - a.localS;
  const ea = edgeById(graph, a.currentEdgeId), eb = edgeById(graph, b.currentEdgeId);
  if (ea.to === eb.from) return routeLength(graph, ea.id) - a.localS + b.localS;
  if (eb.to === ea.from) return -(routeLength(graph, eb.id) - b.localS + a.localS);
  return null;
}

// Shortest physical metres from a node to FINISH; memo per graph, never invalidated (the graph is immutable).
const toFinishMemo = new WeakMap<CourseGraph, Map<string, number>>();
function toFinish(graph: CourseGraph, node: string): number {
  let memo = toFinishMemo.get(graph);
  if (!memo) toFinishMemo.set(graph, memo = new Map());
  let best = memo.get(node);
  if (best === undefined) {
    best = node === graph.finish ? 0 : Infinity;
    for (const e of graph.edges) if (e.from === node) best = Math.min(best, routeLength(graph, e.id) + toFinish(graph, e.to));
    memo.set(node, best);
  }
  return best;
}
/** Metres left to FINISH (rest of the current edge + shortest onward path); 0 once finished. Orders like the standings. */
export function courseRemaining(rt: CourseRuntime, id: string): number {
  const travel = carOf(rt, id).travel, graph = rt.spec.graph;
  if (travel.finished) return 0;
  return routeLength(graph, travel.currentEdgeId) - travel.localS + toFinish(graph, edgeById(graph, travel.currentEdgeId).to);
}

/** Graph standings (§7): checkpoints first, then physical metres to the next mandatory target. */
export function rankCourseRuntime(rt: CourseRuntime, finishTimes: Readonly<Record<string, number>>): CourseStanding[] {
  const fleet: { id: string; travel: CourseTravel }[] = [];
  for (const [id, car] of rt.cars) if (!id.startsWith(TRAFFIC_PREFIX)) fleet.push({ id, travel: car.travel });
  return (rt.standings = rankCourseFleet(rt.spec.graph, fleet, finishTimes));
}
