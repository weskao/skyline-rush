/** Stormline-only metadata bridge. The shared CourseGraph owns route sampling and
 * topology; the host simulation remains responsible for authoritative signed
 * gate crossings, physics responses, and active-edge/layer selection. */
import type { CoursePoint3 } from '../course-graph.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';
import { STORMLINE_COURSE_GRAPH } from './stormline-course-graph.ts';
import { STORMLINE_MEGACITY } from './stormline-megacity.ts';

/** Do not rebuild or flatten the already validated shared topology. */
export const PLAYABLE_COURSE_GRAPH = STORMLINE_COURSE_GRAPH;
export const stormlineRuntimeFrame = (edgeId: string, metres: number) =>
  sampleRoute(PLAYABLE_COURSE_GRAPH, edgeId, metres);
export const stormlineRuntimeLength = (edgeId: string) =>
  routeLength(PLAYABLE_COURSE_GRAPH, edgeId);

/** Includes FINISH, intentionally excluded from CourseGraph.checkpoints. */
export const STORMLINE_CHECKPOINT_ENVELOPES = STORMLINE_MEGACITY.checkpoints;

/** Broad-phase gate VOLUME only. A true collection additionally requires the
 * shared signed crossing, ordered progress, trusted pose and edge transition. */
export function stormlineCheckpointVolumeCandidate(
  nodeId: string, arrivingEdgeId: string, position: CoursePoint3,
): boolean {
  if (!finite(position)) return false;
  const gate = STORMLINE_CHECKPOINT_ENVELOPES.find(item => item.node === nodeId);
  const edge = PLAYABLE_COURSE_GRAPH.edges.find(item => item.id === arrivingEdgeId);
  const at = STORMLINE_MEGACITY.nodes[nodeId];
  if (!gate || !edge || edge.to !== nodeId || !at) return false;
  return position[1] >= gate.minY && position[1] <= gate.maxY &&
    Math.hypot(position[0] - at[0], position[2] - at[2]) <= gate.radius;
}

const finite = (point: CoursePoint3): boolean =>
  Array.isArray(point) && point.length === 3 && point.every(Number.isFinite);
const dot = (a: readonly number[], b: readonly number[]) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Edge-local, 3D obstacle candidates. A street collision must never be emitted
 * for a car currently on a viaduct, in a tunnel, or flying above that road.
 * Does not apply a physics response or replace the shared collision engine. */
export function stormlineObstacleCollisionCandidates(
  activeEdgeId: string, position: CoursePoint3,
): typeof STORMLINE_MEGACITY.obstacles[number][] {
  if (!finite(position)) return [];
  const edge = PLAYABLE_COURSE_GRAPH.edges.find(item => item.id === activeEdgeId);
  if (!edge || edge.mode !== 'ground') return [];
  return STORMLINE_MEGACITY.obstacles.filter(obstacle => {
    if (obstacle.edge !== activeEdgeId || !obstacle.solid) return false;
    const frame = stormlineRuntimeFrame(activeEdgeId, obstacle.s);
    const displacement = [
      position[0] - frame.point[0],
      position[1] - frame.point[1],
      position[2] - frame.point[2],
    ];
    const along = dot(displacement, frame.forward);
    const lateral = dot(displacement, frame.right) - obstacle.lateral;
    const height = dot(displacement, frame.up);
    return Math.abs(along) <= obstacle.radius * 1.25 &&
      Math.abs(lateral) <= obstacle.radius && height >= 0 && height <= obstacle.height;
  });
}
