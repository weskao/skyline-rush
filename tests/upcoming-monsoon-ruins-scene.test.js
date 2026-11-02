import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import * as THREE from 'three';

const file = new URL('../src/upcoming-scenes/monsoon-ruins.ts', import.meta.url);
const make = async () => {
  const { createUpcomingEnvironment } = await import(file.href);
  const scene = new THREE.Scene();
  return { scene, ...createUpcomingEnvironment(scene) };
};
const collect = (group, predicate) => {
  const found = [];
  group.traverse(object => { if (predicate(object)) found.push(object); });
  return found;
};
const near = (a, b, epsilon = 0.0001) => Math.abs(a - b) <= epsilon;

test('Monsoon Ruins has its own real Three.js module, without modifying shared home UI', () => {
  assert.ok(existsSync(file), 'missing live Monsoon Ruins 3D environment module');
});

test('a scene-owned group provides actual curved road, sculpted terrain, fork and landing', async () => {
  const { scene, group, dispose } = await make();
  assert.ok(group instanceof THREE.Group);
  assert.equal(group.parent, scene);
  const main = group.getObjectByName('monsoon-ground-road');
  const aerial = group.getObjectByName('monsoon-elevated-shortcut');
  const terrain = group.getObjectByName('monsoon-sculpted-terrain');
  assert.ok(main?.isMesh && aerial?.isMesh && terrain?.isMesh);
  assert.ok(main.geometry.attributes.position.count > 100, 'ground road must be a curved ribbon');
  assert.ok(terrain.geometry.attributes.position.count > 2000, 'terrain must have spatial elevation');
  assert.ok(group.getObjectByName('monsoon-overcast-sky')?.isMesh, 'overcast sky surrounds the 3D canyon');
  const points = main.geometry.attributes.position.array;
  assert.ok([...points].every(Number.isFinite), 'all road vertices must be finite');
  const roadXs = Array.from({ length: Math.floor(points.length / 6) }, (_, i) => points[i * 6]);
  assert.ok(Math.max(...roadXs) - Math.min(...roadXs) > 10, 'ground path must be a substantial S bend');
  const elevated = aerial.geometry.attributes.position.array;
  const height = [];
  for (let i = 1; i < elevated.length; i += 3) height.push(elevated[i]);
  assert.ok(Math.max(...height) > 8, 'air shortcut must visibly rise above ground');
  assert.ok(Math.min(...height) < 1, 'air shortcut must reconnect to safe near-ground landing');
  assert.ok(group.getObjectByName('monsoon-landing-zone'), 'safe landing must be visible');
  const mud = main.material;
  assert.ok(mud.roughness < 0.65, 'wet mud needs highlights instead of a flat painted plane');
  dispose();
  assert.equal(group.parent, null);
});

test('guardian temple, stone viaduct, waterfalls and jungle occupy distinct spatial depths', async () => {
  const { group, dispose } = await make();
  const landmarks = ['monsoon-guardian-temple', 'monsoon-stone-viaduct', 'monsoon-waterfalls', 'monsoon-rainforest'];
  for (const name of landmarks) {
    const anchor = group.getObjectByName(name);
    assert.ok(anchor?.children.length > 2, name + ' has no modelled geometry');
    assert.ok(collect(anchor, o => o.isMesh || o.isInstancedMesh).length > 2, name + ' is a flat impostor');
  }
  const anchors = landmarks.slice(0, 3).map(name => group.getObjectByName(name).position.toArray());
  assert.ok(new Set(anchors.map(p => p.join(','))).size === 3);
  assert.ok(anchors.some(p => p[2] < -90), 'landmarks need real mid/far depth');
  assert.ok(collect(group, object => object.isInstancedMesh).length >= 2, 'jungle uses batched 3D vegetation');
  dispose();
});

test('rain, waterfall flow, plants and mist animate from absolute time, with reduced-motion freeze', async () => {
  const { group, update, dispose } = await make();
  const rain = group.getObjectByName('monsoon-rain');
  const flow = group.getObjectByName('monsoon-waterfall-flow');
  const leaves = group.getObjectByName('monsoon-swaying-plants');
  const mist = group.getObjectByName('monsoon-moving-mist');
  assert.ok(rain?.isLineSegments);
  assert.ok(flow?.children.length > 1);
  assert.ok(leaves?.children.length > 2);
  assert.ok(mist?.children.length > 0);
  update(0, 'high', false);
  const before = [rain.geometry.attributes.position.array[1], flow.children[0].position.y,
    leaves.children[0].rotation.z, mist.children[0].position.x];
  update(4.25, 'high', false);
  const after = [rain.geometry.attributes.position.array[1], flow.children[0].position.y,
    leaves.children[0].rotation.z, mist.children[0].position.x];
  assert.ok(after.every((n, i) => !near(n, before[i])), 'all four ambient layers should move over time');
  update(13, 'high', true);
  const freeze = [flow.children[0].position.y, leaves.children[0].rotation.z, mist.children[0].position.x];
  assert.equal(rain.visible, false, 'reduced motion turns animated rain off');
  update(99, 'high', true);
  assert.deepEqual([flow.children[0].position.y, leaves.children[0].rotation.z, mist.children[0].position.x], freeze);
  dispose();
});

test('low quality reduces decoration and rain; switching high restores it deterministically', async () => {
  const { group, update, dispose } = await make();
  const detail = group.getObjectByName('monsoon-detailed-foliage');
  const rain = group.getObjectByName('monsoon-rain');
  update(1.5, 'high', false);
  const highCount = rain.geometry.drawRange.count;
  assert.equal(detail.visible, true);
  update(1.5, 'low', false);
  assert.equal(detail.visible, false);
  assert.ok(rain.geometry.drawRange.count < highCount, 'lower particle budget on low');
  update(1.5, 'high', false);
  assert.equal(detail.visible, true);
  assert.equal(rain.geometry.drawRange.count, highCount);
  dispose();
});

test('dispose removes the group and releases owned geometry and materials exactly once', async () => {
  const { group, scene, update, dispose } = await make();
  const geometry = new Set(), material = new Set();
  group.traverse(o => {
    if (o.geometry) geometry.add(o.geometry);
    if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) material.add(m);
  });
  assert.ok(geometry.size > 8 && material.size > 5);
  const instances = collect(group, object => object instanceof THREE.InstancedMesh);
  let releasedInstances = 0;
  instances.forEach(instance => instance.addEventListener('dispose', () => releasedInstances++));
  let released = 0;
  for (const resource of [...geometry, ...material]) resource.addEventListener('dispose', () => released++);
  update(2, 'medium', false);
  dispose();
  dispose();
  assert.ok(!scene.children.includes(group));
  assert.equal(released, geometry.size + material.size, 'no leaks or duplicate GPU disposal');
  assert.equal(releasedInstances, instances.length, 'instanced GPU buffers must be released');
});
