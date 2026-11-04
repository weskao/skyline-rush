import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import * as THREE from 'three';

const moduleUrl = new URL('../src/upcoming-scenes/volcanic-crown.ts', import.meta.url);

async function makeEnvironment() {
  const { createUpcomingEnvironment } = await import(moduleUrl.href);
  const scene = new THREE.Scene();
  return { scene, ...createUpcomingEnvironment(scene) };
}

test('Volcanic Crown supplies an actual Three.js environment module', () => {
  assert.ok(existsSync(moduleUrl), 'missing native 3D environment; a JPEG is not sufficient');
});

test('scene contains a car-level road, recognizable hairpin, volcano and layered landmarks', async () => {
  const { scene, group, dispose } = await makeEnvironment();
  assert.equal(group.parent, scene);
  assert.equal(group.name, 'volcanic-crown');
  const road = group.getObjectByName('ground-road');
  const hairpin = group.getObjectByName('hairpin-curve');
  const crater = group.getObjectByName('volcano-crater');
  const plume = group.getObjectByName('eruption-plume');
  const shelf = group.getObjectByName('basalt-road-shelf');
  const arch = group.getObjectByName('basalt-arch');
  const chasm = group.getObjectByName('lava-chasm');
  const distantRiver = group.getObjectByName('lava-river');
  const flight = group.getObjectByName('flight-arc');
  const landing = group.getObjectByName('landing-pad');
  for (const [name, object] of Object.entries({ road, hairpin, crater, plume, shelf, arch, chasm, distantRiver, flight, landing })) {
    assert.ok(object, 'missing 3D landmark: ' + name);
  }
  assert.ok(road.isMesh && road.geometry.isBufferGeometry, 'road must have actual geometry');
  const airBox = new THREE.Box3().setFromObject(flight);
  assert.ok(airBox.max.y > 12 && airBox.min.y < 3, 'branch rises above the lava to a safe landing');
  const bbox = new THREE.Box3().setFromObject(road);
  assert.ok(bbox.min.z <= -175 && bbox.max.z >= 40, 'road should cover the preview depth');
  assert.ok(bbox.min.x < -25 && bbox.max.x > 15, 'road should bend into a visible U turn');
  const vertices = road.geometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    assert.ok(Number.isFinite(vertices.getX(i)) && Number.isFinite(vertices.getY(i)) && Number.isFinite(vertices.getZ(i)));
  }
  // Ribbon vertices sit on the road edges (x = ±half-width), so test the surface under the origin, not its vertices.
  road.updateMatrixWorld(true);
  const underCar = new THREE.Raycaster(new THREE.Vector3(0, 5, 0), new THREE.Vector3(0, -1, 0)).intersectObject(road);
  assert.ok(underCar.length && Math.abs(underCar[0].point.y) < 0.6, 'road must support a shared car near the origin');
  const landmarks = new THREE.Box3().setFromObject(group);
  assert.ok(landmarks.max.y >= 35 && landmarks.min.y <= -2 && landmarks.max.x >= 75,
    'crater/cliffs and lava ravine must have real world depth');
  assert.equal(group.getObjectByProperty('isCamera', true), undefined, 'camera is owned by shared host');
  dispose();
});

test('lava flow and lighting actually animate, deterministically, without rebuilding meshes', async () => {
  const { group, update, dispose } = await makeEnvironment();
  const lava = group.getObjectByName('lava-chasm');
  const light = group.getObjectByName('lava-light');
  assert.ok(lava.material.isShaderMaterial && lava.material.uniforms.uTime, 'lava needs flowing shader');
  assert.ok(light.isPointLight, 'lava needs real pulsing illumination');
  const originalCount = group.children.length;
  update(0, 'high', false);
  const initialLight = light.intensity;
  update(3.1, 'high', false);
  const movingTime = lava.material.uniforms.uTime.value;
  const movingLight = light.intensity;
  assert.notEqual(movingTime, 0);
  assert.notEqual(movingLight, initialLight);
  const eruption = group.getObjectByName('eruption-plume');
  const eruptionHeight = eruption.scale.y;
  update(7.3, 'high', false);
  assert.notEqual(eruption.scale.y, eruptionHeight, 'volcanic vent must animate without extra lights');
  update(3.1, 'high', false);
  assert.equal(lava.material.uniforms.uTime.value, movingTime);
  assert.equal(light.intensity, movingLight);
  assert.equal(group.children.length, originalCount, 'no mesh allocations during updates');
  update(6.3, 'medium', true);
  assert.equal(lava.material.uniforms.uTime.value, 0, 'reduced motion freezes flow');
  update(16.3, 'medium', true);
  assert.equal(lava.material.uniforms.uTime.value, 0);
  assert.equal(light.intensity, movingLight === 0 ? 0 : light.userData.baseIntensity,
    'reduced motion should keep a steady nonflashing light');
  dispose();
});

test('quality limits ash/sparks and heat, while keeping road and landing readable', async () => {
  const { group, update, dispose } = await makeEnvironment();
  const sparks = group.getObjectByName('lava-sparks');
  const smoke = group.getObjectByName('volcanic-ash');
  const haze = group.getObjectByName('heat-haze');
  const road = group.getObjectByName('ground-road');
  const landing = group.getObjectByName('landing-pad');
  assert.ok(sparks && smoke && haze);
  update(4, 'high', false);
  assert.equal(sparks.visible, true);
  assert.equal(smoke.visible, true);
  assert.equal(haze.visible, true);
  update(4, 'low', false);
  assert.equal(sparks.visible, false);
  assert.equal(smoke.visible, false);
  assert.equal(haze.visible, false);
  assert.equal(road.visible, true);
  assert.equal(landing.visible, true);
  update(4, 'high', true);
  assert.equal(sparks.visible, false, 'no airborne sparks with reduced motion');
  assert.equal(smoke.visible, false, 'no drifting ash with reduced motion');
  dispose();
});

test('dispose detaches all scenery and releases owned geometry/material GPU resources', async () => {
  const { scene, group, dispose } = await makeEnvironment();
  const geometries = new Set();
  const materials = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) materials.add(material);
    }
  });
  assert.ok(geometries.size >= 10, 'actual modeled terrain/landmarks, not a single plane');
  assert.ok(materials.size >= 7);
  let freedGeometry = 0, freedMaterials = 0;
  for (const geometry of geometries) geometry.addEventListener('dispose', () => freedGeometry++);
  for (const material of materials) material.addEventListener('dispose', () => freedMaterials++);
  dispose();
  assert.equal(group.parent, null);
  assert.equal(scene.children.includes(group), false);
  assert.equal(freedGeometry, geometries.size);
  assert.equal(freedMaterials, materials.size);
  dispose(); // idempotent
  assert.equal(freedGeometry, geometries.size);
  assert.equal(freedMaterials, materials.size);
});
