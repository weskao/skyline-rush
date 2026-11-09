/** Canonical, opt-in Monsoon Ruins graph. Does not register a race. */
import type { CourseEdge, CourseGraph, CourseNode, CoursePoint3 } from '../course-graph.ts';
import { validateCourseGraph } from '../course-graph.ts';
import { MONSOON_RUINS_COURSE, sampleMonsoonRoute } from './monsoon-ruins.ts';

const course = MONSOON_RUINS_COURSE;
type AuthoredEdge = 'ground' | (typeof course.branches)[number]['id'];
const CHECKPOINT_PREFIX = 'monsoon-cp-';
// Densely re-sample the ACTUAL curved, elevated physical road rather than interpolating
// authored scalar distances as straight lines. All consumers use sampleRoute afterwards.
const MAX_CONTROL_SPACING = 12.5;

function worldPoint(edgeId: AuthoredEdge, distance: number): CoursePoint3 {
  return sampleMonsoonRoute(edgeId, distance).point;
}
function controls(edgeId: AuthoredEdge, from: number, to: number): readonly CoursePoint3[] {
  const pieces = Math.max(1, Math.ceil((to - from) / MAX_CONTROL_SPACING));
  return Array.from({ length: pieces + 1 }, (_, index) =>
    worldPoint(edgeId, from + (to - from) * index / pieces));
}

const checkpoints = course.checkpoints.map((distance, index) => ({
  // The authored temple node already IS checkpoint #3; do not create a
  // duplicate colocated node/zero-length edge at its exact distance.
  id: course.nodes.find(node => node.distance === distance && node.type === 'checkpoint')?.id
    ?? `${CHECKPOINT_PREFIX}${index + 1}`,
  distance,
}));
const anchors: { id: string; distance: number; kind: CourseNode['kind'] }[] = [
  ...course.nodes.map(node => ({ id: node.id, distance: node.distance, kind: node.type })),
  ...checkpoints.filter(cp => !course.nodes.some(node => node.id === cp.id))
    .map(cp => ({ id: cp.id, distance: cp.distance, kind: 'checkpoint' as const })),
].sort((a, b) => a.distance - b.distance);

const nodes: CourseNode[] = anchors.map(anchor => ({
  id: anchor.id, kind: anchor.kind, at: worldPoint('ground', anchor.distance),
}));

const groundEdges: CourseEdge[] = anchors.slice(0, -1).map((anchor, index) => {
  const end = anchors[index + 1];
  return {
    id: `monsoon-ground-${index}`, from: anchor.id, to: end.id,
    points: controls('ground', anchor.distance, end.distance),
    width: course.roadWidth, mode: 'ground', surface: 'mud-road', layer: 'ground',
  };
});
const branchEdges: CourseEdge[] = course.branches.map(branch => ({
  id: branch.id, from: branch.fromNode, to: branch.toNode,
  points: controls(branch.id, branch.from, branch.to),
  width: branch.width, mode: branch.mode === 'air' ? 'flight' : 'ground',
  surface: branch.surface, layer: branch.id,
}));

/** Canonical shared graph. Checkpoint height/lane enforcement belongs to advanceSignedGate. */
export const PLAYABLE_COURSE_GRAPH: CourseGraph = validateCourseGraph({
  id: course.id, version: course.graphVersion,
  start: course.start, finish: course.finish,
  nodes, edges: [...groundEdges, ...branchEdges],
  checkpoints: checkpoints.map(cp => cp.id),
  groundRoute: groundEdges.map(edge => edge.id),
});
