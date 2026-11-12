import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { drawnMarkers } from '../src/marker-pool.js';
import { animatePickup, pickupPulse, PICKUP_SIZES } from '../src/pickup-art.js';
import { createPickupMarkers } from '../src/pickup-markers.js';
import { PICKUP_GLOW, PICKUP_TIERS, plainGeometry } from '../src/pickup-models.ts';

const tiers = ['cell', 'can', 'tank', 'overcharge'];
// What pickup-models.ts hands over once the four GLBs are parsed.
function loadedModels() {
  const model = { released: 0, geometries: {}, materials: {}, release() { model.released++; } };
  for (const tier of tiers) {
    model.geometries[tier] = new THREE.BoxGeometry();
    model.materials[tier] = new THREE.MeshStandardMaterial();
    model.materials[tier].userData.glow = PICKUP_GLOW;
  }
  return model;
}
function drawOne(markers, tier, time, still) {
  const marker = new THREE.Object3D(), item = { tier, distance: 40, altitude: 2 };
  markers.pool.begin();
  markers.place(marker, item, time, still);
  marker.updateMatrix();
  markers.pool.add(tier, marker.matrix);
  markers.pool.end();
  markers.end();
  return marker;
}

test('shared tier list matches the pickup art', () => assert.deepEqual([...PICKUP_TIERS], tiers));

test('one renderer poses the model and its halo exactly like the shared pickup animation', () => {
  const markers = createPickupMarkers(4);
  const [pool, aura] = markers.objects;
  assert.equal(pool.name, 'Nitro pickups');
  assert.ok(aura.isInstancedMesh && aura.count >= 1 && aura.instanceColor, 'the halo program is warmed by a parked instance');
  for (const still of [false, true]) {
    assert.equal(markers.frame(3, still, true), false, 'no models were requested, so nothing is ever swapped');
    const marker = drawOne(markers, 'tank', 3, still), expected = new THREE.Object3D();
    animatePickup(expected, { tier: 'tank', distance: 40, altitude: 2 }, 3, still);
    assert.deepEqual(marker.matrix.elements, expected.updateMatrix() ?? expected.matrix.elements);
    assert.equal(drawnMarkers(pool).length, 1);
    assert.equal(pool.getObjectByName('tank').material.emissiveIntensity, .35 * pickupPulse('tank', 3, still), 'glow pulse');
    const halo = new THREE.Matrix4(), at = new THREE.Vector3(), scale = new THREE.Vector3(), tint = new THREE.Color();
    aura.getMatrixAt(0, halo);
    halo.decompose(at, new THREE.Quaternion(), scale);
    aura.getColorAt(0, tint);
    assert.ok(aura.visible && aura.count === 1);
    assert.ok(at.distanceTo(marker.position) < 1e-5, 'the halo sits on the animated pickup'); // instance matrices are float32
    assert.ok(scale.x > PICKUP_SIZES.tank * 2, 'and is wider than the model');
    assert.ok(tint.r > tint.b, 'in the tier accent (gold)');
  }
  markers.frame(4, false, true);
  markers.pool.begin(); markers.pool.end(); markers.end();
  assert.equal(aura.visible, false, 'no pickup in view, no halo draw');
  markers.dispose();
});

test('loaded models replace the stand-ins only when allowed, once, and report it for the shader warm-up', async () => {
  const models = loadedModels(), markers = createPickupMarkers(4, { models: Promise.resolve(models) });
  const pool = markers.pool.group, standIns = pool.children.map(mesh => [mesh.geometry, mesh.material]), disposed = new Set();
  for (const resource of standIns.flat()) resource.addEventListener('dispose', () => disposed.add(resource));
  await markers.ready;
  assert.equal(markers.frame(1, false, false), false, 'mid-race: the stand-ins stay, no shader compiles');
  assert.ok(pool.children.every((mesh, i) => mesh.geometry === standIns[i][0]));
  assert.equal(markers.frame(1, false, true), true, 'between races: swapped, the caller re-warms shaders');
  for (const tier of tiers) {
    const mesh = pool.getObjectByName(tier);
    assert.equal(mesh.geometry, models.geometries[tier], tier);
    assert.equal(mesh.material, models.materials[tier], tier);
    assert.equal(mesh.material.emissiveIntensity, PICKUP_GLOW * pickupPulse(tier, 1, false), tier + ' pulses around its baked glow');
  }
  assert.equal(disposed.size, standIns.flat().length, 'stand-in geometry and materials are released');
  assert.equal(markers.frame(2, false, true), false, 'only the swap frame reports');
  drawOne(markers, 'cell', 2, false);
  const shared = [...Object.values(models.geometries), ...Object.values(models.materials)];
  let sharedDisposed = 0;
  for (const resource of shared) resource.addEventListener('dispose', () => sharedDisposed++);
  markers.dispose();
  assert.equal(models.released, 1, 'the model set is handed back exactly once');
  assert.equal(sharedDisposed, 0, 'shared model geometry is never disposed by one renderer');
});

test('a failed or late model load leaves a working procedural renderer and leaks nothing', async () => {
  for (const models of [Promise.resolve(null), Promise.reject(new Error('offline'))]) {
    const markers = createPickupMarkers(2, { models });
    await markers.ready;
    assert.equal(markers.frame(1, false, true), false);
    assert.ok(markers.pool.group.children.every(mesh => mesh.material.isMeshPhysicalMaterial));
    markers.dispose();
  }
  const late = loadedModels(), markers = createPickupMarkers(2, { models: Promise.resolve(late) });
  markers.dispose(); // the track is left before the download ends
  await markers.ready;
  assert.equal(late.released, 1);
});

test('plainGeometry turns a quantized, node-scaled mesh into plain local vertices', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Int16Array([0, 0, 0, 32767, 0, 0, 0, -32767, 16384]), 3, true));
  const mesh = new THREE.Mesh(geometry), parent = new THREE.Group();
  mesh.scale.setScalar(2);
  mesh.position.set(0, 1, 0);
  parent.add(mesh);
  const plain = plainGeometry(mesh), position = plain.getAttribute('position');
  assert.ok(position.array instanceof Float32Array && !position.normalized);
  assert.deepEqual([...position.array].map(v => +v.toFixed(3)), [0, 1, 0, 2, 1, 0, 0, -1, 1]);
  assert.equal(geometry.getAttribute('position').array.constructor, Int16Array, 'the cached source mesh is untouched');
});
