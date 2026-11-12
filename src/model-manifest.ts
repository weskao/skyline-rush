// Phase 2 model manifest. Contract: docs/designs/3d-pipeline/phase2-model-contracts.md §1.
export const FALLBACK_KEYS = ['procedural-car', 'procedural-scenery', 'procedural-pickup'] as const;
export type FallbackKey = (typeof FALLBACK_KEYS)[number];
export const DECODERS = ['meshopt', 'ktx2'] as const;
export type Decoder = (typeof DECODERS)[number];
export type ModelQuality = 'high' | 'low';

export interface ModelManifestEntry {
  id: string;
  url: string;
  source: { master: string; script: string; masterSha256: string; scriptSha256: string };
  glb: { sha256: string; bytes: number };
  license: { id: string; creator: string; sourceUrl?: string };
  provenance: { blender: string; exporter: string; gltfTransform: string; commands: string[] };
  nodes: string[];
  materials: string[];
  lods: { quality: ModelQuality; url: string }[];
  fallback: FallbackKey;
  decoders: Decoder[];
  budgets: { triangles: number; bytes: number; textureMaxPx: number };
}

// The other power-up tiers share the cell's pipeline, budgets and art kit (scripts/assets/pickup_kit.py).
const UNRECORDED = '0'.repeat(64);
function pickupModel(tier: string, triangles: number, sha = { master: UNRECORDED, script: UNRECORDED, glb: UNRECORDED, bytes: 1 }): ModelManifestEntry {
  const id = `pickup-${tier}`, src = `assets-src/${id}`;
  return {
    id,
    url: `models/${id}/${id}.glb`,
    source: { master: `${src}/${id}.blend`, script: `${src}/build.py`, masterSha256: sha.master, scriptSha256: sha.script },
    glb: { sha256: sha.glb, bytes: sha.bytes },
    license: { id: 'owned', creator: 'Skyline Rush project' },
    provenance: {
      blender: '5.2.3',
      exporter: '5.2.41',
      gltfTransform: '4.5.1',
      commands: [
        `$BLENDER_BIN --background --factory-startup --python ${src}/build.py`,
        `node scripts/assets/export-glb.mjs ${id}`,
        `node scripts/assets/optimize-glb.mjs ${id}`,
        `$BLENDER_BIN --background --factory-startup --python scripts/assets/pickup_kit.py -- review ${id}`,
        `node scripts/assets/check-glb.mjs ${id} --promote`,
      ],
    },
    nodes: [`pickup_${tier}`],
    materials: [`pickup_${tier}_pbr`],
    lods: [],
    fallback: 'procedural-pickup',
    decoders: ['meshopt', 'ktx2'],
    budgets: { triangles, bytes: 300_000, textureMaxPx: 512 },
  };
}

// Hashes/bytes come from `node scripts/assets/check-glb.mjs <id>` and shasum of the committed sources.
export const MODEL_MANIFEST: Record<string, ModelManifestEntry> = {
  'pipeline-probe': {
    id: 'pipeline-probe',
    url: 'models/pipeline-probe/pipeline-probe.glb',
    source: {
      master: 'assets-src/pipeline-probe/pipeline-probe.blend',
      script: 'assets-src/pipeline-probe/build.py',
      masterSha256: '1594bc47c301126057f64b561a1e29fa7a3a50a1f851d8f06852081e947a690a',
      scriptSha256: '43d130746da94b691a4a05ae55d2d462b5f8ca18753b31866afa00e4d7d64824',
    },
    glb: { sha256: '4de02c9162f0825b3788efffb7d94c5c954f0bde6787484b303e9f791ab6757d', bytes: 6536 },
    license: { id: 'owned', creator: 'Skyline Rush project' },
    provenance: {
      blender: '5.2.3',
      exporter: '5.2.41',
      gltfTransform: '4.5.1',
      commands: [
        '$BLENDER_BIN --background --factory-startup --python assets-src/pipeline-probe/build.py',
        'node scripts/assets/export-glb.mjs pipeline-probe',
        'node scripts/assets/optimize-glb.mjs pipeline-probe',
        'node scripts/assets/check-glb.mjs pipeline-probe --promote',
      ],
    },
    nodes: ['probe_body', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'],
    materials: ['probe_paint', 'probe_tire'],
    lods: [],
    fallback: 'procedural-car',
    decoders: ['meshopt'],
    budgets: { triangles: 5000, bytes: 200_000, textureMaxPx: 0 },
  },
  // Task 4/4b hero Roadster behind ?model=roadster: Garage, Home showcase and race car. Nodes are the rig contract (src/garage-model-rig.ts).
  roadster2: {
    id: 'roadster2',
    url: 'models/roadster2/roadster2.glb',
    source: {
      master: 'assets-src/roadster2/roadster2.blend',
      script: 'assets-src/roadster2/build.py',
      masterSha256: '7361b677f68450d9f1a5ab36affd7125abac53ccfe6df320b3dd185bf5f62997',
      scriptSha256: '2e440bbde3129f28d44570ae31641d81ad840c00ead5b9d70d40c48e812ac1eb',
    },
    glb: { sha256: '067f8922bdcee1e2a5ef1384ffbb1f241135ab16f1a4ffd0f0ffcafbd26b3344', bytes: 1_395_788 },
    license: { id: 'owned', creator: 'Skyline Rush project' },
    provenance: {
      blender: '5.2.3',
      exporter: '5.2.41',
      gltfTransform: '4.5.1',
      commands: [
        '$BLENDER_BIN --background --factory-startup --python assets-src/roadster2/build.py',
        'node scripts/assets/export-glb.mjs roadster2',
        'node scripts/assets/optimize-glb.mjs roadster2',
        'node scripts/assets/check-glb.mjs roadster2 --promote',
      ],
    },
    nodes: [
      'body', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr', 'wheel_fl_spin', 'wheel_fr_spin', 'wheel_rl_spin', 'wheel_rr_spin',
      'wing', 'wing_blade', 'wing_tip_l', 'wing_tip_r', 'wing_rams',
      'thruster_01', 'thruster_02', 'thruster_03', 'thruster_04', 'nozzle_rear_01', 'nozzle_rear_02', 'nozzle_rear_03', 'nozzle_rear_04',
      'lift_fans', 'lift_fan_01', 'lift_fan_02', 'lift_fan_03', 'lift_fan_04',
    ],
    materials: ['roadster_paint', 'roadster_glass', 'roadster_trim', 'roadster_carbon', 'roadster_tire', 'roadster_rim', 'roadster_light', 'roadster_lamp', 'roadster_nozzle', 'roadster_fan'],
    lods: [{ quality: 'low', url: 'models/roadster2/roadster2-low.glb' }],
    fallback: 'procedural-car',
    decoders: ['meshopt', 'ktx2'],
    budgets: { triangles: 60_000, bytes: 1_500_000, textureMaxPx: 1024 },
  },
  // Task 7 Crimson GT, the second player car (src/car-catalog.ts): same rig nodes and contract pivots as roadster2.
  'crimson-gt': {
    id: 'crimson-gt',
    url: 'models/crimson-gt/crimson-gt.glb',
    source: {
      master: 'assets-src/crimson-gt/crimson-gt.blend',
      script: 'assets-src/crimson-gt/build.py',
      masterSha256: 'd9bb2bb9a06db74c6fec2723a3b1ccfda188652f0e537e336ca813c42af3fef0',
      scriptSha256: '9ab734ab533f927b2f774618d09d055fe84f8a7d4a5ce1253b25cb2591c64372',
    },
    glb: { sha256: 'c96e1296b9d71db7284a62778f33a5f321507ac55a6443638ca87b23c818dfe8', bytes: 1_201_628 },
    license: { id: 'owned', creator: 'Skyline Rush project' },
    provenance: {
      blender: '5.2.3',
      exporter: '5.2.41',
      gltfTransform: '4.5.1',
      commands: [
        '$BLENDER_BIN --background --factory-startup --python assets-src/crimson-gt/build.py',
        '$BLENDER_BIN --background --factory-startup --python assets-src/crimson-gt/bake.py',
        'node scripts/assets/export-glb.mjs crimson-gt',
        'node scripts/assets/optimize-glb.mjs crimson-gt',
        'node scripts/assets/check-glb.mjs crimson-gt --promote',
      ],
    },
    nodes: [
      'body', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr', 'wheel_fl_spin', 'wheel_fr_spin', 'wheel_rl_spin', 'wheel_rr_spin',
      'wing', 'wing_blade', 'wing_tip_l', 'wing_tip_r', 'wing_rams',
      'thruster_01', 'thruster_02', 'thruster_03', 'thruster_04', 'nozzle_rear_01', 'nozzle_rear_02', 'nozzle_rear_03', 'nozzle_rear_04',
      'lift_fans', 'lift_fan_01', 'lift_fan_02', 'lift_fan_03', 'lift_fan_04',
    ],
    materials: ['gt_paint', 'gt_glass', 'gt_trim', 'gt_carbon', 'gt_tire', 'gt_rim', 'gt_light', 'gt_lamp', 'gt_nozzle', 'gt_fan'],
    lods: [{ quality: 'low', url: 'models/crimson-gt/crimson-gt-low.glb' }],
    fallback: 'procedural-car',
    decoders: ['meshopt', 'ktx2'],
    budgets: { triangles: 60_000, bytes: 1_500_000, textureMaxPx: 1024 },
  },
  // Task 5 Coast close scenery (Medium+; Low keeps the procedural scenery). Poly Haven CC0 scans decimated with baked
  // normals, plus modelled palms and W-beam rail. Each node is a top-level piece at the origin, pivot at ground contact.
  'coast-scenery': {
    id: 'coast-scenery',
    url: 'models/coast-scenery/coast-scenery.glb',
    source: {
      master: 'assets-src/coast-scenery/coast-scenery.blend',
      script: 'assets-src/coast-scenery/build.py',
      masterSha256: 'd0d1fc30a29ecdafaa44a7223be89bf50488218e0157f359b8f21a0c2f0f0168',
      scriptSha256: '78911534d79b4664897bed9f7e6b667af3b068f24e1b7b73e51b8e96ffaab952',
    },
    glb: { sha256: 'edbababe79fc952b8c5043ff4b92bbdafc55ed7eaf7e299e6f590cddaf9aa930', bytes: 5_827_256 },
    license: {
      id: 'CC0-1.0',
      creator: 'Poly Haven: Rob Tuytel, Rico Cilliers (coastal_cliff_01/02/04, coast_rocks_05, metal_plate_02), Charlotte Baglioni (palm_bark); palms and rail modelled by Skyline Rush project',
      sourceUrl: 'https://polyhaven.com/a/coastal_cliff_04',
    },
    provenance: {
      blender: '5.2.3',
      exporter: '5.2.41',
      gltfTransform: '4.5.1',
      commands: [
        'python3 -I scripts/assets/fetch_polyhaven.py fetch',
        '$BLENDER_BIN --background --factory-startup --python assets-src/coast-scenery/build.py',
        'node scripts/assets/export-glb.mjs coast-scenery',
        'node scripts/assets/optimize-glb.mjs coast-scenery',
        'node scripts/assets/check-glb.mjs coast-scenery --promote',
      ],
    },
    nodes: ['sea_arch', 'sea_arch_front', 'sea_arch_back', 'cliff_a', 'cliff_b', 'rock_a', 'rock_b', 'palm_a', 'palm_b', 'guard_rail'],
    materials: ['coast_arch', 'coast_cliff_a', 'coast_cliff_b', 'coast_rock', 'coast_palm_bark', 'coast_palm_frond', 'coast_rail_steel'],
    lods: [],
    fallback: 'procedural-scenery',
    decoders: ['meshopt', 'ktx2'],
    budgets: { triangles: 63_500, bytes: 6_000_000, textureMaxPx: 1024 },
  },
  // Road power-ups: one mesh and one baked 512 px PBR set per tier, shared by the guide preview and the GPU-instanced
  // track pool. Shapes in each build.py; materials, bake and review sheets in scripts/assets/pickup_kit.py.
  'pickup-cell': pickupModel('cell', 3000, {
    master: '89066a7f864fc86ac3f9ee1ccc8d1264220005928f6719b40be77e84fd569773',
    script: '441f303eef72a0fd7c98abdd573c43a8ea1c0a01633576c4d390fbdc6fe4c7db',
    glb: 'fc12ea421a2e4f85163bb03c3653501a0fa836079448cdf89be51b2582920c1c',
    bytes: 296136,
  }),
  'pickup-can': pickupModel('can', 3000, {
    master: '1018d03abec9d2e7222b842a02348071bca7e8b795727383930d685887b62678',
    script: '4eb1fa8617885c7219eac05491c091379799d491c3dd80061b28a1d4b15a14ff',
    glb: 'a935f735d2d9c6c05c22400a9aeb81dbf8f2dccec0724c164549c9556e9dc3ab',
    bytes: 283440,
  }),
  'pickup-tank': pickupModel('tank', 4000, {
    master: '0dd516a8afebb9ebab65a38e8f2324a27317f730ea4ac12992b31d914dc3fea8',
    script: 'cd6fcf48c6ef93330e0742e1b0046fc822b135567fc9a2b8beb94ce938d6a799',
    glb: 'bee734a3ae2c9b016efee63886d0f86053de49ca1dcb33708e6f93f4ecd744de',
    bytes: 287132,
  }),
  'pickup-overcharge': pickupModel('overcharge', 4500, {
    master: 'eb4765525fd77fe2dd7700084b1edeb38497f69b714f5830494eb7b6ed02035a',
    script: '95a46e1f004cdb25a9c3bd1c9547a6934805cdfb2977567b104b10b4aec7804b',
    glb: 'fe33592ca9471de4e30c883b176dee8166314ca20bc3313962d52395c7cc98ec',
    bytes: 283232,
  }),
};

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX64 = /^[0-9a-f]{64}$/;
const VERSION = /^\d+\.\d+/;
const NODE_NAME = /^[a-z][a-z0-9_]*$/;
const PERSONAL_PATH = /\/Users\/|\/home\/|C:\\Users\\/i;
const positiveInt = (n: number): boolean => Number.isInteger(n) && n > 0;
const blank = (s: unknown): boolean => typeof s !== 'string' || s.trim() === '';
const dupes = (list: string[]): boolean => new Set(list).size !== list.length;
const unsafePath = (u: string): boolean => /^\/|\.\.|\\|^[a-z][a-z0-9+.-]*:/i.test(u);

export function validateManifestEntry(entry: ModelManifestEntry, key: string): string[] {
  const errors: string[] = [];
  const bad = (field: string, reason: string): number => errors.push(`${field}: ${reason}`);
  const { id, source, glb, license, provenance, budgets } = entry;

  if (!KEBAB.test(id)) bad('id', 'must be kebab-case');
  if (id !== key) bad('id', `must equal its record key "${key}"`);
  if (unsafePath(entry.url) || entry.url !== `models/${id}/${id}.glb`) bad('url', `must be models/${id}/${id}.glb`);

  if (source.master !== `assets-src/${id}/${id}.blend`) bad('source.master', `must be assets-src/${id}/${id}.blend`);
  if (source.script !== `assets-src/${id}/build.py`) bad('source.script', `must be assets-src/${id}/build.py`);
  if (!HEX64.test(source.masterSha256)) bad('source.masterSha256', 'must be 64 lowercase hex characters');
  if (!HEX64.test(source.scriptSha256)) bad('source.scriptSha256', 'must be 64 lowercase hex characters');

  if (!HEX64.test(glb.sha256)) bad('glb.sha256', 'must be 64 lowercase hex characters');
  if (!positiveInt(glb.bytes)) bad('glb.bytes', 'must be a positive integer');
  else if (glb.bytes > budgets.bytes) bad('glb.bytes', `exceeds budget ${budgets.bytes}`);

  if (blank(license.id)) bad('license.id', 'required');
  if (blank(license.creator)) bad('license.creator', 'required');
  if (license.sourceUrl !== undefined && !license.sourceUrl.startsWith('https://')) bad('license.sourceUrl', 'must be https://');

  for (const field of ['blender', 'exporter', 'gltfTransform'] as const) {
    if (!VERSION.test(provenance[field])) bad(`provenance.${field}`, 'must look like <major>.<minor>');
  }
  if (provenance.commands.length === 0 || provenance.commands.some(blank)) bad('provenance.commands', 'must be a non-empty list of strings');
  if (provenance.commands.some(c => PERSONAL_PATH.test(c))) bad('provenance.commands', 'contains a personal path');

  if (entry.nodes.length === 0) bad('nodes', 'must not be empty');
  if (dupes(entry.nodes)) bad('nodes', 'must be unique');
  for (const name of entry.nodes) if (!NODE_NAME.test(name)) bad('nodes', `"${name}" must match ${NODE_NAME}`);

  if (entry.materials.length === 0) bad('materials', 'must not be empty');
  if (dupes(entry.materials)) bad('materials', 'must be unique');
  if (entry.materials.some(blank)) bad('materials', 'names must be non-empty');

  if (dupes(entry.lods.map(l => l.quality))) bad('lods', 'qualities must be unique');
  for (const lod of entry.lods) {
    if (lod.quality !== 'high' && lod.quality !== 'low') bad('lods', `unknown quality "${String(lod.quality)}"`);
    if (unsafePath(lod.url) || !lod.url.startsWith(`models/${id}/`) || !lod.url.endsWith('.glb')) bad('lods', `url "${lod.url}" must be models/${id}/*.glb`);
  }

  if (!(FALLBACK_KEYS as readonly string[]).includes(entry.fallback)) bad('fallback', 'unknown fallback key');
  if (entry.decoders.some(d => !(DECODERS as readonly string[]).includes(d))) bad('decoders', 'unknown decoder');
  if (dupes(entry.decoders)) bad('decoders', 'must be unique');

  if (!positiveInt(budgets.triangles)) bad('budgets.triangles', 'must be a positive integer');
  if (!positiveInt(budgets.bytes)) bad('budgets.bytes', 'must be a positive integer');
  if (!Number.isInteger(budgets.textureMaxPx) || budgets.textureMaxPx < 0) bad('budgets.textureMaxPx', 'must be an integer >= 0');
  return errors;
}

/** `baseUrl` is Vite's BASE_URL and always ends in `/`. */
export function modelUrl(path: string, baseUrl: string): string {
  return baseUrl + path;
}
