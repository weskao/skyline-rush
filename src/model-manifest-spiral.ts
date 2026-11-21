// Sky Spiral model manifest entries (Task 8c), spread into MODEL_MANIFEST by src/model-manifest.ts.
import type { ModelManifestEntry } from './model-manifest.ts';

export const SPIRAL_MODELS: Record<string, ModelManifestEntry> = {
  // Landmark kit: sixteen nodes on one material and one 2K atlas (base colour, normal, ORM, emissive from CC0
  // scans). Each node is one mesh and its own pivot; `tower_far` is the tower drawn at distance. Node contract,
  // pivots and lamp luminance: assets-src/spiral-landmarks/asset-brief.md and contract.json.
  'spiral-landmarks': {
    id: 'spiral-landmarks',
    url: 'models/spiral-landmarks/spiral-landmarks.glb',
    source: {
      master: 'assets-src/spiral-landmarks/spiral-landmarks.blend',
      script: 'assets-src/spiral-landmarks/build.py',
      masterSha256: '2913e7a5e7e1b31a01f2f16afb66305ea655df960431fe883ca1d02dc0149ef5',
      scriptSha256: 'ca5ca9d4c8e66021634e2254be0b0d8e9fcae10ebda1eb5719bee77a93f72701',
    },
    glb: { sha256: '2488ff2b84a22d8cb75b6a99a69240f5d8bb0aaa848f6df441c49fff02bd919d', bytes: 1_019_196 },
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
    nodes: ['tower', 'tower_far', 'strut', 'platform_a', 'platform_b', 'station', 'chevron_sign', 'gap_marker', 'cloud_a', 'cloud_b', 'cloud_c', 'peak', 'bird_body', 'bird_wing_l', 'bird_wing_r', 'airship'],
    materials: ['spiral_landmarks'],
    lods: [],
    fallback: 'procedural-scenery',
    decoders: ['meshopt', 'ktx2'],
    budgets: { triangles: 11_000, bytes: 1_500_000, textureMaxPx: 2048 },
  },
};
