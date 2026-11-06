import { validateCourseGraph, type CourseGraph } from '../course-graph.ts';
import { routeLength } from '../course-route-frame.ts';
import { DUNE_TEMPEST_COURSE, DUNE_TEMPEST_GATES, DUNE_TEMPEST_GRAPH } from './dune-tempest.ts';
import { duneSurfaceIntervals } from './dune-tempest-geometry.ts';

/** The existing authored 3D graph is the source of truth. This does not register a race. */
export const PLAYABLE_COURSE_GRAPH: CourseGraph = validateCourseGraph(DUNE_TEMPEST_GRAPH);

// Keep map-owned safety/visual metadata alongside the canonical graph. The shared
// measured-motion, signed-gate and road samplers remain responsible for runtime authority.
export const DUNE_TEMPEST_RUNTIME_METADATA = {
  hairpins: DUNE_TEMPEST_COURSE.hairpins,
  gates: DUNE_TEMPEST_GATES,
  hazards: DUNE_TEMPEST_COURSE.hazards,
  offroadZones: DUNE_TEMPEST_COURSE.offroadZones,
  flightShortcuts: DUNE_TEMPEST_COURSE.edges.filter(edge => edge.surface === 'air-route').map(edge => {
    const { takeoff, landing } = edge;
    if (!takeoff || !landing) throw new Error(`Dune flight edge ${edge.id}: missing takeoff/landing`);
    const fallback = PLAYABLE_COURSE_GRAPH.edges.find(candidate => candidate.id === landing.recoveryEdgeId);
    if (!fallback || fallback.mode !== 'ground' || fallback.from !== edge.from || fallback.to !== edge.to) {
      throw new Error(`Dune flight edge ${edge.id}: invalid ground recovery edge`);
    }
    const lengthMeters = routeLength(PLAYABLE_COURSE_GRAPH, edge.id);
    // Preserve the 60 m real takeoff pad used by dune-tempest-chunk.ts;
    // the gap is not a solid/drivable bridge.
    const solidRoadIntervals = duneSurfaceIntervals(0, lengthMeters, lengthMeters,
      60, landing.clearLengthMeters);
    return {
      edgeId: edge.id, lengthMeters, takeoff, landing,
      recoveryEdgeId: fallback.id, solidRoadIntervals,
    };
  }),
} as const;
