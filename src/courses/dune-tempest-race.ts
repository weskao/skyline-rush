// Dune Tempest as a gated classic sprint on the CourseGraph runtime (spec §4, §5.1, §9). Registers data only:
// readiness stays 'preview' until the browser acceptance spec lands.
import type { TrackConfig } from '../game-types.ts';
import type { CourseHazard, CourseRaceSpec } from '../course-race.ts';
import { routeLength } from '../course-route-frame.ts';
import { PLAYABLE_COURSE_GRAPH as graph, DUNE_TEMPEST_RUNTIME_METADATA as meta } from './dune-tempest-runtime-adapter.ts';

export const DUNE_TEMPEST_ID = 'dune-tempest';

/** Flight-edge gaps are the complement of the solid road intervals (graph metres). */
function gaps(length: number, solid: readonly (readonly number[])[]): [number, number][] {
  const out: [number, number][] = [];
  let at = 0;
  for (const [from, to] of solid) { if (from > at) out.push([at, from]); at = Math.max(at, to); }
  if (at < length) out.push([at, length]);
  return out;
}

export const DUNE_TEMPEST_RACE: CourseRaceSpec = {
  graph,
  gateHeight: {
    minHeight: Math.min(...meta.gates.map(g => g.minRelativeAltitudeMeters)),
    maxHeight: Math.max(...meta.gates.map(g => g.maxRelativeAltitudeMeters)),
  },
  noRoad: Object.fromEntries(meta.flightShortcuts.map(f => [f.edgeId, gaps(f.lengthMeters, f.solidRoadIntervals)])),
  recoveryEdge: Object.fromEntries(meta.flightShortcuts.map(f => [f.edgeId, f.recoveryEdgeId])),
  hazards: meta.hazards.map((h): CourseHazard => ({
    id: h.id, edgeId: h.edgeId, localS: h.atFraction * routeLength(graph, h.edgeId),
    lateral: h.lateralMeters, radius: h.collisionRadiusMeters, safePassSide: h.safePassSide, aiPreview: h.aiPreviewMeters,
  })),
};

const groundLength = graph.groundRoute.reduce((sum, id) => sum + routeLength(graph, id), 0);

// Every 1D list is empty: rings, pickups, traffic and hazards come from the graph runtime, never the shared generators.
export const DUNE_TEMPEST_TRACK: TrackConfig & { topology: 'course-graph-runtime'; topologyVersion: 1 } = {
  name: 'Dune Tempest', length: Math.floor(groundLength), trafficDensity: 0, seed: 13013,
  layoutVersion: 1, sections: [], topology: 'course-graph-runtime', topologyVersion: 1,
};
