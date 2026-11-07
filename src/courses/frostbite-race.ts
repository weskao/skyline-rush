// Frostbite Canyon race runtime: the shared 1D race engine drives along the CourseGraph ground route.
// Distance 0 = START node, length = FINISH node. The graph's alternative edges are raced as the engine's
// existing elevated shortcut lanes over their split stretch, so physics, AI and the drawn deck agree.
import { FROSTBITE_CANYON_GRAPH as graph } from './frostbite-canyon.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';
import type { TrackConfig, TrackSection } from '../game-types.ts';
import type { Vec3 } from '../sky-track.ts';
import { overSpan, SPAN_LANDING } from '../road-falls.ts';

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

type Frame = { point: { x: number; y: number; z: number }; forward: Vec3; right: Vec3; up: Vec3 };
const groundFrame = (distance: number): Frame => {
  const { edgeId, localS } = frostbiteLeg(distance);
  const f = sampleRoute(graph, edgeId, localS);
  return { point: { x: f.point[0], y: f.point[1], z: f.point[2] }, forward: [...f.forward] as Vec3, right: [...f.right] as Vec3, up: [...f.up] as Vec3 };
};

// Rift Spine span: the corridor centre runs on the graph's high ice bridge (proportional arc length), eased
// over SPAN_EASE m onto the ground corridor at both ends so entering and leaving it never jumps.
const SPAN_EASE = SPAN_LANDING; // the landing ramp is where the deck eases down
const smoothstep = (t: number): number => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };
function spanPoint(distance: number, rift: TrackSection): Frame['point'] {
  const g = groundFrame(distance).point, leg = legOf('rift-lower-canyon');
  const w = smoothstep((distance - rift.from) / SPAN_EASE) * smoothstep((rift.to - distance) / SPAN_EASE);
  const b = sampleRoute(graph, 'rift-ice-bridge', (distance - leg.from) * routeLength(graph, 'rift-ice-bridge') / leg.length);
  const x = rift.x ?? 0, c = [b.point[0] - b.right[0] * x, b.point[1] - b.right[1] * x, b.point[2] - b.right[2] * x];
  return { x: g.x + (c[0] - g.x) * w, y: g.y + (c[1] - g.y) * w, z: g.z + (c[2] - g.z) * w };
}

/** Same shape as `trackFrame`; the point is the graph road contact the scene draws. `span`: a car on the Rift span. */
export function frostbiteFrame(distance: number, span = false): Frame {
  const rift = FROSTBITE_SPAN;
  if (!span || !(distance > rift.from && distance < rift.to)) return groundFrame(distance);
  const a = spanPoint(distance - .5, rift), b = spanPoint(distance + .5, rift);
  const forward = unit([b.x - a.x, b.y - a.y, b.z - a.z]), right = unit([-forward[2], 0, forward[0]]);
  const up: Vec3 = [right[1] * forward[2] - right[2] * forward[1], right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
  return { point: spanPoint(distance, rift), forward, right, up };
}
/** How far a span car is drawn from the ground route point (0 off the span): the chase camera carries it along. */
export function frostbiteSpanLift(distance: number, span: boolean): Vec3 {
  const a = frostbiteFrame(distance, span).point, b = groundFrame(distance).point;
  return [a.x - b.x, a.y - b.y, a.z - b.z];
}
/** Objects (reward cells, pylons) placed inside the Rift corridor sit on the span, like the cars flying it. */
export function frostbiteObjectSpan(distance: number, lateral: number, altitude: number): boolean {
  const rift = FROSTBITE_SPAN;
  return distance > rift.from && distance < rift.to && overSpan(rift, lateral, altitude);
}
const unit = ([x, y, z]: Vec3): Vec3 => { const k = Math.hypot(x, y, z) || 1; return [x / k, y / k, z / k]; };

const along = (edgeId: string, from: number, to: number, rest: Omit<TrackSection, 'from' | 'to'>): TrackSection => {
  const leg = legOf(edgeId);
  return { ...rest, from: Math.round(leg.from + from), to: Math.round(leg.from + Math.min(leg.length, to)) };
};
const span = (edgeId: string, inset: number, rest: Omit<TrackSection, 'from' | 'to'>): TrackSection =>
  along(edgeId, inset, legOf(edgeId).length - inset, rest);

// Decisions: glacier ridge (left of the valley), Rift Spine ice bridge (right of the lower canyon), aurora span (left).
// Ice sits only on hard-ice edges; the observatory climb is the long uphill.
const sections: TrackSection[] = [
  span('glacier-valley', 30, { type: 'shortcut', x: -7.5, altitude: 6, deck: true }),
  along('glacier-gate', 40, 380, { type: 'ice' }),
  along('riverbed-hairpin', 200, 900, { type: 'ice' }),
  span('rift-lower-canyon', 30, { type: 'shortcut', x: 7.5, altitude: 6, span: true }),
  along('observatory-climb', 150, 1250, { type: 'uphill' }),
  span('aurora-basin', 30, { type: 'shortcut', x: -7.5, altitude: 6, deck: true }),
  along('glacial-outlet', 900, 1700, { type: 'ice' }),
].sort((a, b) => a.from - b.from);

/** The Rift corridor raced on the graph's ice bridge (`frostbiteFrame(d, true)`). */
export const FROSTBITE_SPAN = sections.find(s => s.span)!;
// Since the shared rivals gained player-equivalent BOOST/NITRO, this endurance-course multiplier must
// keep slower grid slots catchable without items; full-kit driving should still win most layouts.
export const FROSTBITE_TRACK: TrackConfig & { topology: 'course-graph'; topologyVersion: 1 } = {
  name: 'Frostbite Canyon', length: Math.floor(total), trafficDensity: 0.6, seed: 12012,
  layoutVersion: 1, openingNitroRings: 2, rivalPace: 0.94, topology: 'course-graph', topologyVersion: 1, sections,
};
