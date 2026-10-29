import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { poolStaticChunks, releaseStaticPool } from '../src/world-tour-batching.ts';

test('two-chunk spatial pools preserve GPU instancing without drawing far-away triangles', () => {
  const layer = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial();
  const chunks = Array.from({ length: 6 }, (_, index) => {
    const chunk = new THREE.Group();
    chunk.name = 'world-tour-tokyo-chunk-' + index;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(index * 120, 0, 0);
    chunk.add(mesh);
    layer.add(chunk);
    return chunk;
  });
  layer.updateMatrixWorld(true);
  const pool = poolStaticChunks(layer, chunks, null, 2);
  try {
    assert.equal(pool.children.length, 3, 'do not combine six 120m chunks into one oversized culling bound');
    assert.equal(pool.userData.drawsSaved, 3, 'still save one draw per neighbouring pair');
    for (const batch of pool.children) {
      assert.ok(batch instanceof THREE.InstancedMesh);
      assert.equal(batch.count, 2);
      assert.ok(batch.boundingSphere && batch.boundingSphere.radius < 65,
        'each 240m spatial batch must retain a narrow frustum bound');
    }
    assert.ok(chunks.every(chunk => chunk.children[0].visible === false));
  } finally {
    releaseStaticPool(pool);
    assert.ok(chunks.every(chunk => chunk.children[0].visible === true));
    geometry.dispose();
    material.dispose();
  }
});
