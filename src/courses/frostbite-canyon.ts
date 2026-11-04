// Frostbite Canyon / 極地冰原峽谷 — Stage 2 Track 06 authored CourseGraph data.
// Metres, Y up, -Z is "north". Gameplay registration stays gated: this module adds no RACE_TRACKS entry.
// The route SVG is directional only; these points are authored for physical scale, not traced.
import { validateCourseGraph, type CourseEdge, type CourseGraph, type CourseNode, type CoursePoint3 } from '../course-graph.ts';

type Raw = readonly (readonly [number, number, number])[];
const nodeAt: Record<string, CourseNode['kind']> = {
  start: 'start', 'cp-sentinels': 'checkpoint', 'glacier-split': 'split', 'glacier-merge': 'merge',
  'cp-glacier-gate': 'checkpoint', 'rift-split': 'split', 'rift-merge': 'merge', 'cp-rift-spine': 'checkpoint',
  'aurora-split': 'split', 'aurora-merge': 'merge', 'cp-observatory': 'checkpoint', finish: 'finish',
};

// [id, from, to, width, mode, surface, layer, points]
const EDGES: readonly [string, string, string, number, CourseEdge['mode'], string, string, Raw][] = [
  ['frozen-basin', 'start', 'cp-sentinels', 30, 'ground', 'packed-snow', 'basin', [
    [0, 0, 0], [10, 1, -300], [140, 4, -650], [110, 8, -1000], [-40, 12, -1300], [-120, 15, -1600]]],
  // Hairpin 1: ~50 m radius U-turn at the head of the ice-wall corridor.
  ['ice-wall-hairpin', 'cp-sentinels', 'glacier-split', 22, 'ground', 'packed-snow', 'canyon', [
    [-120, 15, -1600], [-110, 19, -1950], [-60, 23, -2200], [0, 26, -2290], [60, 28, -2280],
    [95, 30, -2220], [100, 31, -2120], [90, 33, -1950], [100, 35, -1780], [122, 37, -1660], [155, 39, -1604], [200, 40, -1600]]],
  ['glacier-valley', 'glacier-split', 'glacier-merge', 20, 'ground', 'packed-snow', 'canyon', [
    [200, 40, -1600], [272, 39, -1584], [407, 37, -1555], [530, 39, -1616], [600, 42, -1650]]],
  ['glacier-ridge', 'glacier-split', 'glacier-merge', 14, 'ground', 'wind-crust', 'ridge', [
    [200, 40, -1600], [266, 50, -1633], [388, 64, -1704], [524, 52, -1666], [600, 42, -1650]]],
  ['glacier-gate', 'glacier-merge', 'cp-glacier-gate', 22, 'ground', 'hard-ice', 'canyon', [
    [600, 42, -1650], [660, 44, -1658], [750, 47, -1780], [800, 50, -2000]]],
  // Hairpin 2 sits in the cracked riverbed before the Rift Spine.
  ['riverbed-hairpin', 'cp-glacier-gate', 'rift-split', 22, 'ground', 'hard-ice', 'canyon', [
    [800, 50, -2000], [830, 53, -2300], [800, 56, -2600], [760, 58, -2850], [780, 60, -2980], [840, 61, -3030],
    [900, 62, -3000], [920, 63, -2900], [910, 64, -2700], [950, 66, -2450], [1050, 68, -2230], [1120, 69, -2150], [1200, 70, -2150]]],
  // Hero View 02: straight high deck across the rift. The lower road leaves/joins ±12.5° either side
  // of the trunk heading and crosses ~28 m beneath mid-span (one crossing, no same-height overlap).
  ['rift-ice-bridge', 'rift-split', 'rift-merge', 16, 'ground', 'ice-deck', 'bridge', [
    [1200, 70, -2150], [1320, 71, -2126], [1450, 72, -2100], [1580, 73, -2074], [1700, 74, -2050]]],
  ['rift-lower-canyon', 'rift-split', 'rift-merge', 20, 'ground', 'hard-ice', 'rift-floor', [
    [1200, 70, -2150], [1270, 66, -2153], [1356, 54, -2165], [1450, 44, -2100], [1544, 54, -2035],
    [1630, 66, -2047], [1700, 74, -2050]]],
  ['rift-flight', 'rift-split', 'rift-merge', 30, 'flight', 'air', 'air', [
    [1200, 70, -2150], [1290, 82, -2175], [1450, 102, -2215], [1600, 92, -2140], [1700, 74, -2050]]],
  ['rift-to-observatory', 'rift-merge', 'cp-rift-spine', 22, 'ground', 'packed-snow', 'canyon', [
    [1700, 74, -2050], [1780, 76, -2050], [1900, 79, -2180], [1950, 82, -2350]]],
  ['observatory-climb', 'cp-rift-spine', 'aurora-split', 24, 'ground', 'packed-snow', 'basin', [
    [1950, 82, -2350], [1980, 84, -2700], [2120, 86, -3000], [2080, 88, -3300], [2200, 91, -3550], [2296, 93, -3723], [2350, 94, -3750]]],
  ['aurora-basin', 'aurora-split', 'aurora-merge', 36, 'ground', 'packed-snow', 'basin', [
    [2350, 94, -3750], [2424, 92, -3759], [2650, 88, -3777], [2799, 92, -3947], [2850, 98, -4000]]],
  ['aurora-span', 'aurora-split', 'aurora-merge', 14, 'ground', 'ice-deck', 'span', [
    [2350, 94, -3750], [2401, 100, -3804], [2569, 110, -3938], [2777, 104, -3991], [2850, 98, -4000]]],
  ['crown-approach', 'aurora-merge', 'cp-observatory', 24, 'ground', 'packed-snow', 'basin', [
    [2850, 98, -4000], [2904, 99, -4027], [3000, 100, -4150], [3150, 102, -4400]]],
  ['glacial-outlet', 'cp-observatory', 'finish', 22, 'ground', 'hard-ice', 'canyon', [
    [3150, 102, -4400], [3250, 104, -4700], [3500, 106, -4950], [3800, 107, -5050], [4100, 108, -5250],
    [4300, 109, -5550], [4450, 110, -5900], [4750, 111, -6100], [5050, 112, -6250],
    [5350, 113, -6450], [5600, 114, -6720], [5887, 115, -7050]]],
];

const freezePoints = (points: Raw): readonly CoursePoint3[] =>
  Object.freeze(points.map(p => Object.freeze([...p]) as unknown as CoursePoint3));
const edges: CourseEdge[] = EDGES.map(([id, from, to, width, mode, surface, layer, points]) =>
  Object.freeze({ id, from, to, width, mode, surface, layer, points: freezePoints(points) }));
const ends = new Map<string, CoursePoint3>();
for (const e of edges) { ends.set(e.from, e.points[0]); ends.set(e.to, e.points.at(-1)!); }
const nodes: CourseNode[] = Object.entries(nodeAt).map(([id, kind]) => Object.freeze({ id, kind, at: ends.get(id)! }));

export const FROSTBITE_CANYON_GRAPH: CourseGraph = validateCourseGraph(Object.freeze({
  id: 'frostbite-canyon', version: 1, start: 'start', finish: 'finish',
  nodes: Object.freeze(nodes), edges: Object.freeze(edges),
  checkpoints: Object.freeze(['cp-sentinels', 'cp-glacier-gate', 'cp-rift-spine', 'cp-observatory']),
  groundRoute: Object.freeze(['frozen-basin', 'ice-wall-hairpin', 'glacier-valley', 'glacier-gate', 'riverbed-hairpin',
    'rift-lower-canyon', 'rift-to-observatory', 'observatory-climb', 'aurora-basin', 'crown-approach', 'glacial-outlet']),
}));

/** Optional airborne Rift Spine shortcut. The ground route never needs NITRO/FLY. */
export const FROSTBITE_FLIGHT = Object.freeze({
  edgeId: 'rift-flight', launchEdgeId: 'riverbed-hairpin', launchWindow: 120, minLaunchSpeed: 55, landingRadius: 15,
});

export interface FrostbiteLandmark { readonly id: string; readonly edgeId: string; readonly localS: number; readonly lateral: number; readonly height: number }
export const FROSTBITE_LANDMARKS: readonly FrostbiteLandmark[] = Object.freeze([
  { id: 'cyan-sentinels', edgeId: 'frozen-basin', localS: 1150, lateral: -34, height: 26 },
  { id: 'glacier-gate-arch', edgeId: 'glacier-gate', localS: 150, lateral: 42, height: 48 },
  { id: 'rift-ice-bridge', edgeId: 'rift-ice-bridge', localS: 250, lateral: 0, height: 0 },
  { id: 'aurora-crown', edgeId: 'crown-approach', localS: 120, lateral: -160, height: 140 },
  { id: 'finish-pillars', edgeId: 'glacial-outlet', localS: 1080, lateral: 16, height: 32 },
].map(l => Object.freeze(l)));

/** Deterministic weather/particle seed shared by the course and home preview. */
export const FROSTBITE_SEED = 0x0f2057;
