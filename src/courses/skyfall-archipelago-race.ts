// Skyfall Archipelago as a gated classic sprint on the CourseGraph runtime (spec §4, §5.1; Q5, Q6, Q8). Data only.
import type { TrackConfig } from '../game-types.ts';
import type { CourseHazard, CourseRaceSpec } from '../course-race.ts';
import { routeLength } from '../course-route-frame.ts';
import { SKYFALL_COURSE, SKYFALL_OBSTACLES } from './skyfall-archipelago.ts';
import { PLAYABLE_COURSE_GRAPH as graph } from './skyfall-archipelago-runtime-adapter.ts';

export const SKYFALL_ARCHIPELAGO_ID = 'skyfall-archipelago';
const AI_PREVIEW_METRES = 120; // same rival look-ahead as Dune's authored hazards
const CAR_HEIGHT = 1.2; // mirrors game.js CAR_HEIGHT (importing game.js here would be circular); the test pins it

const air = SKYFALL_COURSE.edges.filter(e => e.mode === 'air');
const groundTwin = (split: string, merge: string): string => {
  const twin = SKYFALL_COURSE.edges.find(e => e.mode === 'ground' && e.from === split && e.to === merge);
  if (!twin) throw new Error(`Skyfall flight edge ${split}→${merge} has no ground alternative`);
  return twin.id;
};

export const SKYFALL_ARCHIPELAGO_RACE: CourseRaceSpec = {
  graph,
  gateHeight: { minHeight: -2, maxHeight: 12 + CAR_HEIGHT }, // Q6: engine envelope
  // Q5: one sampler, so the authored gaps are already graph metres.
  noRoad: Object.fromEntries(air.map(e => [e.id, e.gaps.map(g => [g.from, g.to] as const)])),
  recoveryEdge: Object.fromEntries(air.map(e => [e.id, groundTwin(e.from, e.to)])),
  hazards: SKYFALL_OBSTACLES.map((o): CourseHazard => ({
    id: o.id, edgeId: o.edgeId, localS: o.distance, lateral: o.lateral, radius: o.radius,
    safePassSide: o.lateral > 0 ? 'left' : 'right', aiPreview: AI_PREVIEW_METRES,
  })),
};

const groundLength = graph.groundRoute.reduce((sum, id) => sum + routeLength(graph, id), 0);

// Rings, pickups and traffic come from the shared generators, re-keyed onto graph edges (course-items.ts); hazards and
// sections come from the spec. Traffic density sits in the classic range (user, 2026-11-09: Classic has road traffic).
export const SKYFALL_ARCHIPELAGO_TRACK: TrackConfig & { topology: 'course-graph-runtime'; topologyVersion: number } = {
  name: 'Skyfall Archipelago', length: Math.floor(groundLength), trafficDensity: 0.75, seed: 16016,
  layoutVersion: 1, sections: [], topology: 'course-graph-runtime', topologyVersion: graph.version,
};
