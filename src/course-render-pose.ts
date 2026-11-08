import type { CourseRuntime } from './course-race.ts';
import { chooseBranchByLateral } from './course-race.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';
import type { CoursePoint3 } from './course-graph.ts';

export function graphOrigin(rt: CourseRuntime): CoursePoint3 {
  const car = rt.cars.get('YOU');
  if (!car) throw new Error('CourseGraph runtime has no player');
  return sampleRoute(rt.spec.graph, car.travel.currentEdgeId, car.travel.localS).point;
}

/** The car and streamed road share a physical frame. Different branches never share a fake 1D coordinate. */
export function graphCarVisual(rt: CourseRuntime, id: string, origin: CoursePoint3) {
  const car = rt.cars.get(id), player = rt.cars.get('YOU');
  if (!car || !player) return null;
  const world = car.pose.point, from = player.pose.point;
  return {
    position: [world[0] - origin[0], world[1] - origin[1], world[2] - origin[2]],
    frame: car.pose, finished: car.travel.finished,
    separation: Math.hypot(world[0] - from[0], world[1] - from[1], world[2] - from[2]),
  };
}

/** Follow the same lateral branch decision as the host physics; never look along a flattened route. */
export function graphLookAhead(rt: CourseRuntime, lateral: number, ahead: number) {
  const graph = rt.spec.graph, travel = rt.cars.get('YOU')?.travel;
  if (!travel) throw new Error('CourseGraph runtime has no player');
  let edgeId = travel.currentEdgeId, s = travel.localS, remaining = Math.max(0, ahead);
  for (let i = 0; i <= graph.edges.length; i++) {
    const length = routeLength(graph, edgeId);
    if (s + remaining <= length) return sampleRoute(graph, edgeId, s + remaining);
    const edge = graph.edges.find(item => item.id === edgeId);
    const next = edge && chooseBranchByLateral(graph, edgeId, lateral, 2.5);
    if (!next) return sampleRoute(graph, edgeId, length);
    remaining -= Math.max(0, length - s);
    edgeId = next; s = 0;
  }
  throw new Error('CourseGraph look-ahead exceeded acyclic route');
}

export function graphFinishVisual(rt: CourseRuntime, origin: CoursePoint3) {
  const graph = rt.spec.graph, last = graph.groundRoute.at(-1)!;
  const frame = sampleRoute(graph, last, routeLength(graph, last));
  const point = frame.point, player = rt.cars.get('YOU')?.pose.point ?? origin;
  return {
    frame, position: [point[0] - origin[0], point[1] - origin[1], point[2] - origin[2]],
    separation: Math.hypot(point[0] - player[0], point[1] - player[1], point[2] - player[2]),
  };
}
