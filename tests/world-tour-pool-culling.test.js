import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStaticChunk, poolStaticChunks, releaseStaticPool } from '../src/world-tour-batching.ts';

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

test('cross-chunk pooling keeps transparent sorting and distinct shadow semantics unchanged', () => {
  const layer=new THREE.Group(), geometry=new THREE.BoxGeometry(1,1,1);
  const opaque=new THREE.MeshStandardMaterial(),glass=new THREE.MeshStandardMaterial({transparent:true,opacity:.4});
  const chunks=Array.from({length:5},(_,i)=>{
    const chunk=new THREE.Group();chunk.userData.chunkIndex=i;
    const solid=new THREE.Mesh(geometry,opaque);
    solid.castShadow=i<2;
    chunk.add(solid);
    const transparent=new THREE.Mesh(geometry,glass);
    chunk.add(transparent);
    layer.add(chunk);return chunk;
  });
  const pool=poolStaticChunks(layer,chunks,null,10);
  try {
    assert.equal(pool.children.length,2,'only opaque meshes with identical flags may be grouped');
    const castBatch=pool.children.find(item=>item.castShadow);
    assert.ok(castBatch instanceof THREE.InstancedMesh && castBatch.count===2,
      'instanced mesh must preserve source shadow casting');
    assert.ok(chunks.every(chunk=>chunk.children[1].visible),
      'transparent props must retain independent depth sorting');
    assert.equal(pool.userData.drawsSaved,3);
  } finally {
    releaseStaticPool(pool);geometry.dispose();opaque.dispose();glass.dispose();
  }
});

test('per-chunk instancing never changes transparent or individually ordered drawables', () => {
  const chunk=new THREE.Group(),geometry=new THREE.BoxGeometry(1,1,1);
  const transparent=new THREE.MeshBasicMaterial({transparent:true,opacity:.5});
  const opaque=new THREE.MeshBasicMaterial();
  for(let i=0;i<4;i++){
    const glass=new THREE.Mesh(geometry,transparent);chunk.add(glass);
    const ordered=new THREE.Mesh(geometry,opaque);ordered.renderOrder=i+1;chunk.add(ordered);
  }
  const result=batchStaticChunk(chunk);
  try {
    assert.equal(result.drawBatches,0);
    assert.equal(chunk.children.length,8);
  } finally {geometry.dispose();transparent.dispose();opaque.dispose();}
});
