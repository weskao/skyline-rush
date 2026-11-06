import { routeLength, sampleRoute } from '../course-route-frame.ts';
import { createDuneCourseGraph } from './dune-tempest-graph.ts';

type Point3 = readonly [number, number, number];
type Course = Parameters<typeof createDuneCourseGraph>[0];

// Controls nearer a node than REACH are replaced; the blend covers SPAN of the chord to the
// first kept control; two collinear points over RUN of it pin the shared node tangent exactly
// (the shared Catmull-Rom end tangent only depends on the first three controls).
const REACH = 80, SPAN = .8, RUN = .05, SAMPLES = [.15, .35, .6];
const flat = (a: Point3, b: Point3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const ease = (u: number) => u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10);

/** Q9: make every Dune junction tangent-continuous by editing only control points near nodes.
 * Each node gets one horizontal tangent (mean of its edge-end headings); each edge end runs
 * straight along it, then eases back onto the authored curve before its first kept control.
 */
export function smoothDuneJunctions<E extends Course['edges'][number]>(
  course: Omit<Course, 'edges'> & { readonly edges: readonly E[] }) {
  const graph = createDuneCourseGraph(course);
  const sums = new Map<string, [number, number]>();
  for (const edge of graph.edges) {
    for (const [nodeId, s] of [[edge.from, 0], [edge.to, routeLength(graph, edge.id)]] as const) {
      const f = sampleRoute(graph, edge.id, s).forward, size = Math.hypot(f[0], f[2]);
      const sum = sums.get(nodeId) ?? [0, 0];
      sums.set(nodeId, [sum[0] + f[0] / size, sum[1] + f[2] / size]);
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
    return [line(run), line(2 * run), ...SAMPLES.map(u => eased(2 * run + (span - 2 * run) * u))];
  };

  const blendMeters: Record<string, readonly [number, number]> = {};
  const edges = course.edges.map(edge => {
    const p = edge.controlPoints, n = p.length, length = routeLength(graph, edge.id);
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
