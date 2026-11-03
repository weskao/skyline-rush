// Monsoon Ruins authored course data. This module deliberately does not register a playable race.
// The integration branch owns the common CourseGraph adapter, renderer, AI and physics.
export type Vec3 = readonly [number, number, number];
export type MonsoonEdgeId = 'ground' | 'river-ford' | 'waterfall-skybridge' | 'canopy-ruins';
type Branch = {
  id: Exclude<MonsoonEdgeId, 'ground'>;
  fromNode: string; toNode: string; from: number; to: number;
  mode: 'ground' | 'air'; surface: string; risk: string; width: number;
  offset: number; lift: number;
};
type Obstacle = {
  id: string; kind: 'collapsed-column' | 'fallen-tree' | 'ruin-debris' | 'boulder' | 'roots';
  edgeId: MonsoonEdgeId; at: number; lateral: number; radius: number; height: number;
};
export interface MonsoonRouteFrame {
  point: Vec3; forward: Vec3; right: Vec3; up: Vec3;
  edgeId: MonsoonEdgeId; distance: number;
}
const LENGTH = 12500;
const nodes = [
  { id: 'start', distance: 0, type: 'start' },
  { id: 'river-split', distance: 2600, type: 'split' },
  { id: 'river-merge', distance: 3900, type: 'merge' },
  { id: 'temple', distance: 5650, type: 'checkpoint' },
  { id: 'falls-split', distance: 6500, type: 'split' },
  { id: 'falls-merge', distance: 7300, type: 'merge' },
  { id: 'canopy-split', distance: 9200, type: 'split' },
  { id: 'canopy-merge', distance: 10400, type: 'merge' },
  { id: 'finish', distance: LENGTH, type: 'finish' },
] as const;
const branches: readonly Branch[] = [
  { id: 'river-ford', fromNode: 'river-split', toNode: 'river-merge',
    from: 2600, to: 3900, mode: 'ground', surface: 'shallow-water', risk: 'slower-wet',
    width: 24, offset: 85, lift: -2.8 },
  { id: 'waterfall-skybridge', fromNode: 'falls-split', toNode: 'falls-merge',
    from: 6500, to: 7300, mode: 'air', surface: 'weathered-stone', risk: 'jump-landing',
    width: 13, offset: -108, lift: 31 },
  { id: 'canopy-ruins', fromNode: 'canopy-split', toNode: 'canopy-merge',
    from: 9200, to: 10400, mode: 'ground', surface: 'broken-stone', risk: 'tight-debris',
    width: 17, offset: 72, lift: 8 },
];
const obstacles: readonly Obstacle[] = [
  { id: 'fallen-trunk-1', kind: 'fallen-tree', edgeId: 'ground', at: 1180, lateral: -7, radius: 2.8, height: 2.2 },
  { id: 'roots-1', kind: 'roots', edgeId: 'ground', at: 2240, lateral: 7, radius: 2.4, height: 1.4 },
  { id: 'river-boulder', kind: 'boulder', edgeId: 'river-ford', at: 3220, lateral: 6, radius: 3, height: 2.5 },
  { id: 'collapsed-column-1', kind: 'collapsed-column', edgeId: 'ground', at: 4960, lateral: -6, radius: 3, height: 3.3 },
  { id: 'temple-debris', kind: 'ruin-debris', edgeId: 'ground', at: 5730, lateral: 8, radius: 2.8, height: 2 },
  { id: 'fallen-pier', kind: 'collapsed-column', edgeId: 'waterfall-skybridge', at: 6900, lateral: -4, radius: 2.3, height: 1.8 },
  { id: 'valley-rock', kind: 'boulder', edgeId: 'ground', at: 7780, lateral: -7, radius: 3.1, height: 2.8 },
  { id: 'hairpin-roots', kind: 'roots', edgeId: 'ground', at: 8930, lateral: 8, radius: 2.8, height: 1.1 },
  { id: 'canopy-rubble', kind: 'ruin-debris', edgeId: 'canopy-ruins', at: 9860, lateral: -6, radius: 2.8, height: 2.1 },
  { id: 'final-column', kind: 'collapsed-column', edgeId: 'ground', at: 11580, lateral: 7, radius: 2.7, height: 3 },
];
export const MONSOON_RUINS_COURSE = {
  id: 'monsoon-ruins', graphVersion: 1, length: LENGTH,
  start: 'start', finish: 'finish', roadWidth: 27,
  nodes,
  // All main edges are in one ordered open path; branches rejoin existing nodes.
  mainEdges: nodes.slice(0, -1).map((n, i) => ({
    id: 'ground-' + i, fromNode: n.id, toNode: nodes[i + 1].id,
    from: n.distance, to: nodes[i + 1].distance, mode: 'ground' as const,
  })),
  branches, checkpoints: [1150, 4300, 5650, 7900, 10800, 12250] as const,
  obstacles,
  landmarks: [
    { id: 'guardian-temple', distance: 5300, lateral: -135, height: 78 },
    { id: 'river-valley', distance: 3500, lateral: 110, height: -38 },
    { id: 'triple-waterfall', distance: 6740, lateral: 115, height: 42 },
    { id: 'ancient-viaduct', distance: 6950, lateral: -84, height: 34 },
    { id: 'jungle-finish-gate', distance: 12240, lateral: 0, height: 14 },
  ],
} as const;

// One authored, genuinely curved 3D ground centreline; waypoint order never closes back on itself.
// The two tight switchbacks are around knots 9-13 and 25-29.
const rawXZ: readonly (readonly [number, number])[] = [
  [0,0],[25,-240],[-20,-550],[-180,-950],[-80,-1300],[150,-1650],
  [85,-2050],[-180,-2450],[-280,-2830],[-290,-3070],[-365,-3170],
  [-470,-3140],[-525,-3030],[-520,-2820],[-570,-2540],[-820,-2400],
  [-950,-2540],[-1000,-3150],[-720,-3650],[-450,-4020],[-330,-4450],
  [-490,-4870],[-740,-5160],[-1080,-5520],[-1200,-5880],[-1180,-6210],
  [-1090,-6310],[-980,-6280],[-920,-6180],[-920,-5930],[-750,-5700],
  [-500,-5670],[-320,-5880],[-330,-6280],[-500,-6700],[-900,-7080],
  [-1150,-7380],[-1050,-7750],[-920,-8070],[-1020,-8440],[-1300,-8900],
];
const bell = (i: number, from: number, to: number): number => {
  if (i <= from || i >= to) return 0;
  return Math.sin(Math.PI * (i - from) / (to - from)) ** 2;
};
const points: Vec3[] = rawXZ.map(([x, z], i) => [
  x * .912,
  10 + 9 * Math.sin(i * .45) - 42 * bell(i, 5, 18)
    + 29 * bell(i, 17, 24) + 35 * bell(i, 23, 34),
  z * .912,
]);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Vec3, b: Vec3, t: number): Vec3 =>
  [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const len = (v: Vec3) => Math.hypot(...v);
const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const normalize = (v: Vec3): Vec3 => {
  const d = len(v);
  return d < 1e-8 ? [0, 0, -1] : [v[0] / d, v[1] / d, v[2] / d];
};
const cross = (a: Vec3, b: Vec3): Vec3 =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function catmull(i: number, t: number): Vec3 {
  const a = points[Math.max(0, i - 1)], b = points[i];
  const c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
  return [0, 1, 2].map(k => .5 * ((2 * b[k]) + (-a[k] + c[k]) * t
    + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t
    + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t * t * t)) as unknown as Vec3;
}
// Immutable arc-length lookup, allocated once. Interpolation is distance-based, never per-frame rebuilt.
const samples: Vec3[] = [points[0]];
const lengths: number[] = [0];
for (let i = 0; i < points.length - 1; i++) {
  for (let j = 1; j <= 20; j++) {
    const next = catmull(i, j / 20);
    lengths.push(lengths[lengths.length - 1] + len(subtract(next, samples[samples.length - 1])));
    samples.push(next);
  }
}
const totalMetres = lengths[lengths.length - 1];
function mainPoint(distance: number): Vec3 {
  const target = distance / LENGTH * totalMetres;
  let lo = 0, hi = lengths.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (lengths[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return samples[0];
  const fraction = (target - lengths[lo - 1]) / Math.max(1e-8, lengths[lo] - lengths[lo - 1]);
  return mix(samples[lo - 1], samples[lo], fraction);
}
function frameFor(pointAt: (s: number) => Vec3, s: number, from: number, to: number,
  edgeId: MonsoonEdgeId): MonsoonRouteFrame {
  const a = pointAt(Math.max(from, s - 1)), b = pointAt(Math.min(to, s + 1));
  const forward = normalize(subtract(b, a));
  const right = normalize([-forward[2], 0, forward[0]]);
  const up = normalize(cross(right, forward));
  return { point: pointAt(s), forward, right, up, edgeId, distance: s };
}
export function sampleMonsoonRoute(edgeId: MonsoonEdgeId | string, distance: number): MonsoonRouteFrame {
  const branch = branches.find(e => e.id === edgeId);
  if (edgeId !== 'ground' && !branch) throw new Error('Unknown Monsoon edge: ' + edgeId);
  if (!Number.isFinite(distance) || distance < (branch?.from ?? 0) || distance > (branch?.to ?? LENGTH)) {
    throw new RangeError('Monsoon route distance outside edge range');
  }
  if (!branch) return frameFor(mainPoint, distance, 0, LENGTH, 'ground');
  const branchPoint = (s: number): Vec3 => {
    const t = (s - branch.from) / (branch.to - branch.from);
    if (t <= 0) return mainPoint(branch.from);
    if (t >= 1) return mainPoint(branch.to);
    const { point, right } = frameFor(mainPoint, s, 0, LENGTH, 'ground');
    const fade = Math.sin(Math.PI * t) ** 2;
    return [
      point[0] + right[0] * branch.offset * fade,
      point[1] + branch.lift * fade,
      point[2] + right[2] * branch.offset * fade,
    ];
  };
  return frameFor(branchPoint, distance, branch.from, branch.to, branch.id);
}
// Shared CourseGraph will use physical distance on each edge for car movement.
// Route progress stays separate and is only for checkpoint/standings calculations.
interface ArcTable { progress: number[]; cumulative: number[]; length: number }
const branchArcTables = new Map<string, ArcTable>();
for (const edge of branches) {
  const segments = Math.ceil((edge.to - edge.from) / 4);
  const progress = [edge.from], cumulative = [0];
  let last = sampleMonsoonRoute(edge.id, edge.from).point;
  for (let i = 1; i <= segments; i++) {
    const s = edge.from + (edge.to - edge.from) * i / segments;
    const point = sampleMonsoonRoute(edge.id, s).point;
    progress.push(s);
    cumulative.push(cumulative[i - 1] + len(subtract(point, last)));
    last = point;
  }
  branchArcTables.set(edge.id, { progress, cumulative, length: cumulative[cumulative.length - 1] });
}
export function monsoonEdgeLength(edgeId: MonsoonEdgeId | string): number {
  if (edgeId === 'ground') return totalMetres;
  const branch = branchArcTables.get(edgeId);
  if (!branch) throw new Error('Unknown Monsoon edge: ' + edgeId);
  return branch.length;
}
export function sampleMonsoonEdge(edgeId: MonsoonEdgeId | string, localDistance: number) {
  const max = monsoonEdgeLength(edgeId);
  if (!Number.isFinite(localDistance) || localDistance < 0 || localDistance > max) {
    throw new RangeError('Monsoon edge local distance outside physical arc length');
  }
  if (edgeId === 'ground') {
    return { ...sampleMonsoonRoute(edgeId, localDistance / totalMetres * LENGTH), localDistance };
  }
  const table = branchArcTables.get(edgeId);
  if (!table) throw new Error('Unknown Monsoon edge: ' + edgeId);
  let lo = 0, hi = table.cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (table.cumulative[mid] < localDistance) lo = mid + 1;
    else hi = mid;
  }
  const start = Math.max(0, lo - 1);
  const fraction = lo === 0 ? 0 : (localDistance - table.cumulative[start]) /
    Math.max(1e-8, table.cumulative[lo] - table.cumulative[start]);
  const progress = lerp(table.progress[start], table.progress[lo], fraction);
  return { ...sampleMonsoonRoute(edgeId, progress), localDistance };
}

// These are material hints for the shared vehicle contact solver, not a competing physics model.
export function monsoonWetContact(edgeId: MonsoonEdgeId, distance: number) {
  sampleMonsoonRoute(edgeId, distance); // Validate edge and range.
  const ford = branches[0];
  const inFord = edgeId === ford.id;
  const t = inFord ? (distance - ford.from) / (ford.to - ford.from) : 0;
  const depth = inFord ? .17 * Math.sin(Math.PI * t) ** 2 :
    [[2100, 2480], [5450, 5640], [11000, 11200]].some(([a, b]) => distance >= a && distance <= b) ? .055 : 0;
  const wetness = clamp(.5 + depth * 2.7, 0, 1);
  return { depth, wetness, gripScale: Math.max(.72, 1 - depth * .8 - wetness * .08) };
}
export function monsoonObstacleHit(edgeId: MonsoonEdgeId, from: number, to: number,
  lateral: number, altitude = 0, previousLateral = lateral): Obstacle | null {
  if (![from, to, lateral, altitude, previousLateral].every(Number.isFinite)) return null;
  return obstacles.find(obstacle => {
    if (obstacle.edgeId !== edgeId || obstacle.at + obstacle.radius < Math.min(from, to)
      || obstacle.at - obstacle.radius > Math.max(from, to)
      || altitude >= obstacle.height + .7) return false;
    const atObstacle = from === to ? 1 : clamp((obstacle.at - from) / (to - from), 0, 1);
    const sweptLateral = lerp(previousLateral, lateral, atObstacle);
    return Math.abs(obstacle.lateral - sweptLateral) <= obstacle.radius + 1.1;
  }) ?? null;
}
// AI chooses a legal lane before reaching a solid prop; collisions remain owned by the shared game.
export function monsoonAvoidance(edgeId: MonsoonEdgeId, distance: number, preferredLateral: number): number {
  const imminent = obstacles.filter(o => o.edgeId === edgeId && o.at >= distance - 2 && o.at <= distance + 80);
  if (!imminent.some(o => Math.abs(o.lateral - preferredLateral) <= o.radius + 1.5)) return preferredLateral;
  const width = edgeId === 'ground' ? 27 : (branches.find(b => b.id === edgeId)?.width ?? 27);
  const limit = width / 2 - 2;
  const candidates = [-10, -5, 0, 5, 10].filter(x => Math.abs(x) <= limit);
  return candidates.filter(x => imminent.every(o => Math.abs(x - o.lateral) > o.radius + 1.5))
    .sort((a, b) => Math.abs(a - preferredLateral) - Math.abs(b - preferredLateral))[0] ?? preferredLateral;
}
// Integrator must validate gate crossings in world space, in ordered sequence.
// Checkpoints are on ground *after* each branch has rejoined the main course.
export function monsoonCrossedCheckpoint(gate: number, previous: Vec3,
  next: Vec3, edgeId: MonsoonEdgeId): boolean {
  if (edgeId !== 'ground' || !MONSOON_RUINS_COURSE.checkpoints.some(d => d === gate)
    || !previous.every(Number.isFinite) || !next.every(Number.isFinite)) return false;
  const delta = subtract(next, previous);
  if (len(delta) > 60 || len(delta) < 1e-6) return false;
  const frame = sampleMonsoonRoute('ground', gate);
  const start = subtract(previous, frame.point);
  const end = subtract(next, frame.point);
  const front = (p: Vec3) => dot(p, frame.forward);
  const before = front(start), after = front(end);
  if (before >= 0 || after < 0) return false;
  const fraction = -before / (after - before);
  const atGate: Vec3 = [
    lerp(start[0], end[0], fraction),
    lerp(start[1], end[1], fraction),
    lerp(start[2], end[2], fraction),
  ];
  const lateral = dot(atGate, frame.right), height = dot(atGate, frame.up);
  return Math.abs(lateral) <= MONSOON_RUINS_COURSE.roadWidth / 2
    && height >= -2 && height <= 7;
}
const dot = (a: Vec3, b: Vec3) => a.reduce((sum, x, i) => sum + x * b[i], 0);

export function monsoonPassedCheckpoints(from: number, to: number): number[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return [];
  return MONSOON_RUINS_COURSE.checkpoints.filter(gate => gate > from && gate <= to);
}
export function monsoonCanFinish(distance: number, passed: readonly number[]): boolean {
  const required = MONSOON_RUINS_COURSE.checkpoints;
  return distance >= LENGTH && passed.length === required.length &&
    required.every((gate, index) => passed[index] === gate);
}
export function monsoonRecovery(distance: number, passed: readonly number[]) {
  const safe = [0, ...MONSOON_RUINS_COURSE.checkpoints.filter(g => passed.includes(g) && g <= distance)];
  const at = Math.max(...safe);
  return { edgeId: 'ground' as const, distance: at, point: mainPoint(at) };
}
export function validateMonsoonCourse(): true {
  const valid = (s: number) => s >= 0 && s <= LENGTH;
  if (nodes[0].id !== 'start' || nodes[nodes.length - 1].id !== 'finish') throw new Error('Invalid endpoints');
  for (let i = 1; i < nodes.length; i++) {
    if (!valid(nodes[i].distance) || nodes[i].distance <= nodes[i - 1].distance) throw new Error('Main path not ordered');
  }
  for (const branch of branches) {
    const start = nodes.find(n => n.id === branch.fromNode), end = nodes.find(n => n.id === branch.toNode);
    if (!start || !end || start.distance !== branch.from || end.distance !== branch.to ||
      branch.from >= branch.to || !MONSOON_RUINS_COURSE.checkpoints.some(g => g > branch.to)) {
      throw new Error('Invalid branch ' + branch.id);
    }
  }
  if (!MONSOON_RUINS_COURSE.checkpoints.every((g, i, a) =>
    valid(g) && g > 0 && g < LENGTH && (i === 0 || g > a[i - 1]))) throw new Error('Invalid checkpoints');
  if (obstacles.some(o => o.radius <= 0 || o.height <= 0 || !valid(o.at))) throw new Error('Invalid obstacles');
  return true;
}
