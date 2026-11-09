// Volcanic Crown: reuse the existing 1D race engine along the CourseGraph ground route.
// The user's approved same-stretch approximation represents each risky fork as a shortcut.
// Actual graph edges and route measurements remain unchanged in the source adapter.
import { PLAYABLE_COURSE_GRAPH as graph, VOLCANIC_CROWN_RUNTIME as runtime } from './volcanic-crown-runtime-adapter.ts';
import type { TrackConfig, TrackSection } from '../game-types.ts';
import type { Vec3 } from '../sky-track.ts';

export const VOLCANIC_ID = 'volcanic-crown';
const legs: { edgeId: string; from: number; length: number }[] = [];
let total = 0;
for (const edgeId of graph.groundRoute) {
  const length = runtime.edgeLength(edgeId);
  legs.push({ edgeId, from: total, length });
  total += length;
}
/** Game distance -> physical ground edge and unrounded arc length. */
export function volcanicLeg(distance: number): { edgeId: string; localS: number } {
  const s = Number.isFinite(distance) ? Math.max(0, Math.min(total, distance)) : 0;
  let low = 0, high = legs.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (legs[mid].from <= s) low = mid;
    else high = mid - 1;
  }
  return { edgeId: legs[low].edgeId, localS: s - legs[low].from };
}
/** The exact road frame used by the authored meshes, physics adapter and minimap. */
export function volcanicFrame(distance: number): {
  point: { x: number; y: number; z: number }; forward: Vec3; right: Vec3; up: Vec3
} {
  const { edgeId, localS } = volcanicLeg(distance);
  const f = runtime.sample(edgeId, localS);
  return {
    point: { x: f.point[0], y: f.point[1], z: f.point[2] },
    forward: [...f.forward] as Vec3, right: [...f.right] as Vec3, up: [...f.up] as Vec3,
  };
}
// Main-road interval that a risky edge replaces; do not quantize any graph measurement.
const fork = (riskyId: string, x: number, deck: boolean): TrackSection => {
  const risky = graph.edges.find(e => e.id === riskyId);
  if (!risky) throw new Error('Unknown Volcanic fork ' + riskyId);
  const safe = graph.edges.find(e => e.from === risky.from && e.to === risky.to && e.mode === 'ground');
  const leg = legs.find(l => l.edgeId === safe?.id);
  if (!leg || leg.length <= 80) throw new Error('Volcanic fork has no measurable ground alternative: ' + riskyId);
  return {
    type: 'shortcut', from: Math.round(leg.from + 30), to: Math.round(leg.from + leg.length - 30),
    x, altitude: 6, ...(deck ? { deck: true } : {}),
  };
};
// Rift and gorge are FLY corridors; vent-risk is a raised solid road.
const sections: TrackSection[] = [
  fork('rift-flight', -7.5, false),
  fork('vent-risk', 7.5, true),
  fork('gorge-flight', -7.5, false),
];
export const VOLCANIC_TRACK: TrackConfig & { topology: 'course-graph'; topologyVersion: 1 } = {
  name: 'Volcanic Crown', length: Math.floor(total), trafficDensity: 0.75, seed: 14014,
  layoutVersion: 1, openingNitroRings: 2, topology: 'course-graph', topologyVersion: 1,
  sections,
};
