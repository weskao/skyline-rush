import { validateCourseGraph, type CourseGraph } from '../course-graph.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';
import { smoothSkyfallJunctions } from './skyfall-junctions.ts';

/** Skyfall-only authored geometry. The shared CourseGraph engine owns race state,
 * collisions, checkpoint crossing, AI and recovery; this module never replaces it. */
export type SkyfallVec3 = { x: number; y: number; z: number };
export type SkyfallFrame = {
  point: SkyfallVec3; forward: [number, number, number];
  right: [number, number, number]; up: [number, number, number]; width: number;
  bank: number; edgeId: string; localS: number;
};
type RoadMode = 'ground' | 'air';
type NodeKind = 'start' | 'split' | 'merge' | 'finish';
export interface SkyfallNode { id: string; kind: NodeKind; position: SkyfallVec3 }
export interface SkyfallEdge {
  id: string; from: string; to: string; mode: RoadMode; width: number;
  points: SkyfallVec3[]; gaps: { from: number; to: number }[];
  islandTier: number; bridgeStyle: 'stone' | 'sky';
}
export interface SkyfallObstacle {
  id: string; edgeId: string; distance: number; lateral: number;
  radius: number; kind: 'stone' | 'column' | 'crumbling-platform' | 'floating-boulder' | 'broken-parapet';
  telegraphSeconds: number; seed: number;
}
export interface SkyfallWeather {
  edgeId: string; from: number; to: number; windStrength: number;
  warnBeforeSeconds: number; seed: number; cue: 'crosswind' | 'cloud-shear' | 'sky-ray';
}

const v = (x: number, y: number, z: number): SkyfallVec3 => ({ x, y, z });
const node = (id: string, kind: NodeKind, x: number, y: number, z: number): SkyfallNode =>
  ({ id, kind, position: v(x, y, z) });
const nodes: SkyfallNode[] = [
  node('start', 'start', 0, 18, 0),
  node('a-split', 'split', 850, 62, -2250),
  node('a-merge', 'merge', 1250, 76, -3300),
  node('b-split', 'split', 680, 112, -5100),
  node('b-merge', 'merge', 1480, 160, -5600),
  node('c-split', 'split', 700, 190, -7500),
  node('c-merge', 'merge', 1450, 218, -8650),
  node('finish', 'finish', 850, 185, -10600),
];
const at = (id: string): SkyfallVec3 => {
  const point = nodes.find(n => n.id === id)?.position;
  if (!point) throw new Error(`Unknown Skyfall node: ${id}`);
  return point;
};
const edge = (id: string, from: string, to: string, mode: RoadMode,
  width: number, tier: number, middle: SkyfallVec3[], gapPercents: number[] = []): SkyfallEdge => ({
  id, from, to, mode, width, islandTier: tier,
  points: [at(from), ...middle, at(to)],
  gaps: gapPercents.length ? [{ from: gapPercents[0], to: gapPercents[1] }] : [],
  bridgeStyle: mode === 'air' ? 'sky' : 'stone',
});

// Each choice is a physically separate graph edge. Ground alternatives have
// uninterrupted slabs; optional aerial edges carry visible takeoff/landing gaps.
let edges: SkyfallEdge[] = [
  edge('approach', 'start', 'a-split', 'ground', 32, 0, [
    v(50, 18, -400), v(400, 26, -800), v(750, 38, -1300), v(950, 50, -1800),
  ]),
  edge('a-ground', 'a-split', 'a-merge', 'ground', 28, 1, [
    v(1150, 64, -2700), v(1500, 65, -2780), v(1740, 66, -2650),
    v(1750, 68, -2250), v(1450, 70, -2110), v(1220, 71, -2320),
    v(1280, 74, -2700), v(1270, 76, -3100),
  ]),
  edge('a-air', 'a-split', 'a-merge', 'air', 37, 2, [
    v(970, 86, -2540), v(1040, 130, -2860), v(1380, 90, -3120),
  ], [.24, .69]),
  edge('midway-one', 'a-merge', 'b-split', 'ground', 30, 2, [
    v(950, 84, -3700), v(580, 92, -4150), v(300, 108, -4650), v(550, 110, -5000),
  ]),
  edge('b-ground', 'b-split', 'b-merge', 'ground', 28, 3, [
    v(1000, 120, -5200), v(1300, 130, -4950), v(1150, 140, -4630),
    v(800, 146, -4680), v(750, 150, -5100), v(1120, 154, -5400),
  ]),
  edge('b-air', 'b-split', 'b-merge', 'air', 37, 3, [
    v(900, 170, -5400), v(1200, 185, -5500),
  ], [.18, .64]),
  edge('midway-two', 'b-merge', 'c-split', 'ground', 30, 3, [
    v(1740, 164, -6000), v(1650, 168, -6500), v(1250, 174, -6800), v(900, 180, -7100),
  ]),
  edge('c-ground', 'c-split', 'c-merge', 'ground', 30, 4, [
    v(330, 190, -7700), v(100, 195, -8030), v(180, 196, -8400),
    v(580, 200, -8600), v(900, 206, -8400), v(1150, 212, -8350),
  ]),
  edge('c-air', 'c-split', 'c-merge', 'air', 40, 5, [
    v(800, 240, -7900), v(1150, 240, -8400),
  ], [.24, .74]),
  edge('descent', 'c-merge', 'finish', 'ground', 36, 2, [
    v(1700, 215, -9100), v(1600, 210, -9500), v(1220, 200, -9800),
    v(900, 190, -10300),
  ]),
];
// Convert hand-authored plan units into world metres once, leaving spline
// interpolation and vertical levels in physical units. Shared endpoints stay shared.
const scaled = new Set<SkyfallVec3>();
for (const e of edges) for (const p of e.points) if (!scaled.has(p)) {
  p.x *= .87; p.z *= .87; scaled.add(p);
}
edges = smoothSkyfallJunctions(edges);

export const SKYFALL_GROUND_PATH = [
  'approach', 'a-ground', 'midway-one', 'b-ground', 'midway-two', 'c-ground', 'descent',
] as const;
export const SKYFALL_COURSE = {
  id: 'skyfall-archipelago', version: 1, nodes, edges,
  start: 'start', finish: 'finish',
  checkpoints: ['a-merge', 'b-merge', 'c-merge', 'finish'],
  pointToPoint: true, flightOptional: true,
};

// The shared graph represents mandatory merge checkpoints; FINISH is the
// fourth authored gate, not a checkpoint-kind node. Do not invent a fifth gate.
// Flight gaps still require hasSkyfallRoadContact from the authored course;
// CourseGraph's mode alone is NOT evidence of a continuous physical bridge.
export const SKYFALL_GRAPH: CourseGraph = validateCourseGraph({
  id: SKYFALL_COURSE.id,
  version: SKYFALL_COURSE.version,
  start: SKYFALL_COURSE.start,
  finish: SKYFALL_COURSE.finish,
  nodes: SKYFALL_COURSE.nodes.map(node => ({
    id: node.id,
    kind: node.kind === 'merge' ? 'checkpoint' as const : node.kind,
    at: [node.position.x, node.position.y, node.position.z] as const,
  })),
  edges: SKYFALL_COURSE.edges.map(edge => ({
    id: edge.id, from: edge.from, to: edge.to,
    mode: edge.mode === 'air' ? 'flight' as const : 'ground' as const,
    width: edge.width,
    points: edge.points.map(p => [p.x, p.y, p.z] as const),
  })),
  checkpoints: SKYFALL_COURSE.checkpoints.filter(id => id !== SKYFALL_COURSE.finish),
  groundRoute: [...SKYFALL_GROUND_PATH],
});

export function getSkyfallEdgeLength(edgeId: string): number {
  return routeLength(SKYFALL_GRAPH, edgeId);
}
const selectedEdge = (edgeId: string): SkyfallEdge => {
  const selected = edges.find(e => e.id === edgeId);
  if (!selected) throw new RangeError('Unknown Skyfall edge: ' + edgeId);
  return selected;
};
// Express the original flight gap fractions in canonical graph metres exactly once.
for (const edge of edges) {
  const length = getSkyfallEdgeLength(edge.id);
  edge.gaps = edge.gaps.map(g => ({ from: g.from * length, to: g.to * length }));
}
export function hasSkyfallRoadContact(edgeId: string, localS: number): boolean {
  const edge = selectedEdge(edgeId), length = getSkyfallEdgeLength(edgeId);
  return Number.isFinite(localS) && localS >= 0 && localS <= length &&
    !edge.gaps.some(g => localS > g.from && localS < g.to);
}
/** One physical frame for the road mesh, car contact, AI and camera; the authored visual bank is not applied. */
export function sampleSkyfallRoad(edgeId: string, localS: number): SkyfallFrame {
  const f = sampleRoute(SKYFALL_GRAPH, edgeId, localS);
  return {
    point: { x: f.point[0], y: f.point[1], z: f.point[2] },
    forward: [...f.forward], right: [...f.right], up: [...f.up],
    width: f.width, bank: 0, edgeId, localS: f.localS,
  };
}

// Obstacles are never placed in both centre lanes at the same localS.
// The integration layer must use existing hitProp/knock/recovery physics.
export const SKYFALL_OBSTACLES: SkyfallObstacle[] = [
  ['a-ground',.14,10,'broken-parapet',11], ['a-ground',.45,-12,'column',12],
  ['a-ground',.76,12,'stone',13], ['b-ground',.16,-11,'crumbling-platform',14],
  ['b-ground',.39,11,'column',15], ['b-ground',.67,-11,'floating-boulder',16],
  ['c-ground',.25,12,'stone',17], ['c-ground',.49,-11,'broken-parapet',18],
  ['c-ground',.77,12,'column',19], ['descent',.37,-13,'floating-boulder',20],
].map(([id,percent,lateral,kind,seed]) => ({
  id: `skyfall-${seed}`, edgeId: id as string,
  distance: getSkyfallEdgeLength(id as string) * (percent as number),
  lateral: lateral as number, kind: kind as SkyfallObstacle['kind'],
  radius: 2.9 + (Number(seed)%3), telegraphSeconds: 3.3, seed: seed as number,
}));
export const SKYFALL_WEATHER: SkyfallWeather[] = [
  ['approach',.52,.83,'cloud-shear',.25,441],
  ['midway-one',.28,.53,'crosswind',-.38,442],
  ['midway-two',.25,.55,'sky-ray',.18,443],
  ['descent',.10,.36,'cloud-shear',.27,444],
].map(([id,a,b,cue,strength,seed]) => ({
  edgeId: id as string,
  from: getSkyfallEdgeLength(id as string)*(a as number),
  to: getSkyfallEdgeLength(id as string)*(b as number),
  windStrength: strength as number, warnBeforeSeconds: 3.5,
  seed: seed as number, cue: cue as SkyfallWeather['cue'],
}));