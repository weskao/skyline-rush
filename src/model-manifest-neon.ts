// Task 5b Neon Downtown rows of the model manifest (src/model-manifest.ts spreads them in). Data only.
import type { ModelManifestEntry } from './model-manifest.ts';

// Hashes/bytes come from `node scripts/assets/check-glb.mjs <id>` and shasum of the committed sources.
export const NEON_MODELS: Record<string, ModelManifestEntry> = {
  // City kit: 20 modelled modules on one material and one 2K atlas. Each `<module>` node is the pivot, its
  // `<module>_lod<n>` children the meshes; contract in assets-src/neon-city/asset-brief.md.
  'neon-city': {
    id: 'neon-city',
    url: 'models/neon-city/neon-city.glb',
    source: {
      master: 'assets-src/neon-city/neon-city.blend',
      script: 'assets-src/neon-city/build.py',
      masterSha256: 'bd5bbe634a98c8e344302eafaba6813c94c684980a2c14a29cdbf2a7761e5bd9',
      scriptSha256: 'e376588ca25905afb88b2c976a186fdf515a5e5f0102f81ac6d112994cc12dad',
    },
    glb: { sha256: '0b1914f5bde8d1955d8f662be5b9a6cd55657bf40d21822ef3a2aa2f26a274c6', bytes: 1_093_972 },
    license: {
      id: 'CC0-1.0',
      creator: 'Poly Haven: Charlotte Baglioni, Dario Barresi, Amal Kumar, Dimitrios Savva, Rob Tuytel (wall, tile, plank, roof, bark and metal sets in assets-src/neon-city/sources.json); modules and atlas by Skyline Rush project',
      sourceUrl: 'https://polyhaven.com/a/roof_tiles_14',
    },
    provenance: {
      blender: '5.2.3',
      exporter: '5.2.41',
      gltfTransform: '4.5.1',
      commands: [
        'python3 -I assets-src/neon-city/fetch_sources.py',
        '$BLENDER_BIN --background --factory-startup --python assets-src/neon-city/build.py',
        'node scripts/assets/export-glb.mjs neon-city',
        'node scripts/assets/optimize-glb.mjs neon-city',
        'node scripts/assets/check-glb.mjs neon-city --promote',
      ],
    },
    nodes: [
      ...['tower_glass_a', 'tower_glass_b', 'block_retail_a', 'block_office_b', 'shop_market_a', 'shop_market_b', 'cherry_tree'].flatMap(m => [m, `${m}_lod0`, `${m}_lod1`, `${m}_lod2`]),
      ...['sign_blade_a', 'sign_blade_b', 'sign_stack_a', 'billboard_a', 'billboard_b', 'street_lamp', 'traffic_light', 'railing', 'kerb_redwhite', 'skyline_tower_a', 'skyline_tower_b', 'skyline_tower_c', 'skyline_spire'].flatMap(m => [m, `${m}_lod0`, `${m}_lod1`]),
    ],
    materials: ['neon_city'],
    lods: [],
    fallback: 'procedural-scenery',
    decoders: ['meshopt', 'ktx2'],
    budgets: { triangles: 11_000, bytes: 1_300_000, textureMaxPx: 2048 },
  },
  // Landmarks: nine modelled pieces, each a pivot with a `_lod0` and a `_lod1` mesh, one material on three shared
  // atlases. Placement data: assets-src/neon-landmarks/asset-brief.md, "Integration contract".
  'neon-landmarks': {
    id: 'neon-landmarks',
    url: 'models/neon-landmarks/neon-landmarks.glb',
    source: {
      master: 'assets-src/neon-landmarks/neon-landmarks.blend',
      script: 'assets-src/neon-landmarks/build.py',
      masterSha256: '67e9cd19e4a8fd4eb589a5126599b15f2824a29fc01a58922e2edc96b937f483',
      scriptSha256: '0bca4a2276363ed2778b7c24ddb8edc2beec42ecc0c7dd57307575a69e4d334d',
    },
    glb: { sha256: '407483eb81450385072d6a9b5b9755a8e346bbab35c5f5db251168d8ab92ec20', bytes: 1451000 },
    license: { id: 'owned', creator: 'Skyline Rush project (modelled and textured in assets-src/neon-landmarks/build.py; no outside source)' },
    provenance: {
      blender: '5.2.3',
      exporter: '5.2.41',
      gltfTransform: '4.5.1',
      commands: [
        '$BLENDER_BIN --background --factory-startup --python assets-src/neon-landmarks/build.py',
        'node scripts/assets/export-glb.mjs neon-landmarks',
        'node scripts/assets/optimize-glb.mjs neon-landmarks',
        'node scripts/assets/check-glb.mjs neon-landmarks --promote',
      ],
    },
    nodes: ['rail_portal', 'rail_segment', 'expressway_pier', 'expressway_rail', 'canal_arch', 'canal_bridge_rail', 'canal_bank', 'plaza_sculpture', 'boulevard_footbridge']
      .flatMap(piece => [piece, `${piece}_lod0`, `${piece}_lod1`]),
    materials: ['neon_landmarks'],
    lods: [],
    fallback: 'procedural-scenery',
    decoders: ['meshopt', 'ktx2'],
    budgets: { triangles: 16_000, bytes: 4_000_000, textureMaxPx: 2048 },
  },
};
