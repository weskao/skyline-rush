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
const edges: SkyfallEdge[] = [
  edge('approach', 'start', 'a-split', 'ground', 32, 0, [
    v(50, 18, -400), v(400, 26, -800), v(750, 38, -1300), v(950, 50, -1800),
  ]),
  edge('a-ground', 'a-split', 'a-merge', 'ground', 28, 1, [
    v(1150, 64, -2700), v(1500, 65, -2780), v(1740, 66, -2650),
    v(1750, 68, -2250), v(1450, 70, -2110), v(1220, 71, -2320),
    v(1280, 74, -2700), v(1270, 76, -3100),
  ]),
  edge('a-air', 'a-split', 'a-merge', 'air', 37, 2, [
    v(970, 86, -2540), v(1040, 130, -2860), v(1140, 126, -3120),
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
export const SKYFALL_GROUND_PATH = [
  'approach', 'a-ground', 'midway-one', 'b-ground', 'midway-two', 'c-ground', 'descent',
] as const;
export const SKYFALL_COURSE = {
  id: 'skyfall-archipelago', version: 1, nodes, edges,
  start: 'start', finish: 'finish',
  checkpoints: ['a-merge', 'b-merge', 'c-merge', 'finish'],
  pointToPoint: true, flightOptional: true,
};

type Table = { t: number; distance: number }[];
const curves = new Map<string, { table: Table; length: number }>();
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const interpolate = (a: number, b: number, c: number, d: number, t: number): number =>
  .5 * (2*b + (-a+c)*t + (2*a-5*b+4*c-d)*t*t + (-a+3*b-3*c+d)*t*t*t);
function position(edgeData: SkyfallEdge, u: number): SkyfallVec3 {
  const pts = edgeData.points;
  const segment = clamp(Math.floor(u), 0, pts.length - 2);
  const t = clamp(u - segment, 0, 1);
  const a = pts[Math.max(0, segment-1)];
  const b = pts[segment], c = pts[segment+1];
  const d = pts[Math.min(pts.length-1, segment+2)];
  return v(interpolate(a.x,b.x,c.x,d.x,t),
    interpolate(a.y,b.y,c.y,d.y,t), interpolate(a.z,b.z,c.z,d.z,t));
}
const dist = (a: SkyfallVec3, b: SkyfallVec3): number =>
  Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
function curve(edgeData: SkyfallEdge): { table: Table; length: number } {
  const cached = curves.get(edgeData.id);
  if (cached) return cached;
  const n = (edgeData.points.length - 1) * 32;
  const table: Table = [{ t: 0, distance: 0 }];
  let length = 0, previous = position(edgeData, 0);
  for (let i=1;i<=n;i++) {
    const t = i/32, next = position(edgeData, t);
    length += dist(previous, next);
    table.push({ t, distance: length });
    previous = next;
  }
  const record = { table, length };
  curves.set(edgeData.id, record);
  return record;
}
const selectedEdge = (edgeId: string): SkyfallEdge => {
  const selected = edges.find(e => e.id === edgeId);
  if (!selected) throw new Error(`Unknown Skyfall edge: ${edgeId}`);
  return selected;
};
export function getSkyfallEdgeLength(edgeId: string): number { return curve(selectedEdge(edgeId)).length; }

// Gap fractions become local arc-length metres once, so the same physical
// footprint can be consumed by both scene geometry and shared collision.
for (const item of edges) {
  const length = curve(item).length;
  item.gaps = item.gaps.map(g => ({ from: g.from*length, to: g.to*length }));
}
export function hasSkyfallRoadContact(edgeId: string, localS: number): boolean {
  const selected = selectedEdge(edgeId);
  const length = getSkyfallEdgeLength(edgeId);
  if (!Number.isFinite(localS) || localS < 0 || localS > length) return false;
  return !selected.gaps.some(g => localS > g.from && localS < g.to);
}
const normalize = ([x,y,z]: [number,number,number]): [number,number,number] => {
  const m = Math.hypot(x,y,z);
  return m > 1e-9 ? [x/m,y/m,z/m] : [0,0,-1];
};
const cross = (a: number[], b: number[]): [number,number,number] =>
  [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function sampleSkyfallRoad(edgeId: string, localS: number): SkyfallFrame {
  const selected = selectedEdge(edgeId);
  const { table, length } = curve(selected);
  const s = clamp(Number.isFinite(localS) ? localS : 0, 0, length);
  let left = 0, right = table.length - 1;
  while (right-left>1) {
    const mid = Math.floor((left+right)/2);
    if (table[mid].distance < s) left=mid;
    else right=mid;
  }
  const a = table[left], b = table[right];
  const u = a.t + (b.t-a.t) * ((s-a.distance)/(b.distance-a.distance || 1));
  const point = position(selected,u);
  const before = position(selected,Math.max(0,u-.01));
  const after = position(selected,Math.min(selected.points.length-1,u+.01));
  const forward = normalize([after.x-before.x,after.y-before.y,after.z-before.z]);
  const plainRight = normalize([-forward[2],0,forward[0]]);
  const plainUp = normalize(cross(plainRight,forward));
  const turn = Math.sin(Math.PI*s/length) * Math.sin(u*.85);
  const bank = clamp(turn*.115,-.12,.12), co = Math.cos(bank), si = Math.sin(bank);
  const roadRight = normalize(plainRight.map((x,i)=>x*co+plainUp[i]*si) as [number,number,number]);
  const roadUp = normalize(cross(roadRight,forward));
  return { point, forward, right: roadRight, up: roadUp, width: selected.width,
    bank, edgeId, localS:s };
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