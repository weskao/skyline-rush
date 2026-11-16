import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPickupGeometries, PICKUP_SIZES, animatePickup } from '../src/pickup-art.js';
import { createMarkerPool, drawnMarkers } from '../src/marker-pool.js';

test('each roadside tier has its own finite, colored, volumetric collectible mesh', () => {
  const shapes = createPickupGeometries();
  try {
    assert.deepEqual(Object.keys(shapes), ['cell', 'can', 'tank', 'overcharge']);
    const dimensions = [];
    for (const [tier, shape] of Object.entries(shapes)) {
      shape.computeBoundingBox();
      const size = shape.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(PICKUP_SIZES[tier]);
      assert.ok(size.x > .3 && size.y > .5 && size.z > .3, tier + ' is actually 3D');
      assert.ok([...shape.attributes.position.array].every(Number.isFinite), tier + ' has finite vertices');
      assert.ok(shape.attributes.color && shape.attributes.color.count === shape.attributes.position.count, tier + ' has material colors');
      dimensions.push(size.toArray().map(x => Math.round(x * 100) / 100).join('/'));
    }
    assert.equal(new Set(dimensions).size, 4, 'the four collectible silhouettes have different dimensions');
    assert.ok(new Set(shapes.overcharge.attributes.color.array).size > 6, 'overcharge core is genuinely rainbow');
  } finally { Object.values(shapes).forEach(g => g.dispose()); }
});

test('instanced pickup renderer accepts one unique shape per tier without more draw calls', () => {
  const shapes = createPickupGeometries();
  const mats = Object.fromEntries(Object.keys(shapes).map(tier => [tier, new THREE.MeshBasicMaterial()]));
  const pool = createMarkerPool('Nitro pickups', shapes, mats, 8);
  try {
    pool.begin();
    for (const tier of Object.keys(shapes)) assert.ok(pool.add(tier, new THREE.Matrix4()));
    pool.end();
    assert.equal(pool.group.children.length, 4);
    assert.equal(drawnMarkers(pool.group).length, 4);
    assert.equal(new Set(pool.group.children.map(m => m.geometry.uuid)).size, 4);
    assert.ok(pool.group.children.every(m => m.isInstancedMesh));
  } finally { pool.dispose(); Object.values(shapes).forEach(g => g.dispose()); Object.values(mats).forEach(m => m.dispose()); }
});

test('pickups rotate and hover while reduced-motion freezes their pose', () => {
  const marker = new THREE.Object3D(), item = { distance: 120, tier: 'tank' };
  marker.position.y = 4;
  animatePickup(marker, item, 0, false);
  const first = marker.rotation.y, height = marker.position.y;
  marker.position.y = 4;
  animatePickup(marker, item, 2, false);
  assert.notEqual(marker.rotation.y, first);
  assert.notEqual(marker.position.y, height);
  marker.position.y = 4;
  animatePickup(marker, item, 9, true);
  assert.equal(marker.rotation.y, .2);
  assert.equal(marker.position.y, 4);
});
