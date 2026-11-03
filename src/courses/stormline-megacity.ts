/** Stormline-specific authored CourseGraph data. The integration branch owns runtime sampling,
 * race registration, physics and the single shared renderer. No legacy race is modified here. */
export type Point3 = readonly [x: number, y: number, z: number];
export type RoadLayer = 'street' | 'viaduct' | 'tunnel' | 'air';
export type RoadSurface = 'wet-asphalt' | 'elevated-asphalt' | 'tunnel' | 'gap';
export interface StormlineEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly points: readonly Point3[];
  readonly width: number;
  readonly layer: RoadLayer;
  readonly surface: RoadSurface;
  readonly mode: 'drive' | 'flight';
  readonly risk: number;
  readonly rewardSeconds: number;
  readonly bankDegrees?: number;
}
export interface StormlineObstacle {
  readonly id: string;
  readonly edge: string;
  readonly s: number;
  readonly lateral: number;
  readonly radius: number;
  readonly height: number;
  readonly kind: 'construction' | 'slow-car' | 'traffic' | 'puddle';
  readonly solid: boolean;
}
export interface StormlineCourse {
  readonly id: 'stormline-megacity';
  readonly graphVersion: number;
  readonly seed: number;
  readonly start: string;
  readonly finish: string;
  readonly nodes: Readonly<Record<string, Point3>>;
  readonly edges: readonly StormlineEdge[];
  readonly mainRoute: readonly string[];
  readonly forks: readonly { from: string; to: string; safe: string; risky: string }[];
  readonly checkpoints: readonly { node: string; radius: number; minY: number; maxY: number }[];
  readonly obstacles: readonly StormlineObstacle[];
  readonly qualityBudgets: Readonly<Record<'low' | 'medium' | 'high', { rain: number; traffic: number; windows: number; lightning: boolean }>>;
}

// Metres, Y up, negative Z ahead. All route choices share identical node endpoints.
const authoredNodes: StormlineCourse['nodes'] = {
  start: [0, 0, 0], a: [100, 0, -1200], b: [900, 0, -1600],
  c: [1000, 0, -2900], d: [180, 0, -2450], e: [180, 0, -1400],
  f: [-500, 0, -1120], g: [-500, 0, -2550], h: [-1000, 0, -2200],
  i: [-1000, 0, -1050], j: [-1750, 0, -1180],
  k: [-1750, 20, -2600], finish: [-2050, 20, -3450],
};
// Planar calibration keeps the primary authored route near 14 km without flattening bridge height.
const PLANAR_SCALE = 0.94;
const nodes: StormlineCourse['nodes'] = Object.fromEntries(
  Object.entries(authoredNodes).map(([id, [x, y, z]]) => [id, [x * PLANAR_SCALE, y, z * PLANAR_SCALE] as Point3]),
);
const edge = (id: string, from: string, to: string, via: Point3[],
  layer: RoadLayer = 'street', surface: RoadSurface = 'wet-asphalt',
  mode: 'drive' | 'flight' = 'drive', width = 26, risk = 1, rewardSeconds = 0,
): StormlineEdge => ({ id, from, to, points: [nodes[from], ...via.map(([x, y, z]) => [x * PLANAR_SCALE, y, z * PLANAR_SCALE] as Point3), nodes[to]], layer, surface, mode, width, risk, rewardSeconds });

export const STORMLINE_MEGACITY: StormlineCourse = {
  id: 'stormline-megacity', graphVersion: 1, seed: 11032026,
  start: 'start', finish: 'finish', nodes,
  edges: [
    edge('night-start', 'start', 'a', [[35, 0, -460], [55, 0, -850]]),
    edge('s-boulevard', 'a', 'b', [[310, 0, -1390], [550, 0, -1430], [740, 0, -1510]]),
    // Fork 1: safer flooded street versus faster interlaced elevated highway.
    edge('flood-street', 'b', 'c', [[920, 0, -2050], [970, 0, -2550]]),
    edge('skyway-cut', 'b', 'c', [[925, 8, -1850], [950, 24, -2110], [970, 25, -2550], [990, 8, -2800]],
      'viaduct', 'elevated-asphalt', 'drive', 22, 3, 9),
    edge('hairpin-west', 'c', 'd', [[1000, 0, -3290], [860, 0, -3510], [440, 0, -3530],
      [200, 0, -3380], [180, 0, -3000]], 'street', 'wet-asphalt', 'drive', 28),
    edge('north-arterial', 'd', 'e', [[155, 0, -2060], [180, 0, -1770]]),
    // Fork 2: both routes remain ground-driveable, tunnel shortens the city loop.
    edge('surface-loop', 'e', 'f', [[30, 0, -1260], [-240, 0, -1180]]),
    edge('tunnel-cut', 'e', 'f', [[-15, -7, -1320], [-320, -8, -1210]],
      'tunnel', 'tunnel', 'drive', 23, 2, 6),
    edge('downcity-s', 'f', 'g', [[-620, 0, -1510], [-450, 0, -1950], [-510, 0, -2280]]),
    edge('hairpin-east', 'g', 'h', [[-500, 0, -2960], [-650, 0, -3130],
      [-930, 0, -3150], [-1000, 0, -2930], [-1000, 0, -2550]], 'street', 'wet-asphalt', 'drive', 27),
    edge('neon-avenue', 'h', 'i', [[-1030, 0, -1870], [-970, 0, -1460]]),
    // Fork 3: aerial over buildings with safe ground detour and explicit landing.
    edge('ground-detour', 'i', 'j', [[-1230, 0, -1160], [-1520, 0, -1130]]),
    edge('roof-flight', 'i', 'j', [[-1130, 12, -1110], [-1310, 38, -1100], [-1480, 36, -1110],
      [-1620, 9, -1150]], 'air', 'gap', 'flight', 42, 5, 13),
    edge('final-interchange', 'j', 'k', [[-1770, 7, -1620], [-1740, 22, -2080]],
      'viaduct', 'elevated-asphalt', 'drive', 25, 2),
    edge('skyline-finish', 'k', 'finish', [[-1830, 24, -2940], [-1940, 22, -3230]],
      'viaduct', 'elevated-asphalt', 'drive', 26, 2),
  ],
  mainRoute: ['night-start', 's-boulevard', 'flood-street', 'hairpin-west', 'north-arterial',
    'surface-loop', 'downcity-s', 'hairpin-east', 'neon-avenue', 'ground-detour',
    'final-interchange', 'skyline-finish'],
  forks: [
    { from: 'b', to: 'c', safe: 'flood-street', risky: 'skyway-cut' },
    { from: 'e', to: 'f', safe: 'surface-loop', risky: 'tunnel-cut' },
    { from: 'i', to: 'j', safe: 'ground-detour', risky: 'roof-flight' },
  ],
  // Gates attach to post-merge nodes, so shortcuts cannot bypass mandatory checkpoints.
  checkpoints: [
    { node: 'a', radius: 28, minY: -3, maxY: 9 },
    { node: 'c', radius: 34, minY: -4, maxY: 12 },
    { node: 'f', radius: 32, minY: -4, maxY: 10 },
    { node: 'h', radius: 32, minY: -4, maxY: 10 },
    { node: 'j', radius: 32, minY: -3, maxY: 12 },
    { node: 'finish', radius: 30, minY: 13, maxY: 34 },
  ],
  obstacles: [
    { id: 'lane-work-01', edge: 'night-start', s: 460, lateral: 9, radius: 2, height: 2, kind: 'construction', solid: true },
    { id: 'puddle-02', edge: 'flood-street', s: 480, lateral: -8, radius: 3, height: 0.1, kind: 'puddle', solid: false },
    { id: 'rush-traffic-03', edge: 'north-arterial', s: 420, lateral: -7, radius: 2.6, height: 1.7, kind: 'traffic', solid: true },
    { id: 'tunnel-maintenance', edge: 'tunnel-cut', s: 250, lateral: 8, radius: 2.1, height: 2, kind: 'construction', solid: true },
    { id: 'downtown-slow-04', edge: 'downcity-s', s: 550, lateral: 7, radius: 2, height: 1.7, kind: 'slow-car', solid: true },
    { id: 'viaduct-pinch', edge: 'final-interchange', s: 620, lateral: -8, radius: 1.6, height: 2, kind: 'construction', solid: true },
    { id: 'finale-traffic', edge: 'skyline-finish', s: 410, lateral: 8, radius: 2, height: 1.8, kind: 'traffic', solid: true },
  ],
  qualityBudgets: {
    low: { rain: 60, traffic: 8, windows: 96, lightning: false },
    medium: { rain: 190, traffic: 18, windows: 240, lightning: false },
    high: { rain: 420, traffic: 32, windows: 420, lightning: true },
  },
};

// Polyline length is a blockout estimate; shared CourseGraph owns the final arc-length LUT.
export function edgeLength(edge: StormlineEdge): number {
  return edge.points.slice(1).reduce((sum, point, i) => {
    const prev = edge.points[i];
    return sum + Math.hypot(point[0] - prev[0], point[1] - prev[1], point[2] - prev[2]);
  }, 0);
}
export function groundRoute(course: StormlineCourse): StormlineEdge[] {
  const edges = new Map(course.edges.map(item => [item.id, item]));
  return course.mainRoute.map(id => {
    const found = edges.get(id);
    if (!found) throw new Error(`Missing safe route edge ${id}`);
    return found;
  });
}
export function weatherBudget(course: StormlineCourse, quality: 'low' | 'medium' | 'high',
  reducedMotion: boolean) {
  const budget = course.qualityBudgets[quality];
  return reducedMotion ? { ...budget, rain: 0, lightning: false } : budget;
}
export function validateStormlineCourse(course: StormlineCourse): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const item of course.edges) {
    if (ids.has(item.id)) problems.push(`Duplicate edge ${item.id}`);
    ids.add(item.id);
    if (!course.nodes[item.from] || !course.nodes[item.to]) problems.push(`Unknown endpoint ${item.id}`);
    if (item.points.length < 2 || item.points.some(point => point.some(value => !Number.isFinite(value)))) problems.push(`Invalid points ${item.id}`);
    if (item.points[0] !== course.nodes[item.from] || item.points.at(-1) !== course.nodes[item.to]) problems.push(`Disconnected edge ${item.id}`);
    if (item.width < 18 || item.mode === 'flight' && item.layer !== 'air') problems.push(`Undriveable edge ${item.id}`);
  }
  const route = groundRoute(course);
  if (route[0]?.from !== course.start || route.at(-1)?.to !== course.finish) problems.push('Start/finish mismatch');
  route.slice(1).forEach((item, i) => { if (route[i].to !== item.from) problems.push(`Broken mainline ${item.id}`); });
  const visited = new Set([course.start]);
  for (const item of route) { if (visited.has(item.to)) problems.push(`Cycle through ${item.to}`); visited.add(item.to); }
  for (const fork of course.forks) {
    const safe = course.edges.find(item => item.id === fork.safe), risky = course.edges.find(item => item.id === fork.risky);
    if (!safe || !risky || safe.from !== risky.from || safe.to !== risky.to || safe.mode !== 'drive') problems.push(`Invalid fork ${fork.from}`);
  }
  for (const checkpoint of course.checkpoints) if (!visited.has(checkpoint.node)) problems.push(`Unreachable checkpoint ${checkpoint.node}`);
  return problems;
}
