// Coming Soon minimaps share the CourseGraph the race actually drives.
import type { CourseGraph } from './course-graph.ts';
import { COURSE_RUNTIMES } from './course-runtimes.ts';
import { FROSTBITE_CANYON_GRAPH } from './courses/frostbite-canyon.ts';
import { PLAYABLE_COURSE_GRAPH as monsoonGraph } from './courses/monsoon-ruins-runtime-adapter.ts';
import { PLAYABLE_COURSE_GRAPH as stormlineGraph } from './courses/stormline-megacity-runtime-adapter.ts';
import { PLAYABLE_COURSE_GRAPH as volcanicGraph } from './courses/volcanic-crown-runtime-adapter.ts';

const MEASURED_GRAPHS: Readonly<Record<string, CourseGraph>> = Object.freeze({
  'monsoon-ruins': monsoonGraph,
  'volcanic-crown': volcanicGraph,
  'stormline-megacity': stormlineGraph,
  'frostbite-canyon': FROSTBITE_CANYON_GRAPH,
});

/** Playable course for a minimap. Classic tracks and unknown ids have none. */
export function minimapGraph(trackId: string): CourseGraph | undefined {
  return COURSE_RUNTIMES[trackId]?.spec.graph ?? MEASURED_GRAPHS[trackId];
}
