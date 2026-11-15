import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { TRAFFIC_CAR_STYLES, makeCar } from '../src/car-model.js';
import { applyCarReflections, CAR_REFLECTION } from '../src/car-reflections.ts';
import { createTrafficFleet, TRAFFIC_COLORS } from '../src/traffic-fleet.ts';
import { isLightSource } from '../src/wet-reflection.ts';

// Each traffic car was a makeCar() group of its own (15 visible meshes): 129 to 430 draw calls in a Neon race.
// Instanced, the whole fleet costs at most one call per style and material, whatever the car count.
const STYLES = TRAFFIC_CAR_STYLES.length, MAX_CALLS = 21;
const triangles = geometry => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
const signature = m => [m.type, m.color.toArray(), m.metalness, m.roughness, m.transparent].join();
const styleMeshes = (fleet, s) => fleet.group.children.filter(mesh => mesh.name.startsWith(`${s}:`));
const fleetOf = count => createTrafficFleet(new THREE.Scene(), count);
const show = (fleet, shown) => fleet.cars.forEach((car, i) => { car.visible = shown.includes(i); });

test('world.js draws traffic through the fleet, not one makeCar() group per car', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /makeCar\(TRAFFIC_CAR_STYLES/);
  assert.match(world, /createTrafficFleet\(scene, /);
  assert.match(world, /trafficFleet\.sync\(\)/);
});

for (const count of [36, 108]) test(`${count} traffic cars cost at most ${MAX_CALLS} draw calls`, () => {
  const fleet = fleetOf(count);
  assert.equal(fleet.group.children.length, MAX_CALLS, 'three styles x seven materials');
  assert.ok(fleet.group.children.every(mesh => mesh.isInstancedMesh));
  assert.equal(fleet.cars.length, count);
  show(fleet, fleet.cars.map((_, i) => i));
  fleet.sync();
  assert.equal(fleet.group.children.filter(mesh => mesh.visible).length, MAX_CALLS);
  for (let s = 0; s < STYLES; s++) for (const mesh of styleMeshes(fleet, s)) assert.equal(mesh.count, count / STYLES, 'every car of the style is one instance');
});

TRAFFIC_CAR_STYLES.forEach((style, s) => test(`traffic style ${s}: the instanced car is the makeCar() model`, () => {
  const car = makeCar(style), meshes = styleMeshes(fleetOf(STYLES), s);
  car.updateMatrixWorld(true);
  const parts = [];
  car.traverseVisible(object => { if (object.isMesh) parts.push(object); }); // the hidden lift fans never drew
  assert.equal(meshes.reduce((sum, mesh) => sum + triangles(mesh.geometry), 0), parts.reduce((sum, mesh) => sum + triangles(mesh.geometry), 0), 'every triangle');
  const baked = new THREE.Box3(), model = new THREE.Box3();
  for (const mesh of meshes) { mesh.geometry.computeBoundingBox(); baked.union(mesh.geometry.boundingBox); }
  for (const mesh of parts) model.expandByObject(mesh);
  [...baked.min.toArray(), ...baked.max.toArray()].forEach((v, i) => assert.ok(Math.abs(v - [...model.min.toArray(), ...model.max.toArray()][i]) < 1e-4, `bounds[${i}]`));
  // Same materials, the paint aside: it is white and each instance brings its own colour.
  const paint = car.userData.body.material;
  assert.deepEqual(meshes.filter(mesh => !mesh.instanceColor).map(mesh => signature(mesh.material)).sort(),
    [...new Set(parts.filter(mesh => mesh.material !== paint).map(mesh => signature(mesh.material)))].sort());
  const painted = meshes.filter(mesh => mesh.instanceColor);
  assert.equal(painted.length, 1);
  assert.equal(signature(painted[0].material), signature(Object.assign(paint.clone(), { color: new THREE.Color('#ffffff') })));
  assert.equal(meshes.filter(isLightSource).length, 2, 'head and tail lamps stay unlit light sources for the wet-road mirror');
}));

test('only the visible cars are drawn, at their pose, in the paint the old pool gave them', () => {
  const fleet = fleetOf(36), matrix = new THREE.Matrix4(), color = new THREE.Color();
  show(fleet, [3, 9, 10]); // styles 0, 0, 1
  fleet.cars[3].position.set(4, 0, -120);
  fleet.cars[9].position.set(-6, 2, -300); fleet.cars[9].quaternion.setFromEuler(new THREE.Euler(0.02, 0.5, -0.04));
  fleet.sync();
  for (const mesh of styleMeshes(fleet, 0)) {
    assert.equal(mesh.count, 2);
    [3, 9].forEach((car, slot) => { mesh.getMatrixAt(slot, matrix); fleet.cars[car].updateMatrix(); assert.deepEqual(matrix.toArray(), fleet.cars[car].matrix.toArray().map(Math.fround)); }); // instance matrices are float32
    for (const car of [3, 9]) assert.ok(mesh.boundingSphere.distanceToPoint(fleet.cars[car].position) < 3, 'the cull bound reaches each of this frame\'s cars'); // 3 m: a part sits within a car length of the origin
  }
  assert.equal(fleet.cars[3].scale.x, 0.96, 'traffic keeps its 0.96 size');
  const paint = styleMeshes(fleet, 0).find(mesh => mesh.instanceColor);
  [3, 9].forEach((car, slot) => { paint.getColorAt(slot, color); assert.equal(color.getHexString(), new THREE.Color(TRAFFIC_COLORS[car % 5]).getHexString()); });
  assert.ok(styleMeshes(fleet, 1).every(mesh => mesh.visible && mesh.count === 1));
  assert.ok(styleMeshes(fleet, 2).every(mesh => !mesh.visible), 'a style with no car in view is not drawn');
});

test('an idle fleet keeps one parked car per mesh for the shader warmup, never a zero scale', () => {
  const fleet = fleetOf(108), matrix = new THREE.Matrix4();
  show(fleet, []);
  fleet.sync();
  for (const mesh of fleet.group.children) {
    assert.equal(mesh.visible, false);
    assert.equal(mesh.count, 1); // warmupShaders un-hides it: WebKit builds a pipeline only on a real draw
    mesh.getMatrixAt(0, matrix);
    assert.ok(matrix.elements[13] <= -1000 && matrix.determinant() !== 0, 'parked below the scene');
  }
  assert.equal(fleet.group.children.filter(mesh => mesh.instanceColor).length, STYLES, 'the instanced-colour program exists before the first car shows');
});

test('the fleet takes the softened car reflections like every other car', () => {
  const fleet = fleetOf(STYLES), envMap = new THREE.Texture();
  applyCarReflections(fleet.group, envMap);
  const lit = fleet.group.children.filter(mesh => mesh.material.isMeshStandardMaterial);
  assert.equal(lit.length, STYLES * 5);
  for (const mesh of lit) assert.deepEqual([mesh.material.envMap, mesh.material.envMapIntensity], [envMap, CAR_REFLECTION.intensity]);
});
