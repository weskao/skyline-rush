import { validateCourseGraph, type CourseGraph, type CourseNode, type CourseEdge }
  from '../course-graph.ts';
import { SKYFALL_COURSE, SKYFALL_GROUND_PATH } from './skyfall-archipelago.ts';

// The shared graph represents mandatory merge checkpoints; FINISH is the
// fourth authored gate, not a checkpoint-kind node. Do not invent a fifth gate.
// Flight gaps still require hasSkyfallRoadContact from the authored course;
// CourseGraph's mode alone is NOT evidence of a continuous physical bridge.
export const SKYFALL_GRAPH: CourseGraph = validateCourseGraph({
  id: SKYFALL_COURSE.id,
  version: SKYFALL_COURSE.version,
  start: SKYFALL_COURSE.start,
  finish: SKYFALL_COURSE.finish,
  nodes: SKYFALL_COURSE.nodes.map((node): CourseNode => ({
    id: node.id,
    kind: node.kind === 'merge' ? 'checkpoint' : node.kind,
    at: [node.position.x, node.position.y, node.position.z],
  })),
  edges: SKYFALL_COURSE.edges.map((edge): CourseEdge => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    mode: edge.mode === 'air' ? 'flight' : 'ground',
    width: edge.width,
    points: edge.points.map(point => [point.x, point.y, point.z]),
  })),
  checkpoints: SKYFALL_COURSE.checkpoints.filter(id => id !== SKYFALL_COURSE.finish),
  groundRoute: [...SKYFALL_GROUND_PATH],
});
