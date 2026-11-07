import type { SkyfallEdge, SkyfallVec3 } from './skyfall-archipelago.ts';

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

/** Q9: enforce one physical incoming/outgoing tangent at every shared Skyfall junction.
 * Flight pad control points remain authored: adjacent ground approaches absorb their mismatch.
 * Only new guide points within 36m of edge endpoints are introduced; no node or gap moves.
 */
export function smoothSkyfallJunctions(authored: readonly SkyfallEdge[]): SkyfallEdge[] {
  const directions = new Map<string, SkyfallVec3>(), pinned = new Set<string>();
  for (const edge of authored) {
    const first = unit(difference(edge.points[1], edge.points[0]));
    const last = unit(difference(edge.points.at(-1)!, edge.points.at(-2)!));
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
