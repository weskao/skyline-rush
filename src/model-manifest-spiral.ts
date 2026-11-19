// Sky Spiral model manifest entries (Task 8c), spread into MODEL_MANIFEST by src/model-manifest.ts.
import type { ModelManifestEntry } from './model-manifest.ts';

export const SPIRAL_MODELS: Record<string, ModelManifestEntry> = {
  // Landmark kit: twelve nodes on one material and one 2K atlas (base colour, normal, ORM, emissive from CC0
  // scans). Each node is one mesh and its own pivot; `tower_far` is the tower drawn at distance. Node contract,
  // pivots and lamp luminance: assets-src/spiral-landmarks/asset-brief.md and contract.json.
  'spiral-landmarks': {
    id: 'spiral-landmarks',
    url: 'models/spiral-landmarks/spiral-landmarks.glb',
    source: {
      master: 'assets-src/spiral-landmarks/spiral-landmarks.blend',
      script: 'assets-src/spiral-landmarks/build.py',
      masterSha256: '6e21de1aaf15fe3e1a1a6e9aef608f30191ca2a575523e992060c2daf1efa5cb',
      scriptSha256: '1bd283b4f703c3e026d8b3da39c462768fb4202da2f0e4e5277673a1f5feb895',
    },
    glb: { sha256: '4327e084dfeed471fc6b34159cbd9081f99ff28ab8e57c157cf3d222f6e33ff9', bytes: 983_356 },
    license: {
      id: 'CC0-1.0',
      creator: 'Poly Haven: Amal Kumar, Rob Tuytel (concrete, painted metal, snow and rock sets in assets-src/spiral-landmarks/sources.json); pieces and atlas by Skyline Rush project',
      sourceUrl: 'https://polyhaven.com/a/concrete_panels',
    },
    provenance: {
      blender: '5.2.3',
      exporter: '5.2.41',
      gltfTransform: '4.5.1',
      commands: [
        'python3 -I assets-src/spiral-landmarks/fetch_sources.py',
        '$BLENDER_BIN --background --factory-startup --python assets-src/spiral-landmarks/build.py',
        'node scripts/assets/export-glb.mjs spiral-landmarks',
        'node scripts/assets/optimize-glb.mjs spiral-landmarks',
        'node scripts/assets/check-glb.mjs spiral-landmarks --promote',
      ],
    },
    nodes: ['tower', 'tower_far', 'strut', 'platform_a', 'platform_b', 'station', 'chevron_sign', 'gap_marker', 'cloud_a', 'cloud_b', 'cloud_c', 'peak'],
    materials: ['spiral_landmarks'],
    lods: [],
    fallback: 'procedural-scenery',
    decoders: ['meshopt', 'ktx2'],
    budgets: { triangles: 11_000, bytes: 1_500_000, textureMaxPx: 2048 },
  },
};
