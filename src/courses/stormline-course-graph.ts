import { validateCourseGraph, type CourseGraph, type CourseNodeKind } from '../course-graph.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';
import { STORMLINE_MEGACITY } from './stormline-megacity.ts';

/**
 * Adapt this map's authored edges to the EXISTING shared CourseGraph runtime.
 * Keeps the homepage Coming Soon; registration, simulation, collisions and AI
 * remain owned by the shared integration branch.
 */
const course = STORMLINE_MEGACITY;
const checkpoints = course.checkpoints.map(gate => gate.node).filter(id => id !== course.finish);
const checkpointNodes = new Set(checkpoints);
const splitNodes = new Set(course.forks.map(fork => fork.from));
const nodeKind = (id: string): CourseNodeKind => {
  if (id === course.start) return 'start';
  if (id === course.finish) return 'finish';
  if (checkpointNodes.has(id)) return 'checkpoint';
  return splitNodes.has(id) ? 'split' : 'merge';
};

export const STORMLINE_COURSE_GRAPH: CourseGraph = validateCourseGraph({
  id: course.id,
  version: course.graphVersion,
  start: course.start,
  finish: course.finish,
  nodes: Object.entries(course.nodes).map(([id, at]) => ({ id, kind: nodeKind(id), at })),
  edges: course.edges.map(edge => ({
    id: edge.id, from: edge.from, to: edge.to, points: edge.points, width: edge.width,
    mode: edge.mode === 'drive' ? 'ground' : 'flight',
    surface: edge.surface, layer: edge.layer,
  })),
  checkpoints,
  groundRoute: course.mainRoute,
});

/** Authoritative arc-length metres shared by scenery, road contact and future AI. */
export const stormlineRoadLength = (edgeId: string): number => routeLength(STORMLINE_COURSE_GRAPH, edgeId);

/** Canonical frame for the existing createStormlineChunk sampler argument. */
export const sampleStormlineRoad = (edgeId: string, localS: number) => {
  const { point, right, up } = sampleRoute(STORMLINE_COURSE_GRAPH, edgeId, localS);
  return { point, right, up };
};
