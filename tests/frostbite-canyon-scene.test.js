import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FROSTBITE_CANYON_GRAPH } from '../src/courses/frostbite-canyon.ts';

const moduleUrl = new URL('../src/upcoming-scenes/frostbite-canyon.ts', import.meta.url);
async function makeEnvironment() {
  const { createUpcomingEnvironment } = await import(moduleUrl.href);
  const scene = new THREE.Scene();
  return { scene, ...createUpcomingEnvironment(scene) };
}
const down = (group, x, z, from = 30) => {
  group.updateMatrixWorld(true);
  return new THREE.Raycaster(new THREE.Vector3(x, from, z), new THREE.Vector3(0, -1, 0)).intersectObject(group, true)
    .filter(hit => hit.object.visible && !hit.object.isPoints && !hit.object.isLine);
};

test('P01 hero: car-level CourseGraph road, glacier walls, ice arch, cyan crystals and aurora are real meshes', async () => {
  const { scene, group, dispose } = await makeEnvironment();
  assert.equal(group.parent, scene);
  assert.equal(group.name, 'frostbite-canyon');
  for (const name of ['ground-road', 'ice-bridge', 'bridge-rails', 'lower-canyon-road', 'glacier-terrain', 'ice-arch',
    'cyan-crystals', 'crystal-sentinels', 'aurora', 'snowfall', 'flight-arc', 'landing-merge', 'distant-peaks'])
    assert.ok(group.getObjectByName(name), 'missing 3D landmark: ' + name);
  const road = group.getObjectByName('ground-road');
  assert.ok(road.isMesh && road.userData.edgeIds.includes('riverbed-hairpin'), 'road comes from the authored CourseGraph');
  const under = down(group, 0, 0)[0];
  assert.equal(under?.object, road, 'shared car rests on the real road at the origin');
  assert.ok(Math.abs(under.point.y) < 0.12, `road surface at car height, got ${under.point.y}`);
  assert.equal(down(group, 0, -40)[0]?.object, road, 'road continues ahead of the car');
  const crystals = group.getObjectByName('cyan-crystals');
  assert.ok(crystals.isInstancedMesh && crystals.count >= 24 && crystals.material.transparent, 'translucent crystal field');
  const archGroup = group.getObjectByName('ice-arch'), arch = new THREE.Box3().setFromObject(archGroup);
  assert.ok(arch.max.y - arch.min.y > 40, 'monumental arch');
  const { routeLength, sampleRoute } = await import('../src/course-route-frame.ts');
  const world = group.getObjectByName('frostbite-world'), feet = [], v = new THREE.Vector3();
  const centre = arch.getCenter(new THREE.Vector3()).applyMatrix4(world.matrixWorld.clone().invert());
  let nearest = null;
  for (let s = 0; s < routeLength(FROSTBITE_CANYON_GRAPH, 'riverbed-hairpin'); s += 4) {
    const f = sampleRoute(FROSTBITE_CANYON_GRAPH, 'riverbed-hairpin', s), d = Math.hypot(f.point[0] - centre.x, f.point[2] - centre.z);
    if (!nearest || d < nearest.d) nearest = { d, f };
  }
  const lateral = (centre.x - nearest.f.point[0]) * nearest.f.right[0] + (centre.z - nearest.f.point[2]) * nearest.f.right[2];
  assert.ok(lateral > 15, `arch stands on the right of the road (outside of the bend), lateral ${lateral.toFixed(0)} m`);
  archGroup.traverse(o => { if (!o.isMesh) return; const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v.y < 8) feet.push(v.clone()); } });
  const edge = FROSTBITE_CANYON_GRAPH.edges.find(e => e.id === 'riverbed-hairpin');
  for (let s = 0; s < routeLength(FROSTBITE_CANYON_GRAPH, edge.id); s += 4) {
    const c = new THREE.Vector3(...sampleRoute(FROSTBITE_CANYON_GRAPH, edge.id, s).point).applyMatrix4(world.matrixWorld);
    for (const f of feet) assert.ok(Math.hypot(f.x - c.x, f.z - c.z) > edge.width / 2 + 2, 'arch legs stay off the driving line');
  }
  const terrain = new THREE.Box3().setFromObject(group.getObjectByName('glacier-terrain'));
  assert.ok(terrain.max.y > 60 && terrain.min.y < -40, 'towering walls and a deep glacial chasm');
  const aurora = group.getObjectByName('aurora');
  assert.ok(aurora.children.length >= 3 && aurora.children[0].material.isShaderMaterial, 'layered animated aurora curtains');
  assert.equal(group.getObjectByProperty('isCamera', true), undefined, 'camera is owned by shared host');
  dispose();
});

test('P02 shot flies the car on the authored rift-flight edge over the chasm, bridge below-right, landing ahead', async () => {
  const { group, setShot, dispose } = await makeEnvironment();
  setShot('p02');
  const below = down(group, 0, 0, -1);
  assert.ok(!below.length || below[0].point.y < -25, `airborne: open void beneath the car, got ${below[0]?.point.y}`);
  const bridge = new THREE.Box3().setFromObject(group.getObjectByName('ice-bridge'));
  assert.ok(bridge.max.y < -8 && bridge.max.x > 10, 'ice bridge spans below and to the right of the flight line');
  const rails = new THREE.Box3().setFromObject(group.getObjectByName('bridge-rails'));
  assert.ok(rails.max.y - bridge.max.y > .6, 'visible rails, never invisible walls');
  const landing = new THREE.Box3().setFromObject(group.getObjectByName('landing-merge'));
  assert.ok(landing.max.z < -40 && landing.max.y < 0, 'readable landing target ahead and below');
  const terrain = down(group, 0, -60, -1)[0];
  assert.ok(!terrain || terrain.point.y < -60, 'deep glacial chasm under the flight path');
  setShot('p01');
  assert.equal(down(group, 0, 0)[0]?.object, group.getObjectByName('ground-road'));
  assert.throws(() => setShot('nope'), /Unknown Frostbite shot/);
  dispose();
});

test('aurora and snow animate deterministically; Reduced Motion freezes them; low quality trims particles only', async () => {
  const { group, update, dispose } = await makeEnvironment();
  const curtain = group.getObjectByName('aurora').children[0];
  const snow = group.getObjectByName('snowfall');
  const count = group.children.length;
  update(1, 'high', false);
  const first = curtain.material.uniforms.uTime.value;
  update(4.2, 'high', false);
  assert.notEqual(curtain.material.uniforms.uTime.value, first, 'aurora moves between frames');
  const snowTime = snow.material.uniforms.uTime.value;
  update(1, 'high', false); update(4.2, 'high', false);
  assert.equal(snow.material.uniforms.uTime.value, snowTime, 'same time, same frame');
  assert.equal(group.children.length, count, 'no allocations during update');
  update(9, 'high', true);
  assert.equal(curtain.material.uniforms.uTime.value, 0, 'reduced motion stabilizes aurora');
  assert.equal(snow.visible, false, 'reduced motion removes falling snow');
  assert.equal(group.getObjectByName('aurora').visible, true, 'static aurora cue stays');
  update(2, 'low', false);
  const roadGeometry = group.getObjectByName('ground-road').geometry;
  assert.ok(snow.geometry.drawRange.count < snow.geometry.getAttribute('position').count, 'low trims particles');
  update(2, 'high', false);
  assert.equal(group.getObjectByName('ground-road').geometry, roadGeometry, 'quality never rebuilds road truth');
  dispose();
});

test('dispose releases every owned geometry and material and clears scene fog', async () => {
  const { scene, group, dispose } = await makeEnvironment();
  assert.ok(scene.fog, 'cold atmospheric haze');
  const geometries = new Set(), materials = new Set();
  group.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) for (const m of [o.material].flat()) materials.add(m);
  });
  assert.ok(geometries.size >= 12 && materials.size >= 8, 'modeled scene, not a photo plane');
  let freedG = 0, freedM = 0;
  geometries.forEach(g => g.addEventListener('dispose', () => freedG++));
  materials.forEach(m => m.addEventListener('dispose', () => freedM++));
  dispose(); dispose();
  assert.equal(group.parent, null);
  assert.equal(scene.fog, null);
  assert.equal(freedG, geometries.size);
  assert.equal(freedM, materials.size);
});

test('Frostbite stays out of the Stage 1 registries and RACE_TRACKS', async () => {
  const { UPCOMING_TRACKS } = await import('../src/upcoming-tracks.ts');
  const { UPCOMING_ENVIRONMENTS } = await import('../src/upcoming-scenes/index.ts');
  const { RACE_TRACKS } = await import('../src/race-tracks.ts');
  assert.ok(!('frostbite-canyon' in UPCOMING_TRACKS));
  assert.ok(!('frostbite-canyon' in UPCOMING_ENVIRONMENTS));
  assert.ok(!('frostbite-canyon' in RACE_TRACKS));
});

test('glacier terrain never pokes through any carved road surface (edges, cut and fill)', async () => {
  const { routeLength, sampleRoute } = await import('../src/course-route-frame.ts');
  const { group, dispose } = await makeEnvironment();
  group.updateMatrixWorld(true);
  const world = group.getObjectByName('frostbite-world'), terrain = group.getObjectByName('glacier-terrain');
  const covered = [];
  for (const [id, from] of [['riverbed-hairpin', 1300], ['rift-lower-canyon', 0], ['rift-to-observatory', 0]]) {
    for (let s = from; s < routeLength(FROSTBITE_CANYON_GRAPH, id); s += 3) {
      const f = sampleRoute(FROSTBITE_CANYON_GRAPH, id, s);
      for (const lateral of [-1, -.5, 0, .5, 1]) {
        const w = f.width / 2 * lateral;
        const road = new THREE.Vector3(f.point[0] + f.right[0] * w, f.point[1], f.point[2] + f.right[2] * w).applyMatrix4(world.matrixWorld);
        const hit = new THREE.Raycaster(road.clone().setY(road.y + 20), new THREE.Vector3(0, -1, 0)).intersectObject(terrain)[0];
        if (hit && hit.point.y > road.y - .02) covered.push(`${id}@${s}:${lateral}`);
      }
    }
  }
  assert.deepEqual(covered.slice(0, 5), [], `${covered.length} road samples buried`);
  dispose();
});
