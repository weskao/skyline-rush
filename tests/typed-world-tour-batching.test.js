import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { Group, BoxGeometry, Mesh, MeshBasicMaterial, Matrix4 } from 'three';

test('World Tour static mesh batching has one strict TS implementation without changing transforms', async () => {
  assert.equal(existsSync(new URL('../src/world-tour-batching.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/world-tour-batching.js', import.meta.url)), false);
  const { batchStaticChunk } = await import('../src/world-tour-batching.ts');
  const chunk = new Group(), geometry = new BoxGeometry(1, 2, 3), material = new MeshBasicMaterial();
  const original = [];
  for (let i = 0; i < 5; i++) {
    const parent = new Group();
    parent.position.set(i * 4, 2, i * 7);
    const mesh = new Mesh(geometry, material);
    parent.add(mesh);
    chunk.add(parent);
    chunk.updateMatrixWorld(true);
    original.push(mesh.matrixWorld.clone());
  }
  const stats = batchStaticChunk(chunk, 3);
  assert.deepEqual(stats, { sourceMeshes: 5, drawBatches: 1, trianglesPreserved: true });
  const batch = chunk.children.find(obj => obj.isInstancedMesh);
  assert.ok(batch);
  assert.equal(batch.geometry, geometry);
  assert.equal(batch.material, material);
  const scratch = new Matrix4();
  for (let i = 0; i < 5; i++) {
    batch.getMatrixAt(i, scratch);
    for (let j = 0; j < 16; j++)
      assert.ok(Math.abs(scratch.elements[j] - original[i].elements[j]) < 1e-6);
  }
  assert.equal(batchStaticChunk(new Group()).sourceMeshes, 0);
});
