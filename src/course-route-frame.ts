import type { CourseEdge, CourseGraph, CoursePoint3 } from './course-graph.ts';

export interface CourseRouteFrame {
  readonly edgeId: string;
  readonly localS: number;
  readonly point: CoursePoint3;
  readonly forward: CoursePoint3;
  readonly right: CoursePoint3;
  readonly up: CoursePoint3;
  readonly width: number;
  readonly curvature: number;
}
interface Samples { points: CoursePoint3[]; distances: number[]; length: number }
const cache = new WeakMap<CourseEdge, Samples>();
const step = 24; // Fixed, deterministic arc-length LUT; no allocations in hot-path sampling.
const sub = (a: CoursePoint3, b: CoursePoint3): CoursePoint3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: CoursePoint3, b: CoursePoint3): CoursePoint3 =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: CoursePoint3): CoursePoint3 => {
  const size = Math.hypot(...a);
  return size > 1e-9 ? [a[0] / size, a[1] / size, a[2] / size] : [0, 0, -1];
};

function curveAt(controls: readonly CoursePoint3[], segment: number, t: number): CoursePoint3 {
  const p0 = controls[Math.max(0, segment - 1)];
  const p1 = controls[segment];
  const p2 = controls[segment + 1];
  const p3 = controls[Math.min(controls.length - 1, segment + 2)];
  const axis = (i: number): number => .5 * (2 * p1[i] + (p2[i] - p0[i]) * t +
    (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t * t +
    (3 * p1[i] - p0[i] - 3 * p2[i] + p3[i]) * t * t * t);
  return [axis(0), axis(1), axis(2)];
}
function samplesFor(edge: CourseEdge): Samples {
  let data = cache.get(edge);
  if (data) return data;
  const points: CoursePoint3[] = [edge.points[0]], distances = [0];
  let distance = 0;
  for (let i = 0; i < edge.points.length - 1; i++) {
    for (let n = 1; n <= step; n++) {
      const p = curveAt(edge.points, i, n / step);
      distance += Math.hypot(...sub(p, points.at(-1)!));
      points.push(p); distances.push(distance);
    }
  }
  data = { points, distances, length: distance };
  cache.set(edge, data);
  return data;
}
const findEdge = (graph: CourseGraph, edgeId: string): CourseEdge => {
  const edge = graph.edges.find(x => x.id === edgeId);
  if (!edge) throw new RangeError(`Unknown CourseGraph edge: ${edgeId}`);
  return edge;
};
export function routeLength(graph: CourseGraph, edgeId: string): number {
  return samplesFor(findEdge(graph, edgeId)).length;
}
// Both edges of an authored join share one cross-section, even when their endpoint
// tangents differ. Blend only the frame; the centreline, odometer and gates stay put.
const joinDirections = new WeakMap<CourseGraph, Map<string, CoursePoint3>>();
function joinDirection(graph: CourseGraph, node: string): CoursePoint3 | undefined {
  let directions = joinDirections.get(graph);
  if (!directions) {
    directions = new Map();
    for (let i = 1; i < graph.groundRoute.length; i++) {
      const incoming = findEdge(graph, graph.groundRoute[i - 1]), outgoing = findEdge(graph, graph.groundRoute[i]);
      const before = samplesFor(incoming).points, after = samplesFor(outgoing).points;
      const a = unit(sub(before.at(-1)!, before.at(-3) ?? before[0]));
      const b = unit(sub(after[2] ?? after.at(-1)!, after[0]));
      directions.set(outgoing.from, unit([a[0] + b[0], a[1] + b[1], a[2] + b[2]]));
    }
    joinDirections.set(graph, directions);
  }
  return directions.get(node);
}

function joinedForward(graph: CourseGraph, edge: CourseEdge, localS: number, length: number, forward: CoursePoint3): CoursePoint3 {
  const reach = graph.groundJoinBlend ?? 0;
  const atStart = localS <= length / 2;
  const gap = atStart ? localS : length - localS;
  if (gap >= reach) return forward;
  const shared = joinDirection(graph, atStart ? edge.from : edge.to);
  if (!shared) return forward;
  const t = gap / reach, blend = 1 - t * t * (3 - 2 * t);
  const mix = (i: 0 | 1 | 2) => forward[i] + (shared[i] - forward[i]) * blend;
  return unit([mix(0), mix(1), mix(2)]);
}

/** Arc-length distance in metres, shared by geometry, vehicle pose, camera and AI. */
export function sampleRoute(graph: CourseGraph, edgeId: string, distance: number): CourseRouteFrame {
  const edge = findEdge(graph, edgeId), data = samplesFor(edge);
  const localS = Number.isFinite(distance) ? Math.max(0, Math.min(data.length, distance)) : 0;
  let low = 0, high = data.distances.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (data.distances[middle] < localS) low = middle; else high = middle;
  }
  const gap = data.distances[high] - data.distances[low];
  const t = gap > 0 ? (localS - data.distances[low]) / gap : 0;
  const a = data.points[low], b = data.points[high];
  const lerp = (i: number): number => a[i] + (b[i] - a[i]) * t;
  const point: CoursePoint3 = [lerp(0), lerp(1), lerp(2)];
  const before = data.points[Math.max(0, low - 1)], after = data.points[Math.min(data.points.length - 1, high + 1)];
  const forward = joinedForward(graph, edge, localS, data.length, unit(sub(after, before)));
  const horizontal = Math.hypot(forward[0], forward[2]);
  const right: CoursePoint3 = horizontal > 1e-7
    ? [-forward[2] / horizontal, 0, forward[0] / horizontal] : [1, 0, 0];
  const up = unit(cross(right, forward));
  const prev = unit(sub(a, before)), next = unit(sub(after, b));
  const curvature = Math.hypot(...sub(prev, next)) / Math.max(1, data.distances[high] - data.distances[low]);
  return { edgeId, localS, point, forward, right, up, width: edge.width, curvature };
}
