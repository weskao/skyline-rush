import type { CoursePoint3 } from '../course-graph.ts';
import { routeLength } from '../course-route-frame.ts';
import {
  SKYFALL_COURSE, getSkyfallEdgeLength, hasSkyfallRoadContact,
  sampleSkyfallRoad,
} from './skyfall-archipelago.ts';
import { SKYFALL_GRAPH } from './skyfall-course-graph.ts';

/** The already-validated canonical topology; retain object identity for shared caches. */
export const PLAYABLE_COURSE_GRAPH = SKYFALL_GRAPH;

/**
 * Skyfall's rendered mesh is sampled by sampleSkyfallRoad using its own 32-step
 * arc-length table. The canonical graph sampler uses 24 steps; convert metres
 * before querying the physical road to keep gaps and landing positions aligned.
 * Never use this adapter as permission to cross a signed checkpoint/finish gate.
 */
export function skyfallPhysicalDistance(edgeId: string, graphS: number): number {
  const graphLength = routeLength(PLAYABLE_COURSE_GRAPH, edgeId);
  if (!Number.isFinite(graphS)) throw new RangeError('Non-finite Skyfall distance');
  return Math.min(graphLength, Math.max(0, graphS)) / graphLength * getSkyfallEdgeLength(edgeId);
}

export function sampleSkyfallRuntimeRoad(edgeId: string, graphS: number) {
  const physicalS = skyfallPhysicalDistance(edgeId, graphS);
  const road = sampleSkyfallRoad(edgeId, physicalS);
  return {
    edgeId,
    localS: Math.min(routeLength(PLAYABLE_COURSE_GRAPH, edgeId), Math.max(0, graphS)),
    physicalS,
    point: [road.point.x, road.point.y, road.point.z] as CoursePoint3,
    forward: road.forward as CoursePoint3,
    right: road.right as CoursePoint3,
    up: road.up as CoursePoint3,
    width: road.width,
    bank: road.bank,
    roadContact: hasSkyfallRoadContact(edgeId, physicalS),
  };
}

/**
 * Checks physical support for an entire monotone step, not just its endpoints.
 * The source's air edges have genuine missing slabs; their spline control
 * points must never be mistaken for asphalt. This is a map-specific predicate,
 * not a replacement for trusted motion, collision, signed gates or flight physics.
 */
export function canTraverseSkyfallRoad(
  edgeId: string,
  fromS: number,
  toS: number,
  state: { readonly flightAuthorized: boolean; readonly airborne: boolean; readonly landing?: boolean },
): boolean {
  const edge = SKYFALL_COURSE.edges.find(item => item.id === edgeId);
  if (!edge || !Number.isFinite(fromS) || !Number.isFinite(toS) ||
      fromS < 0 || toS < fromS || toS > routeLength(PLAYABLE_COURSE_GRAPH, edgeId)) return false;
  if (edge.mode === 'air' && !state.flightAuthorized) return false;
  if (state.airborne && !state.flightAuthorized) return false;
  const from = skyfallPhysicalDistance(edgeId, fromS);
  const to = skyfallPhysicalDistance(edgeId, toS);
  const crossesGap = edge.gaps.some(gap => from < gap.to && to > gap.from);
  if (crossesGap && !(state.flightAuthorized && state.airborne)) return false;
  // A landing is legal only on actual road, never in an empty bridge span.
  if (state.landing && !hasSkyfallRoadContact(edgeId, to)) return false;
  if (!state.airborne && !hasSkyfallRoadContact(edgeId, to)) return false;
  return true;
}
