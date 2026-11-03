import { buildDuneGates } from './dune-tempest-gates.ts';

/** Authored, data-only Dune Tempest CourseGraph draft (metres).
 * The current race engine only supports a single distance-axis centreline.
 * Do not register this in RACE_TRACKS until the shared graph/physics/AI adapters exist.
 * Homepage WebGL preview remains owned by src/upcoming-scenes/dune-tempest.ts.
 */
type Point3 = readonly [number, number, number];
type NodeKind = 'start' | 'checkpoint' | 'split' | 'merge' | 'finish';
type Surface = 'sand-road' | 'dune-crest' | 'canyon-track' | 'air-route' | 'dry-wash';
type VehicleMode = 'ground' | 'flight';
type Node = { kind: NodeKind; position: Point3 };
type Edge = {
  id: string; from: NodeId; to: NodeId; role: 'main' | 'shortcut';
  surface: Surface; widthMeters: number; riskTier: 1 | 2 | 3;
  allowedModes: readonly VehicleMode[]; controlPoints: readonly Point3[];
  takeoff?: { cueLeadMeters: number; clearWidthMeters: number };
  landing?: { clearLengthMeters: number; recoveryEdgeId: string };
};

// The storyboard's broad x/z drawing grid is normalized once to real-world metres;
// elevations and widths are authored in metres, not scaled for screenshots.
const P = (x: number, y: number, z: number): Point3 => [Math.round(x * 0.6414), y, Math.round(z * 0.6414)];
const nodes = {
  start: { kind: 'start', position: P(0, 8, 0) },
  cp1: { kind: 'checkpoint', position: P(400, 8, -1350) },
  split1: { kind: 'split', position: P(1200, 8, -1800) },
  merge1: { kind: 'merge', position: P(1000, 8, -3200) },
  cp2: { kind: 'checkpoint', position: P(250, 12, -4200) },
  split2: { kind: 'split', position: P(-700, 12, -4400) },
  merge2: { kind: 'merge', position: P(-950, 10, -6000) },
  cp3: { kind: 'checkpoint', position: P(-1500, 10, -7050) },
  split3: { kind: 'split', position: P(-1250, 10, -7650) },
  merge3: { kind: 'merge', position: P(-500, 10, -8500) },
  cp4: { kind: 'checkpoint', position: P(550, 10, -9450) },
  finish: { kind: 'finish', position: P(1450, 8, -10800) },
} as const satisfies Record<string, Node>;
type NodeId = keyof typeof nodes;
type Controls = readonly (readonly [number, number, number])[];

function edge(id: string, from: NodeId, to: NodeId, role: Edge['role'],
  surface: Surface, widthMeters: number, riskTier: Edge['riskTier'],
  intermediate: Controls, modes: readonly VehicleMode[] = ['ground']): Edge {
  return {
    id, from, to, role, surface, widthMeters, riskTier, allowedModes: modes,
    controlPoints: [nodes[from].position, ...intermediate.map(p => P(...p)), nodes[to].position],
  };
}

const edges: Edge[] = [
  edge('sunset-start', 'start', 'cp1', 'main', 'sand-road', 42, 1,
    [[180, 8, -280], [530, 11, -650], [600, 8, -1000]]),
  edge('dune-s-bends', 'cp1', 'split1', 'main', 'sand-road', 32, 1,
    [[220, 8, -1550], [400, 8, -1780], [800, 10, -1850]]),
  edge('winding-wadi', 'split1', 'merge1', 'main', 'canyon-track', 28, 1,
    [[1580, 8, -1930], [1640, 10, -2320], [1460, 6, -2780]]),
  edge('dune-crest-cut', 'split1', 'merge1', 'shortcut', 'dune-crest', 26, 2,
    [[1240, 18, -2140], [1140, 22, -2550], [1060, 8, -2900]]),
  edge('rock-gate-descent', 'merge1', 'cp2', 'main', 'sand-road', 30, 2,
    [[600, 8, -3330], [380, 8, -3550], [550, 10, -3780], [520, 12, -4020]]),
  edge('canyon-approach', 'cp2', 'split2', 'main', 'sand-road', 38, 1,
    [[-160, 12, -4300], [-410, 10, -4120]]),
  edge('canyon-switchbacks', 'split2', 'merge2', 'main', 'canyon-track', 26, 1, [
    [-1450, 10, -4480], [-1550, 10, -4600], [-1400, 12, -4730], [-900, 15, -4740],
    [-560, 13, -4810], [-480, 12, -4980], [-640, 10, -5100], [-1200, 12, -5110],
    [-1500, 10, -5210], [-1540, 12, -5400], [-1400, 12, -5540], [-900, 15, -5560],
    [-550, 10, -5650], [-500, 12, -5790], [-680, 10, -5930], [-1100, 10, -5940],
  ]),
  {
    ...edge('canyon-air-crossing', 'split2', 'merge2', 'shortcut', 'air-route', 24, 3,
      [[-620, 28, -4570], [-640, 68, -4720], [-710, 95, -5000],
        [-850, 84, -5350], [-900, 22, -5760]], ['ground', 'flight']),
    takeoff: { cueLeadMeters: 170, clearWidthMeters: 34 },
    landing: { clearLengthMeters: 105, recoveryEdgeId: 'canyon-switchbacks' },
  },
  edge('stone-ring-corridor', 'merge2', 'cp3', 'main', 'canyon-track', 34, 1,
    [[-1350, 10, -6100], [-1740, 16, -6420], [-1710, 14, -6760], [-1350, 10, -6830]]),
  edge('sandstorm-climb', 'cp3', 'split3', 'main', 'dune-crest', 42, 2,
    [[-1900, 9, -7130], [-1960, 9, -7410], [-1620, 10, -7590]]),
  edge('natural-arch-pass', 'split3', 'merge3', 'main', 'canyon-track', 28, 1,
    [[-900, 12, -7730], [-750, 8, -8080], [-950, 8, -8330], [-770, 10, -8520]]),
  edge('dry-wash-cut', 'split3', 'merge3', 'shortcut', 'dry-wash', 52, 2,
    [[-1070, 4, -8020], [-720, 5, -8320]]),
  edge('stone-ring-outlet', 'merge3', 'cp4', 'main', 'sand-road', 48, 1,
    [[-170, 10, -8730], [110, 8, -8890], [320, 8, -9180]]),
  edge('finish-sprint', 'cp4', 'finish', 'main', 'sand-road', 60, 1,
    [[800, 9, -9780], [1030, 8, -10220], [1200, 8, -10550]]),
];

/** Indexed into canyon-switchbacks.controlPoints; pre-bend signs belong in runtime. */
const hairpins = [2, 6, 10, 14].map((apexControlIndex, index) => ({
  id: 'canyon-hairpin-' + (index + 1), edgeId: 'canyon-switchbacks', apexControlIndex,
  signLeadMeters: 150, suggestedSpeedMps: 32,
}));

// Placement is expressed in normalized edge distance and lateral metres, not world axes.
// Visual bounds must be at least the gameplay contact bounds across every quality tier.
const hazards = [
  { id: 'fall-a', kind: 'rockfall', edgeId: 'rock-gate-descent', atFraction: .43, lateralMeters: -9, radius: 4, pass: 'right' },
  { id: 'rock-b', kind: 'rock', edgeId: 'winding-wadi', atFraction: .65, lateralMeters: 10, radius: 5, pass: 'left' },
  { id: 'gravel-a', kind: 'scree', edgeId: 'dune-s-bends', atFraction: .58, lateralMeters: 7, radius: 6, pass: 'left' },
  { id: 'sand-bowl-a', kind: 'sand-pit', edgeId: 'sunset-start', atFraction: .55, lateralMeters: -11, radius: 8, pass: 'right' },
  { id: 'rock-c', kind: 'rock', edgeId: 'canyon-switchbacks', atFraction: .17, lateralMeters: -8, radius: 4, pass: 'right' },
  { id: 'fall-d', kind: 'rockfall', edgeId: 'canyon-switchbacks', atFraction: .48, lateralMeters: 9, radius: 4, pass: 'left' },
  { id: 'gravel-e', kind: 'scree', edgeId: 'stone-ring-corridor', atFraction: .62, lateralMeters: -12, radius: 7, pass: 'right' },
  { id: 'sand-pit-f', kind: 'sand-pit', edgeId: 'dry-wash-cut', atFraction: .35, lateralMeters: 12, radius: 7, pass: 'left' },
  { id: 'rock-g', kind: 'rock', edgeId: 'natural-arch-pass', atFraction: .71, lateralMeters: 9, radius: 4, pass: 'left' },
] as const;

/** Draft contracts only: no collisions, particles or AI avoidance are wired here. */
export const DUNE_TEMPEST_COURSE = {
  id: 'dune-tempest', topologyVersion: 1, targetMainLengthMeters: 13500,
  status: 'graph-runtime-required' as const,
  nodes, edges, checkpoints: ['cp1', 'cp2', 'cp3', 'cp4'] as const, hairpins,
  hazards: hazards.map(h => ({
    id: h.id, kind: h.kind, edgeId: h.edgeId, atFraction: h.atFraction,
    lateralMeters: h.lateralMeters, collisionRadiusMeters: h.radius,
    visualRadiusMeters: h.radius + 1.5, aiPreviewMeters: 120,
    visibleOn: ['low', 'medium', 'high'] as const, safePassSide: h.pass,
  })),
  weatherZones: [
    { id: 'dune-gusts', edgeId: 'dune-s-bends', seed: 5101, minReadableDistanceMeters: 260, maxOpacity: .34 },
    { id: 'wall-on-horizon', edgeId: 'stone-ring-corridor', seed: 5102, minReadableDistanceMeters: 230, maxOpacity: .52 },
    { id: 'local-sandwall', edgeId: 'sandstorm-climb', seed: 5103, minReadableDistanceMeters: 210, maxOpacity: .56 },
  ].map(w => ({ ...w, startFraction: .2, endFraction: .85,
    particleBudgets: { low: 24, medium: 80, high: 160, reducedMotion: 0 },
  })),
  offroadZones: [
    { edgeId: 'sunset-start', startFraction: .1, endFraction: .8, widthMeters: 250 },
    { edgeId: 'dune-s-bends', startFraction: .2, endFraction: .8, widthMeters: 190 },
    { edgeId: 'stone-ring-outlet', startFraction: .15, endFraction: .85, widthMeters: 280 },
  ].map(z => ({ ...z, recoveryBufferMeters: 35, recovery: 'warn-and-return-to-safe-ground' as const })),
  landmarks: [
    { id: 'monumental-stone-ring', edgeId: 'stone-ring-corridor', atFraction: .55 },
    { id: 'natural-rock-arch', edgeId: 'natural-arch-pass', atFraction: .62 },
    { id: 'narrow-canyon-exit', edgeId: 'stone-ring-outlet', atFraction: .19 },
    { id: 'sunset-finish-stretch', edgeId: 'finish-sprint', atFraction: .72 },
  ],
} as const;

// Static gate planes only. The shared CourseGraph runtime must enforce crossing order.
export const DUNE_TEMPEST_GATES = buildDuneGates(DUNE_TEMPEST_COURSE);
