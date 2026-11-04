import type { CourseGraph } from '../course-graph.ts';
import { SKYFALL_COURSE } from './skyfall-archipelago.ts';

// Contract adapter: each Skyfall authored node/edge must remain the source of truth.
// RED scaffold. Fill only after the canonical adapter test fails in CI.
export const SKYFALL_GRAPH: CourseGraph = {
  id: SKYFALL_COURSE.id,
  version: SKYFALL_COURSE.version,
  start: SKYFALL_COURSE.start,
  finish: SKYFALL_COURSE.finish,
  nodes: [],
  edges: [],
  checkpoints: [],
  groundRoute: [],
};
