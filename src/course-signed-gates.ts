import type { CourseGraph, CoursePoint3 } from './course-graph.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';
import { advanceRouteProgress, type RouteProgress, type RouteCrossing } from './course-progress.ts';

/** Measured from authoritative vehicle poses on either side of a physical gate. */
export interface SignedGateSweep extends Omit<RouteCrossing, 'position'> {
  readonly fromPosition: CoursePoint3;
  readonly toPosition: CoursePoint3;
  readonly maxStepMetres: number;
}
export interface GateHeightBand { readonly minHeight: number; readonly maxHeight: number }
const dot = (a: CoursePoint3, b: CoursePoint3): number => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const subtract = (a: CoursePoint3, b: CoursePoint3): CoursePoint3 =>
  [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const finite = (p: CoursePoint3): boolean => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);

/** Verify a swept signed crossing before delegating order/edge checks to the shared progress gate. */
export function advanceSignedGate(
  graph: CourseGraph, state: RouteProgress, sweep: SignedGateSweep,
  height: GateHeightBand = { minHeight: -2, maxHeight: 5 },
): RouteProgress {
  const edge = graph.edges.find(e => e.id === sweep.edgeId);
  if (state.finished || state.currentEdgeId !== edge?.id || !finite(sweep.fromPosition) || !finite(sweep.toPosition)) return state;
  const length = routeLength(graph, edge.id);
  if (![sweep.fromS, sweep.toS, sweep.maxStepMetres, height.minHeight, height.maxHeight].every(Number.isFinite) ||
      sweep.maxStepMetres <= 0 || height.minHeight > height.maxHeight ||
      sweep.fromS < 0 || sweep.fromS >= length || sweep.toS < length ||
      sweep.toS - sweep.fromS > sweep.maxStepMetres + 1e-6 ||
      Math.hypot(...subtract(sweep.toPosition, sweep.fromPosition)) > sweep.maxStepMetres + 1e-6) return state;
  const node = graph.nodes.find(n => n.id === edge.to);
  if (!node) return state;
  const { forward, right, up } = sampleRoute(graph, edge.id, length);
  const before = dot(subtract(sweep.fromPosition, node.at), forward);
  const after = dot(subtract(sweep.toPosition, node.at), forward);
  if (before >= -1e-6 || after < -1e-6 || after <= before) return state;
  const fraction = -before / (after - before);
  if (fraction < 0 || fraction > 1) return state;
  const hit: CoursePoint3 = [
    sweep.fromPosition[0] + (sweep.toPosition[0] - sweep.fromPosition[0]) * fraction,
    sweep.fromPosition[1] + (sweep.toPosition[1] - sweep.fromPosition[1]) * fraction,
    sweep.fromPosition[2] + (sweep.toPosition[2] - sweep.fromPosition[2]) * fraction,
  ];
  const relative = subtract(hit, node.at), lateral = dot(relative, right), altitude = dot(relative, up);
  if (Math.abs(lateral) > edge.width / 2 || altitude < height.minHeight || altitude > height.maxHeight) return state;
  return advanceRouteProgress(graph, state, {
    edgeId: edge.id, fromS: sweep.fromS, toS: sweep.toS, position: hit,
    ...(sweep.nextEdgeId ? { nextEdgeId: sweep.nextEdgeId } : {}),
  });
}
