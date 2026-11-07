// Stormline Megacity race runtime: the shared 1D race engine drives along the CourseGraph ground route
// (`mainRoute`). Distance 0 = START node, length = FINISH node. Each fork's risky edge is raced as the engine's
// existing elevated shortcut lane over its safe edge (same pattern as Frostbite Canyon; dev-unlocked only).
import { stormlineRuntimeFrame as sampleEdge, stormlineRuntimeLength as edgeLength, PLAYABLE_COURSE_GRAPH as graph } from './stormline-megacity-runtime-adapter.ts';
import { STORMLINE_MEGACITY } from './stormline-megacity.ts';
import type { TrackConfig, TrackSection } from '../game-types.ts';
import type { Vec3 } from '../sky-track.ts';

export const STORMLINE_ID = 'stormline-megacity';

const legs: { edgeId: string; from: number; length: number }[] = [];
let total = 0;
for (const edgeId of graph.groundRoute) {
  const length = edgeLength(edgeId);
  legs.push({ edgeId, from: total, length });
  total += length;
}
const legOf = (edgeId: string) => legs.find(leg => leg.edgeId === edgeId)!;

/** Ground-route distance -> CourseGraph edge and arc-length position on it (clamped to START..FINISH). */
export function stormlineLeg(distance: number): { edgeId: string; localS: number } {
  const s = Number.isFinite(distance) ? Math.max(0, Math.min(total, distance)) : 0;
  let low = 0, high = legs.length - 1;
  while (low < high) { const mid = (low + high + 1) >> 1; if (legs[mid].from <= s) low = mid; else high = mid - 1; }
  return { edgeId: legs[low].edgeId, localS: s - legs[low].from };
}

/** Same shape as `trackFrame`; the point is the graph road contact the scene draws. */
export function stormlineFrame(distance: number): { point: { x: number; y: number; z: number }; forward: Vec3; right: Vec3; up: Vec3 } {
  const { edgeId, localS } = stormlineLeg(distance);
  const f = sampleEdge(edgeId, localS);
  return { point: { x: f.point[0], y: f.point[1], z: f.point[2] }, forward: [...f.forward] as Vec3, right: [...f.right] as Vec3, up: [...f.up] as Vec3 };
}

const over = (edgeId: string, inset: number, rest: Omit<TrackSection, 'from' | 'to'>): TrackSection => {
  const leg = legOf(edgeId);
  return { ...rest, from: Math.round(leg.from + inset), to: Math.round(leg.from + leg.length - inset) };
};

// Forks, in course order: skyway viaduct over the flooded street, tunnel cut beside the surface loop (both solid
// decks: a drive alternative is never flown through), rooftop flight over the ground detour (open corridor).
const [skyway, tunnel, roof] = STORMLINE_MEGACITY.forks.map(fork => fork.safe);
const sections: TrackSection[] = [
  over(skyway, 30, { type: 'shortcut', x: 7.5, altitude: 6, deck: true }),
  over(tunnel, 30, { type: 'shortcut', x: -7.5, altitude: 6, deck: true }),
  over(roof, 30, { type: 'shortcut', x: 7.5, altitude: 6 }),
];

export const STORMLINE_TRACK: TrackConfig & { topology: 'course-graph'; topologyVersion: 1 } = {
  name: 'Stormline Megacity', length: Math.floor(total), trafficDensity: 1.2, seed: 13013,
  layoutVersion: 1, openingNitroRings: 2, topology: 'course-graph', topologyVersion: 1, sections,
};
