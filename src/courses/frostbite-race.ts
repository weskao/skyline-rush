// Frostbite Canyon race runtime: the shared 1D race engine drives along the CourseGraph ground route.
// Distance 0 = START node, length = FINISH node. The graph's alternative edges are raced as the engine's
// existing elevated shortcut lanes over their split stretch, so physics, AI and the drawn deck agree.
import { FROSTBITE_CANYON_GRAPH as graph } from './frostbite-canyon.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';
import type { TrackConfig, TrackSection } from '../game-types.ts';
import type { Vec3 } from '../sky-track.ts';

export const FROSTBITE_ID = 'frostbite-canyon';

const legs: { edgeId: string; from: number; length: number }[] = [];
let total = 0;
for (const edgeId of graph.groundRoute) {
  const length = routeLength(graph, edgeId);
  legs.push({ edgeId, from: total, length });
  total += length;
}
const legOf = (edgeId: string) => legs.find(leg => leg.edgeId === edgeId)!;

/** Ground-route distance -> CourseGraph edge and arc-length position on it. */
export function frostbiteLeg(distance: number): { edgeId: string; localS: number } {
  const s = Number.isFinite(distance) ? Math.max(0, Math.min(total, distance)) : 0;
  let low = 0, high = legs.length - 1;
  while (low < high) { const mid = (low + high + 1) >> 1; if (legs[mid].from <= s) low = mid; else high = mid - 1; }
  return { edgeId: legs[low].edgeId, localS: s - legs[low].from };
}

/** Same shape as `trackFrame`; the point is the graph road contact the scene draws. */
export function frostbiteFrame(distance: number) {
  const { edgeId, localS } = frostbiteLeg(distance);
  const f = sampleRoute(graph, edgeId, localS);
  return { point: { x: f.point[0], y: f.point[1], z: f.point[2] }, forward: [...f.forward] as Vec3, right: [...f.right] as Vec3, up: [...f.up] as Vec3 };
}

const along = (edgeId: string, from: number, to: number, rest: Omit<TrackSection, 'from' | 'to'>): TrackSection => {
  const leg = legOf(edgeId);
  return { ...rest, from: Math.round(leg.from + from), to: Math.round(leg.from + Math.min(leg.length, to)) };
};
const span = (edgeId: string, inset: number, rest: Omit<TrackSection, 'from' | 'to'>): TrackSection =>
  along(edgeId, inset, legOf(edgeId).length - inset, rest);

// Decisions: glacier ridge (left of the valley), Rift Spine ice bridge (right of the lower canyon), aurora span (left).
// Ice sits only on hard-ice edges; the observatory climb is the long uphill.
const sections: TrackSection[] = [
  span('glacier-valley', 30, { type: 'shortcut', x: -7.5, altitude: 6 }),
  along('glacier-gate', 40, 380, { type: 'ice' }),
  along('riverbed-hairpin', 200, 900, { type: 'ice' }),
  span('rift-lower-canyon', 30, { type: 'shortcut', x: 7.5, altitude: 6 }),
  along('observatory-climb', 150, 1250, { type: 'uphill' }),
  span('aurora-basin', 30, { type: 'shortcut', x: -7.5, altitude: 6 }),
  along('glacial-outlet', 900, 1700, { type: 'ice' }),
].sort((a, b) => a.from - b.from);

export const FROSTBITE_TRACK: TrackConfig & { topology: 'course-graph'; topologyVersion: 1 } = {
  name: 'Frostbite Canyon', length: Math.floor(total), trafficDensity: 0.6, seed: 12012,
  layoutVersion: 1, openingNitroRings: 2, topology: 'course-graph', topologyVersion: 1, sections,
};
