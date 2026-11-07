import type { CourseGraph } from './course-graph.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';

export interface CourseMapLine {
  edgeId: string;
  mode: 'ground' | 'flight';
  ground: boolean;
  points: { x: number; y: number }[];
}

/** Fit all graph choices into one map frame; samples share the real road's arc lengths. */
export function courseRouteOverview(graph: CourseGraph, count = 64): CourseMapLine[] {
  const size = Number.isInteger(count) ? Math.max(2, Math.min(1000, count)) : 64;
  const lines = graph.edges.map(edge => {
    const length = routeLength(graph, edge.id);
    const points = Array.from({ length: size }, (_, i) => {
      const world = sampleRoute(graph, edge.id, length * i / (size - 1)).point;
      return { x: world[0], y: -world[2] };
    });
    return { edgeId: edge.id, mode: edge.mode, ground: edge.mode === 'ground', points };
  });
  const all = lines.flatMap(line => line.points);
  if (!all.length) return lines;
  const xMin = Math.min(...all.map(p => p.x)), xMax = Math.max(...all.map(p => p.x));
  const yMin = Math.min(...all.map(p => p.y)), yMax = Math.max(...all.map(p => p.y));
  const xSize = Math.max(xMax - xMin, 1), ySize = Math.max(yMax - yMin, 1);
  return lines.map(line => ({ ...line, points: line.points.map(p => ({
    x: .08 + .84 * (p.x - xMin) / xSize,
    y: .08 + .84 * (p.y - yMin) / ySize,
  })) }));
}
