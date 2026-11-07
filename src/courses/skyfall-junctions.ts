import type { SkyfallEdge, SkyfallVec3 } from './skyfall-archipelago.ts';
import type { CourseGraph } from '../course-graph.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';

const unit = (p: SkyfallVec3): SkyfallVec3 => {
  const size = Math.hypot(p.x, p.y, p.z);
  if (size < 1e-8) throw new Error('Degenerate Skyfall junction heading');
  return { x: p.x / size, y: p.y / size, z: p.z / size };
};
const difference = (a: SkyfallVec3, b: SkyfallVec3): SkyfallVec3 =>
  ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const plus = (a: SkyfallVec3, b: SkyfallVec3): SkyfallVec3 =>
  ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const along = (p: SkyfallVec3, direction: SkyfallVec3, metres: number): SkyfallVec3 =>
  ({ x: p.x + direction.x * metres, y: p.y + direction.y * metres, z: p.z + direction.z * metres });

function sampledEnds(edge: SkyfallEdge): [SkyfallVec3, SkyfallVec3] {
  const points = edge.points.map(p => [p.x, p.y, p.z] as const);
  const graph = { edges: [{ id: edge.id, from: edge.from, to: edge.to, mode: 'flight', width: edge.width, points }] };
  const single = graph as unknown as CourseGraph; // the sampler only reads `edges`
  const at = (s: number): SkyfallVec3 => {
    const [x, y, z] = sampleRoute(single, edge.id, s).forward;
    return { x, y, z };
  };
  return [at(0), at(routeLength(single, edge.id))];
}

/** Q9: enforce one physical incoming/outgoing tangent at every shared Skyfall junction.
 * Flight pad control points remain authored: adjacent ground approaches absorb their mismatch.
 * Only new guide points within 36m of edge endpoints are introduced; no node or gap moves.
 */
export function smoothSkyfallJunctions(authored: readonly SkyfallEdge[]): SkyfallEdge[] {
  const directions = new Map<string, SkyfallVec3>(), pinned = new Set<string>();
  for (const edge of authored) {
    // A flight edge keeps its authored pads, so its node heading is what the shared sampler reports there
    // (the curved first/last segment turns several degrees away from the bare chord).
    const sampled = edge.mode === 'air' ? sampledEnds(edge) : null;
    const first = sampled?.[0] ?? unit(difference(edge.points[1], edge.points[0]));
    const last = sampled?.[1] ?? unit(difference(edge.points.at(-1)!, edge.points.at(-2)!));
    for (const [id, direction] of [[edge.from, first], [edge.to, last]] as const) {
      if (edge.mode === 'air') {
        directions.set(id, direction);
        pinned.add(id);
      } else if (!pinned.has(id)) {
        directions.set(id, plus(directions.get(id) ?? { x: 0, y: 0, z: 0 }, direction));
      }
    }
  }
  for (const [node, direction] of directions) directions.set(node, unit(direction));
  const metres = 18;
  return authored.map(edge => {
    if (edge.mode === 'air') return edge; // keep actual takeoff, gap and landing geometries
    const p = edge.points, start = p[0], end = p.at(-1)!;
    const tangentStart = directions.get(edge.from)!, tangentEnd = directions.get(edge.to)!;
    return { ...edge, points: [start, along(start, tangentStart, metres),
      along(start, tangentStart, 2 * metres), ...p.slice(1, -1),
      along(end, tangentEnd, -2 * metres), along(end, tangentEnd, -metres), end] };
  });
}
