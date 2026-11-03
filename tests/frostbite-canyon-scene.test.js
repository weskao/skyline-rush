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
  const arch = new THREE.Box3().setFromObject(group.getObjectByName('ice-arch'));
  assert.ok(arch.max.y > 25 && arch.min.x > 6, 'monumental arch stands right of the road, off the driving line');
  const terrain = new THREE.Box3().setFromObject(group.getObjectByName('glacier-terrain'));
  assert.ok(terrain.max.y > 60 && terrain.min.y < -40, 'towering walls and a deep glacial chasm');
  const aurora = group.getObjectByName('aurora');
  assert.ok(aurora.children.length >= 3 && aurora.children[0].material.isShaderMaterial, 'layered animated aurora curtains');
  assert.equal(group.getObjectByProperty('isCamera', true), undefined, 'camera is owned by shared host');
  dispose();
});

test('P02 shot puts the car on the ice-bridge deck above the chasm, with rails and the lower road beneath', async () => {
  const { group, setShot, dispose } = await makeEnvironment();
  setShot('p02');
  const bridge = group.getObjectByName('ice-bridge');
  assert.equal(down(group, 0, 0)[0]?.object, bridge, 'car rests on the bridge deck');
  const width = FROSTBITE_CANYON_GRAPH.edges.find(e => e.id === 'rift-ice-bridge').width;
  const beside = down(group, width / 2 + 12, 0, 10);
  assert.ok(beside.length && beside[0].point.y < -20, 'deep void beside the deck');
  const rails = new THREE.Box3().setFromObject(group.getObjectByName('bridge-rails'));
  assert.ok(rails.max.y > 0.6, 'visible rails, never invisible walls');
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
