import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUpcomingEnvironment } from '../src/upcoming-scenes/dune-tempest.ts';

const build = () => {
  const scene = new THREE.Scene();
  const env = createUpcomingEnvironment(scene);
  return { scene, env };
};
const find = (group, name) => group.getObjectByName(name);
const positions = (object) => [...object.geometry.getAttribute('position').array];

test('dune tempest is native 3D environment with anchored sand road and landmark depth', () => {
  const { scene, env } = build();
  assert.ok(env.group.isGroup && scene.children.includes(env.group));
  assert.equal(env.group.name, 'Dune Tempest environment');
  for (const name of ['Ground sand road', 'Ground road shoulder', 'Canyon terrain',
    'Hairpin west', 'Hairpin east', 'Monumental stone ring', 'Distant stone ring',
    'Ancient cliff ruins', 'Canyon escarpment', 'Sunset sun']) {
    assert.ok(find(env.group, name), name);
  }
  const road = find(env.group, 'Ground sand road');
  assert.ok(road.isMesh && road.geometry.isBufferGeometry);
  assert.ok(road.geometry.getAttribute('position').count >= 240, 'road must be a curved mesh');
  assert.ok(positions(road).every(Number.isFinite), 'road coordinates must be finite');
  const verts = positions(road);
  assert.ok(verts.some((v, i) => i % 3 === 2 && v > 45));
  assert.ok(verts.some((v, i) => i % 3 === 2 && v < -180));
  assert.ok(verts.some((v, i) => i % 3 === 0 && v < -60), 'western U bend');
  assert.ok(verts.some((v, i) => i % 3 === 0 && v > 20), 'eastern U bend');
  assert.ok(verts.some((v, i) => i % 3 === 1 && Math.abs(v) <= 0.2), 'road supports car at y≈0');
  const terrainCoords = positions(find(env.group, 'Canyon terrain'));
  assert.ok(terrainCoords.every(Number.isFinite));
  const roadbed = [];
  for (let i = 0; i < terrainCoords.length; i += 3) {
    if (Math.hypot(terrainCoords[i] - 31, terrainCoords[i + 2] + 132) < 6.5) {
      roadbed.push(terrainCoords[i + 1]);
    }
  }
  assert.ok(roadbed.length > 0 && roadbed.every(y => y > -5),
    'the lower driving road cannot float over the canyon cut');
  assert.ok(scene.fog?.isFogExp2, 'distant sand haze belongs to the scene');
  assert.ok(!env.group.children.some(c => c.isCamera), 'no owned camera');
  env.dispose();
});

test('a spatially separate aerial shortcut includes a rise, canyon crossing and clear landing', () => {
  const { env } = build();
  for (const name of ['Flight takeoff', 'Air corridor', 'Flight landing',
    'Viaduct arches', 'Landing beacon']) {
    assert.ok(find(env.group, name), name);
  }
  const ground = find(env.group, 'Ground sand road');
  const air = find(env.group, 'Air corridor');
  const launch = find(env.group, 'Flight takeoff');
  const landing = find(env.group, 'Flight landing');
  assert.ok(air.geometry.getAttribute('position').count > 20);
  const top = a => a.filter((_, i) => i % 3 === 1);
  assert.ok(Math.max(...top(positions(air))) >= 16, 'crossing has real height');
  assert.ok(Math.max(...top(positions(launch))) >= 9, 'takeoff climbs');
  assert.ok(Math.min(...top(positions(landing))) < 3, 'landing rejoins lower road');
  assert.notEqual(air.geometry, ground.geometry, 'separate geometry and height');
  env.dispose();
});

test('sand moves as a deterministic function of time and obeys quality / reduced motion', () => {
  const { env } = build();
  const sand = find(env.group, 'Windblown sand particles');
  const ribbons = find(env.group, 'Dust ribbon 0');
  assert.ok(sand?.isPoints && ribbons?.isMesh);
  env.update(4, 'high', false);
  const frame4 = positions(sand);
  const ribbon4 = ribbons.position.x;
  const highCount = sand.geometry.drawRange.count;
  env.update(11, 'high', false);
  assert.notDeepEqual(positions(sand), frame4);
  assert.notEqual(ribbons.position.x, ribbon4);
  const frame11 = positions(sand);
  env.update(11, 'high', false);
  assert.deepEqual(positions(sand), frame11, 'identical input gives identical animation');
  env.update(17, 'low', false);
  const lowCount = sand.geometry.drawRange.count;
  assert.ok(lowCount <= 40 && highCount >= 120 && highCount > lowCount);
  assert.equal(ribbons.visible, false, 'low quality avoids alpha overdraw');
  env.update(3, 'medium', true);
  const still = positions(sand);
  const stillRibbon = ribbons.position.x;
  env.update(500, 'medium', true);
  assert.deepEqual(positions(sand), still, 'reduced motion freezes particles');
  assert.equal(ribbons.position.x, stillRibbon);
  assert.equal(ribbons.visible, false, 'reduced motion hides billowing ribbons');
  env.dispose();
});

test('dispose removes the environment, restores fog and frees unique GPU objects safely', () => {
  const { scene, env } = build();
  const meshes = [];
  env.group.traverse(o => { if (o.geometry && o.material) meshes.push(o); });
  assert.ok(meshes.length >= 12);
  const geometry = find(env.group, 'Ground sand road').geometry;
  let releases = 0;
  geometry.addEventListener('dispose', () => { releases++; });
  env.dispose();
  env.dispose();
  assert.equal(releases, 1);
  assert.ok(!scene.children.includes(env.group));
  assert.equal(scene.fog, null);
  assert.ok(meshes.every(o => !scene.children.includes(o)));
});
