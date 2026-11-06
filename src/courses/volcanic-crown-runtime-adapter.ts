/** Volcanic Crown's opt-in CourseGraph bridge. No race registration or unlocks. */
import { validateCourseGraph, type CourseGraph } from '../course-graph.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';
import {
  VOLCANIC_CROWN_COURSE_GRAPH,
  VOLCANIC_CROWN_DIRECTIONAL_GATES,
  VOLCANIC_CROWN_EDGES,
  sampleVolcanicRoute,
  volcanicRecovery,
  type VolcanicGateState,
} from './volcanic-crown.ts';
import {
  VOLCANIC_OBSTACLES,
  volcanicObstaclePose,
  volcanicObstacleContact,
  volcanicObstacleSweptContact,
  volcanicAIAvoidanceHints,
  validateVolcanicObstacles,
} from './volcanic-crown-obstacles.ts';
import {
  createRouteProgress,
  advanceRouteProgress,
  type RouteCrossing,
  type RouteProgress,
} from '../course-progress.ts';

/** Preserve authored edges, fork joins, height profiles, and ground-only risk shortcut. */
export const PLAYABLE_COURSE_GRAPH: CourseGraph = validateCourseGraph(VOLCANIC_CROWN_COURSE_GRAPH);

if (!validateVolcanicObstacles()) {
  throw new Error('Invalid Volcanic Crown physical obstacle metadata');
}

/** Same arc-length frame as the authored road mesh, scenery and obstacle poses. */
export function sampleVolcanicCourseFrame(edgeId: string, localS: number) {
  return sampleRoute(PLAYABLE_COURSE_GRAPH, edgeId, localS);
}

/** Physical progression additionally requires road-layer contact at signed gates. */
export function advanceVolcanicCourseProgress(
  state: RouteProgress,
  crossing: RouteCrossing,
): RouteProgress {
  const edge = PLAYABLE_COURSE_GRAPH.edges.find(item => item.id === crossing.edgeId);
  if (!edge || edge.mode !== 'ground') return state;
  const gate = VOLCANIC_CROWN_DIRECTIONAL_GATES.find(item =>
    item.nodeId === edge.to && item.incomingEdgeId === edge.id);
  if (gate) {
    const position = crossing.position;
    if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) return state;
    // A horizontal projection inside the gate is not enough: a flying vehicle
    // above (or below) the road must not receive checkpoint/finish credit.
    const difference = position.map((coordinate, i) => coordinate - gate.point[i]);
    const altitude = difference.reduce((sum, coordinate, i) => sum + coordinate * gate.up[i], 0);
    if (Math.abs(altitude) > 2.5) return state;
  }
  return advanceRouteProgress(PLAYABLE_COURSE_GRAPH, state, crossing);
}

/** Read-only provider consumed by future shared race integration. */
export const VOLCANIC_CROWN_RUNTIME = {
  graph: PLAYABLE_COURSE_GRAPH,
  sample: sampleVolcanicCourseFrame,
  edgeLength: (edgeId: string) => routeLength(PLAYABLE_COURSE_GRAPH, edgeId),
  createProgress: () => createRouteProgress(PLAYABLE_COURSE_GRAPH),
  advanceProgress: advanceVolcanicCourseProgress,
  recovery: (state: RouteProgress) => volcanicRecovery({
    nextCheckpoint: state.nextCheckpoint,
    finished: state.finished,
  } satisfies VolcanicGateState),
  gates: VOLCANIC_CROWN_DIRECTIONAL_GATES,
  obstacles: VOLCANIC_OBSTACLES,
  obstaclePose: volcanicObstaclePose,
  obstacleContact: volcanicObstacleContact,
  obstacleSweptContact: volcanicObstacleSweptContact,
  aiAvoidanceHints: volcanicAIAvoidanceHints,
} as const;

// Internal consistency: the authoring sampler and canonical runtime must agree.
// Import kept visible to make the continuity invariant testable without another
// approximation of the road or any per-course physics implementation.
export { sampleVolcanicRoute, VOLCANIC_CROWN_EDGES };
