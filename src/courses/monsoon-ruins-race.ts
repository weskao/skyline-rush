// Monsoon Ruins race on the shared 1D driver, mapped by actual CourseGraph ground arc length.
// The user approved same-stretch branches for river/skybridge/canopy (dev-unlocked only).
import { PLAYABLE_COURSE_GRAPH as graph } from './monsoon-ruins-runtime-adapter.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';
import type { TrackConfig, TrackSection } from '../game-types.ts';
import type { Vec3 } from '../sky-track.ts';

export const MONSOON_ID = 'monsoon-ruins';
const legs: { edgeId: string; from: number; length: number }[] = [];
let total = 0;
for (const edgeId of graph.groundRoute) {
  const length = routeLength(graph, edgeId);
  legs.push({ edgeId, from: total, length });
  total += length;
}
/** Physical ground-route odometer -> actual edge, preserving fractional metres. */
export function monsoonLeg(distance: number): { edgeId: string; localS: number } {
  const s = Number.isFinite(distance) ? Math.max(0, Math.min(total, distance)) : 0;
  let low = 0, high = legs.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (legs[mid].from <= s) low = mid;
    else high = mid - 1;
  }
  return { edgeId: legs[low].edgeId, localS: s - legs[low].from };
}
export function monsoonFrame(distance: number): {
  point: { x: number; y: number; z: number }; forward: Vec3; right: Vec3; up: Vec3
} {
  const { edgeId, localS } = monsoonLeg(distance);
  const frame = sampleRoute(graph, edgeId, localS);
  return {
    point: { x: frame.point[0], y: frame.point[1], z: frame.point[2] },
    forward: [...frame.forward] as Vec3, right: [...frame.right] as Vec3, up: [...frame.up] as Vec3,
  };
}
const fork = (riskyId: string, x: number, deck: boolean): TrackSection => {
  const risky = graph.edges.find(edge => edge.id === riskyId);
  if (!risky) throw new Error('Unknown Monsoon fork ' + riskyId);
  const safe = graph.edges.find(edge =>
    edge.from === risky.from && edge.to === risky.to && edge.mode === 'ground');
  const leg = legs.find(item => item.edgeId === safe?.id);
  if (!leg || leg.length <= 80) throw new Error('Monsoon fork lacks a matching ground stretch: ' + riskyId);
  return {
    type: 'shortcut', from: Math.round(leg.from + 30), to: Math.round(leg.from + leg.length - 30),
    x, altitude: 6, ...(deck ? { deck: true } : {}),
  };
};
const sections: TrackSection[] = [
  fork('river-ford', -7.5, true),
  fork('waterfall-skybridge', 7.5, false),
  fork('canopy-ruins', -7.5, true),
];
export const MONSOON_TRACK: TrackConfig & { topology: 'course-graph'; topologyVersion: 1 } = {
  name: 'Monsoon Ruins', length: Math.floor(total), trafficDensity: 1, seed: 15015,
  layoutVersion: 1, openingNitroRings: 2, topology: 'course-graph', topologyVersion: 1,
  sections,
};
