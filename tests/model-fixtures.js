// Shared fixtures for the Phase 2 model manifest / loader tests (not a test file itself).

/** A manifest entry that satisfies every rule in phase2-model-contracts.md §1. */
export function validEntry(id = 'probe-test') {
  return {
    id,
    url: `models/${id}/${id}.glb`,
    source: {
      master: `assets-src/${id}/${id}.blend`,
      script: `assets-src/${id}/build.py`,
      masterSha256: 'a'.repeat(64),
      scriptSha256: 'b'.repeat(64),
    },
    glb: { sha256: 'c'.repeat(64), bytes: 1000 },
    license: { id: 'owned', creator: 'Skyline Rush project' },
    provenance: { blender: '4.5.0', exporter: '4.5.47', gltfTransform: '4.5.1', commands: ['node scripts/assets/export-glb.mjs probe-test'] },
    nodes: ['probe_body', 'wheel_fl'],
    materials: ['probe_paint'],
    lods: [],
    fallback: 'procedural-car',
    decoders: [],
    budgets: { triangles: 5000, bytes: 200000, textureMaxPx: 0 },
  };
}

const pad4 = (buf, byte) => Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4, byte)]);

/**
 * Minimal valid GLB (JSON + BIN chunk, one triangle). One mesh per material; node i uses mesh i % meshes.
 * @param {{ nodes?: string[], materials?: string[], extensionsRequired?: string[] }} [options]
 */
export function makeGlb({ nodes = ['probe_body', 'wheel_fl'], materials = ['probe_paint'], extensionsRequired } = {}) {
  const bin = pad4(Buffer.from(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer), 0);
  const meshes = (materials.length ? materials : [null]).map((_, m) => ({
    primitives: [{ attributes: { POSITION: 0 }, ...(materials.length ? { material: m } : {}) }],
  }));
  const json = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes: nodes.map((name, i) => ({ name, mesh: i % meshes.length })),
    meshes,
    materials: materials.map(name => ({ name })),
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }],
    bufferViews: [{ buffer: 0, byteLength: 36 }],
    buffers: [{ byteLength: bin.length }],
    ...(extensionsRequired ? { extensionsUsed: extensionsRequired, extensionsRequired } : {}),
  };
  const jsonChunk = pad4(Buffer.from(JSON.stringify(json)), 0x20);
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(type, 4);
    return Buffer.concat([head, data]);
  };
  const body = Buffer.concat([chunk(0x4e4f534a, jsonChunk), chunk(0x004e4942, bin)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + body.length, 8);
  const glb = Buffer.concat([header, body]);
  return glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.length);
}
