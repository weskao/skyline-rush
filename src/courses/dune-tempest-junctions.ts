import { routeLength, sampleRoute } from '../course-route-frame.ts';
import { createDuneCourseGraph } from './dune-tempest-graph.ts';

type Point3 = readonly [number, number, number];
type Course = Parameters<typeof createDuneCourseGraph>[0];

// Controls nearer a node than REACH are replaced; the blend covers SPAN of the chord to the
// first kept control; two collinear points over RUN of it pin the shared node tangent exactly
// (the shared Catmull-Rom end tangent only depends on the first three controls).
// An end that must turn more than HERMITE_TURN follows a cubic Hermite from the run to the
// authored curve instead (the eased blend kinks there); HERMITE_SCALE sizes its tangents.
const REACH = 80, SPAN = .8, RUN = .05, SAMPLES = [.15, .35, .6];
const HERMITE_TURN = 60, HERMITE_SCALE = 1.1, HERMITE_SAMPLES = [.1, .2, .3, .4, .5, .6, .7, .8, .9];
const flat = (a: Point3, b: Point3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const ease = (u: number) => u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10);

/** Q9: make every Dune junction tangent-continuous by editing only control points near nodes.
 * Each node gets one horizontal tangent (a flight edge's authored heading, else the mean of its
 * edge-end headings); each ground edge end runs straight along it, then rejoins the authored
 * curve before its first kept control. Flight edges are left exactly as authored.
 */
export function smoothDuneJunctions<E extends Course['edges'][number]>(
  course: Omit<Course, 'edges'> & { readonly edges: readonly E[] }) {
  const graph = createDuneCourseGraph(course);
  // A node touched by a flight edge takes that edge's authored heading, so the flight pads and
  // gap stay exactly as authored and the ground side absorbs the kink; other nodes use the mean.
  const sums = new Map<string, [number, number]>(), pinned = new Set<string>();
  for (const edge of graph.edges) {
    for (const [nodeId, s] of [[edge.from, 0], [edge.to, routeLength(graph, edge.id)]] as const) {
      if (pinned.has(nodeId)) continue;
      const f = sampleRoute(graph, edge.id, s).forward, size = Math.hypot(f[0], f[2]);
      const sum = edge.mode === 'flight' ? [0, 0] : sums.get(nodeId) ?? [0, 0];
      sums.set(nodeId, [sum[0] + f[0] / size, sum[1] + f[2] / size]);
      if (edge.mode === 'flight') pinned.add(nodeId);
    }
  }
  const tangent = (nodeId: string, sign: number): [number, number] => {
    const [x, z] = sums.get(nodeId)!, size = Math.hypot(x, z);
    return [sign * x / size, sign * z / size];
  };
  const blend = (node: Point3, [tx, tz]: [number, number], along: (s: number) => Point3,
    span: number): Point3[] => {
    const run = RUN * span;
    const line = (s: number): Point3 => [node[0] + tx * s, node[1], node[2] + tz * s];
    const eased = (s: number): Point3 => {
      const w = ease((s - 2 * run) / (span - 2 * run)), o = along(s), l = line(s);
      return [w * o[0] + (1 - w) * l[0], w * o[1] + (1 - w) * l[1], w * o[2] + (1 - w) * l[2]];
    };
    const a = line(2 * run), b = along(span), b1 = along(span + 1);
    const d = [b1[0] - b[0], b1[1] - b[1], b1[2] - b[2]], size = Math.hypot(...d);
    const turn = Math.acos(Math.min(1, Math.max(-1, (d[0] * tx + d[2] * tz) / Math.hypot(d[0], d[2]))));
    if (turn * 180 / Math.PI <= HERMITE_TURN) {
      return [line(run), a, ...SAMPLES.map(u => eased(2 * run + (span - 2 * run) * u))];
    }
    const scale = HERMITE_SCALE * flat(a, b);
    const m0 = [tx * scale, 0, tz * scale], m1 = d.map(v => v / size * scale);
    const hermite = (t: number) => {
      const h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t;
      const h01 = 3 * t ** 2 - 2 * t ** 3, h11 = t ** 3 - t ** 2;
      return [0, 1, 2].map(i => h00 * a[i] + h10 * m0[i] + h01 * b[i] + h11 * m1[i]) as unknown as Point3;
    };
    return [line(run), a, ...HERMITE_SAMPLES.map(hermite)];
  };

  const blendMeters: Record<string, readonly [number, number]> = {};
  const edges = course.edges.map(edge => {
    const p = edge.controlPoints, n = p.length, length = routeLength(graph, edge.id);
    if (edge.surface === 'air-route') {
      blendMeters[edge.id] = [0, 0];
      return edge;
    }
    let first = 1, last = n - 2;
    while (first < last && flat(p[first], p[0]) < REACH) first++;
    while (last > first && flat(p[last], p[n - 1]) < REACH) last--;
    const head = SPAN * flat(p[first], p[0]), tail = SPAN * flat(p[last], p[n - 1]);
    blendMeters[edge.id] = [head, tail];
    const controlPoints = [p[0],
      ...blend(p[0], tangent(edge.from, 1), s => sampleRoute(graph, edge.id, s).point, head),
      ...p.slice(first, last + 1),
      ...blend(p[n - 1], tangent(edge.to, -1),
        s => sampleRoute(graph, edge.id, length - s).point, tail).reverse(),
      p[n - 1]];
    return { ...edge, controlPoints };
  });
  return { edges, blendMeters };
}
