import type { CourseGraph, CoursePoint3 } from './course-graph.ts';
import { routeLength } from './course-route-frame.ts';

/** Pure checkpoint state for new graph tracks; existing sprint results are unchanged. */
export interface RouteProgress {
  readonly currentEdgeId: string;
  readonly nextCheckpoint: number;
  readonly finished: boolean;
}
export interface RouteCrossing {
  readonly edgeId: string;
  readonly fromS: number;
  readonly toS: number;
  /** Measured vehicle world position, not only a scalar race distance. */
  readonly position: CoursePoint3;
  /** Next edge must connect at the node just crossed. Omit only at FINISH. */
  readonly nextEdgeId?: string;
}

export function createRouteProgress(graph: CourseGraph): RouteProgress {
  const first = graph.edges.find(edge => edge.id === graph.groundRoute[0]);
  if (!first || first.from !== graph.start || first.mode !== 'ground')
    throw new Error('CourseGraph must provide a valid first ground edge');
  return { currentEdgeId: first.id, nextCheckpoint: 0, finished: false };
}

/** Accept a gate only on the active edge, moving forwards through its 3D endpoint. */
export function advanceRouteProgress(graph: CourseGraph, state: RouteProgress, event: RouteCrossing): RouteProgress {
  if (state.finished || event.edgeId !== state.currentEdgeId) return state;
  const edge = graph.edges.find(e => e.id === event.edgeId);
  if (!edge || !Number.isFinite(event.fromS) || !Number.isFinite(event.toS)) return state;
  const length = routeLength(graph, edge.id);
  if (event.fromS < 0 || event.fromS >= length || event.toS < length || event.toS <= event.fromS) return state;
  const node = graph.nodes.find(n => n.id === edge.to);
  if (!node || !Array.isArray(event.position) || event.position.length !== 3 || !event.position.every(Number.isFinite)) return state;
  if (Math.hypot(...node.at.map((n, i) => n - event.position[i])) > Math.max(4, edge.width / 2)) return state;

  const isCheckpoint = node.kind === 'checkpoint';
  if (isCheckpoint && graph.checkpoints[state.nextCheckpoint] !== node.id) return state;
  const nextCheckpoint = state.nextCheckpoint + Number(isCheckpoint);
  if (node.id === graph.finish) {
    if (event.nextEdgeId || nextCheckpoint !== graph.checkpoints.length) return state;
    return { ...state, nextCheckpoint, finished: true };
  }
  const next = graph.edges.find(e => e.id === event.nextEdgeId);
  if (!next || next.from !== node.id) return state;
  return { currentEdgeId: next.id, nextCheckpoint, finished: false };
}
