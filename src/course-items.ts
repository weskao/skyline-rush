// Rings, pickups and traffic on a CourseGraph runtime course (spec Q3 follow-up, user 2026-11-09). Items keep the
// shared 1D generators' layout along the ground route, re-keyed to (edgeId, localS); each alternate branch gets a
// shortcut reward line. The shared collection loops (game.js) read `distance`, so `projectCourseItems` writes every
// item's distance in the player's own odometer: on an edge the player can still reach, else -Infinity (never crossed,
// never drawn). Rivals and traffic sweep items on their own edges (course-race-step.ts).
import type { CourseGraph, CoursePoint3 } from './course-graph.ts';
import { addCourseCar, placeCourseCar, TRAFFIC_PREFIX, type CourseRuntime } from './course-race.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';
import { burstRing, burstStations } from './shortcut-rewards.ts';

export interface CourseItem {
  distance: number; x: number; altitude: number; edgeId?: string; localS?: number; tier?: string;
  type?: string; radius?: number; group?: number; groupSize?: number;
}
interface Traffic { id?: string; distance: number; x: number; altitude: number }
interface ItemRace { course?: CourseRuntime; rings: CourseItem[]; pickups: CourseItem[]; traffic: Traffic[] }

const REWARD_STEP = 60, REWARD_INSET = 30, FLIGHT_REWARD_ALTITUDE = 6; // createPickups' shortcut reward line

// Ground-route start odometer of each ground edge; memo per immutable graph, never invalidated.
const groundStarts = new WeakMap<CourseGraph, Map<string, number>>();
function starts(graph: CourseGraph): Map<string, number> {
  let map = groundStarts.get(graph);
  if (!map) {
    map = new Map();
    let at = 0;
    for (const id of graph.groundRoute) { map.set(id, at); at += routeLength(graph, id); }
    groundStarts.set(graph, map);
  }
  return map;
}
const nodeOffset = (graph: CourseGraph, node: string): number => {
  for (const [id, at] of starts(graph)) {
    const edge = graph.edges.find(e => e.id === id)!;
    if (edge.from === node) return at;
    if (edge.to === node) return at + routeLength(graph, id);
  }
  throw new RangeError(`CourseGraph node off the ground route: ${node}`);
};

/** Ground-route progress of (edgeId, localS); an alternate branch maps proportionally onto its ground stretch. */
export function groundOffset(graph: CourseGraph, edgeId: string, localS: number): number {
  const start = starts(graph).get(edgeId);
  if (start !== undefined) return start + localS;
  const edge = graph.edges.find(e => e.id === edgeId);
  if (!edge) throw new RangeError(`Unknown CourseGraph edge: ${edgeId}`);
  const from = nodeOffset(graph, edge.from), to = nodeOffset(graph, edge.to);
  return from + (to - from) * localS / routeLength(graph, edgeId);
}

/** Ground-route progress -> ground edge and arc length on it. */
export function groundAt(graph: CourseGraph, distance: number): { edgeId: string; localS: number } {
  let last = graph.groundRoute[0]!, lastStart = 0;
  for (const [id, at] of starts(graph)) {
    if (at > distance) break;
    last = id; lastStart = at;
  }
  return { edgeId: last, localS: Math.min(routeLength(graph, last), Math.max(0, distance - lastStart)) };
}

/** createRace -> attachCourse: re-key the generated layout and traffic onto the graph. */
export function attachCourseItems(race: ItemRace, rt: CourseRuntime): void {
  const graph = rt.spec.graph;
  for (const item of [...race.rings, ...race.pickups]) Object.assign(item, groundAt(graph, item.distance));
  for (const edge of graph.edges) if (!graph.groundRoute.includes(edge.id)) {
    const length = routeLength(graph, edge.id), altitude = edge.mode === 'flight' ? FLIGHT_REWARD_ALTITUDE : 0;
    const add = (localS: number, tier: string) => race.pickups.push({ distance: groundOffset(graph, edge.id, localS), x: 0, altitude, tier, edgeId: edge.id, localS });
    for (let s = REWARD_INSET; s < length - REWARD_INSET; s += REWARD_STEP) add(s, 'cell');
    add(length / 2, 'tank');
    const burst = burstStations(REWARD_INSET, length - REWARD_INSET);
    burst.rings.forEach((localS, index) => race.rings.push({
      ...burstRing(groundOffset(graph, edge.id, localS), 0, altitude, index), edgeId: edge.id, localS,
    }));
    for (const localS of burst.cells) add(localS, 'cell');
  }
  race.pickups.sort((a, b) => a.distance - b.distance); // ground-progress order: projected distances stay ascending per path
  race.traffic.forEach((car, i) => {
    car.id = `${TRAFFIC_PREFIX}${i}`;
    const { edgeId, localS } = groundAt(graph, car.distance);
    addCourseCar(rt, { id: car.id, distance: 0, x: car.x });
    placeCourseCar(rt, car.id, edgeId, localS, car);
  });
  projectCourseItems(race);
}

/** Re-run whenever the player changes edge or is re-seated: item distances in the player's odometer. */
export function projectCourseItems(race: ItemRace, previousEdge?: string, previousStart = 0): void {
  const rt = race.course;
  if (!rt) return;
  const graph = rt.spec.graph, player = rt.cars.get('YOU')!, base = new Map<string, number>();
  if (previousEdge) base.set(previousEdge, previousStart); // the sweep that just crossed the node still covers its tail
  const reach = (edgeId: string, start: number): void => {
    if ((base.get(edgeId) ?? Infinity) <= start) return;
    base.set(edgeId, start);
    const edge = graph.edges.find(e => e.id === edgeId)!, end = start + routeLength(graph, edgeId);
    for (const next of graph.edges) if (next.from === edge.to) reach(next.id, end);
  };
  reach(player.travel.currentEdgeId, player.edgeStart);
  for (const list of [race.rings, race.pickups]) {
    for (const item of list) {
      const start = item.edgeId === undefined ? undefined : base.get(item.edgeId);
      item.distance = start === undefined ? -Infinity : start + item.localS!;
    }
    // The collector stops at the first item past the car, so distances have to stay sorted after a re-seat.
    list.sort((a, b) => a.distance - b.distance);
  }
}

// An item's world point and road frame never change (fixed edge, lane and height): computed once per item object.
const worlds = new WeakMap<object, { point: number[]; frame: ReturnType<typeof sampleRoute> }>();
function world(rt: CourseRuntime, item: CourseItem, x: number, altitude: number) {
  let hit = worlds.get(item);
  if (!hit) {
    const frame = sampleRoute(rt.spec.graph, item.edgeId!, item.localS!);
    hit = { frame, point: [0, 1, 2].map(i => frame.point[i]! + frame.right[i]! * x + frame.up[i]! * altitude) };
    worlds.set(item, hit);
  }
  return hit;
}
/** effects.js `worldPoint` on a graph course: the item on its own edge, relative to the camera origin. */
export function courseItemPoint(rt: CourseRuntime, item: CourseItem, x: number, altitude: number, origin: CoursePoint3 | number[]): number[] {
  const { point } = world(rt, item, x, altitude);
  return [point[0]! - origin[0]!, point[1]! - origin[1]!, point[2]! - origin[2]!];
}
/** effects.js `worldFrame` on a graph course: the item's edge frame (gates face along their own road). */
export const courseItemFrame = (rt: CourseRuntime, item: CourseItem) => sampleRoute(rt.spec.graph, item.edgeId!, item.localS!);
