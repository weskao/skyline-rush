import type { CourseGraph } from './course-graph.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';

export interface CourseMapLine {
  edgeId: string;
  mode: 'ground' | 'flight';
  ground: boolean;
  points: { x: number; y: number }[];
}

/** Share one projection between static SVG edges and exact per-edge live markers. */
export function createCourseRouteProjection(graph: CourseGraph, count = 64) {
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
  const xMin = Math.min(...all.map(p => p.x)), xMax = Math.max(...all.map(p => p.x));
  const yMin = Math.min(...all.map(p => p.y)), yMax = Math.max(...all.map(p => p.y));
  const xSize = Math.max(xMax - xMin, 1), ySize = Math.max(yMax - yMin, 1);
  const project = (p: { x: number; y: number }) => ({
    x: .08 + .84 * (p.x - xMin) / xSize,
    y: .08 + .84 * (p.y - yMin) / ySize,
  });
  return {
    lines: lines.map(line => ({ ...line, points: line.points.map(project) })),
    marker(edgeId: string, localS: number) {
      const frame = sampleRoute(graph, edgeId, localS);
      return project({ x: frame.point[0], y: -frame.point[2] });
    },
  };
}
/** Fit all graph choices into one map frame; samples share the real road's arc lengths. */
export function courseRouteOverview(graph: CourseGraph, count = 64): CourseMapLine[] {
  return createCourseRouteProjection(graph, count).lines;
}
