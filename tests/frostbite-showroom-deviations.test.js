import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUpcomingShowcase } from '../src/upcoming-showcase.ts';
import { createUpcomingEnvironment } from '../src/upcoming-scenes/frostbite-canyon.ts';
import { createFrostbiteRaceScene, ROAD_HALF } from '../src/frostbite-race-scene.ts';
import { FROSTBITE_SPAN, frostbiteFrame } from '../src/courses/frostbite-race.ts';
import { PORTRAIT_CAR_TOP } from './showcase-car-zone.js';

// Open visual deviations from the Frostbite review: phone portrait car, P02 portrait + AIRFLOW, arch ice crust, chasm mist.
const PHONE = 390 / 844;
function stage(shot, airflow) {
  const host = createUpcomingShowcase({ 'frostbite-canyon': scene => { const e = createUpcomingEnvironment(scene); e.setShot(shot); return e; } }, new THREE.Texture());
  host.setTrack('frostbite-canyon');
  const camera = new THREE.PerspectiveCamera(50, PHONE, .1, 4000);
  host.update(camera, 2, { quality: 'high', view: 'drive', enabled: true, airflow }, true);
  const player = host.scene.children.find(c => c.userData.body);
  return { host, camera, player, environment: host.scene.children.find(c => c.name === 'frostbite-canyon') };
}
/** Screen bounds (0..1, y down) of every visible mesh of the car (body, tyres, wing, jets); the airflow streak VFX is not the car. */
function screenBox(camera, object) {
  object.updateMatrixWorld(true);
  const out = { minX: 1, maxX: 0, minY: 1, maxY: 0 }, box = new THREE.Box3(), p = new THREE.Vector3();
  object.traverseVisible(mesh => {
    if (!mesh.isMesh) return;
    for (let o = mesh; o; o = o.parent) if (o.name === 'Airflow showcase') return;
    mesh.geometry.computeBoundingBox();
    box.copy(mesh.geometry.boundingBox);
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      p.set(x, y, z).applyMatrix4(mesh.matrixWorld).project(camera);
      const sx = (p.x + 1) / 2, sy = (1 - p.y) / 2;
      out.minX = Math.min(out.minX, sx); out.maxX = Math.max(out.maxX, sx); out.minY = Math.min(out.minY, sy); out.maxY = Math.max(out.maxY, sy);
    }
  });
  return out;
}

for (const shot of ['p01', 'p02']) for (const airflow of [false, true]) {
  test(`phone portrait ${shot} (AIRFLOW ${airflow ? 'on' : 'off'}) frames the whole car clear of the home UI`, () => {
    const { host, camera, player } = stage(shot, airflow);
    const b = screenBox(camera, player);
    // AIRFLOW off: the home panel (mode chips, cards, Start) starts ~44% down, so the car sits wholly above it.
    // AIRFLOW on: the panel hides and the shared rule keeps the car below the telemetry card line.
    const [top, bottom] = airflow ? [PORTRAIT_CAR_TOP, .96] : [.1, .44];
    assert.ok(b.minX > .04 && b.maxX < .96 && b.minY > top && b.maxY < bottom, `${shot} car box ${JSON.stringify(b)}`);
    assert.ok(b.maxX - b.minX > .18, `${shot} car readable, width ${(b.maxX - b.minX).toFixed(2)}`);
    host.dispose();
  });
}

test('P02 with AIRFLOW on rests the car on the real ice-bridge deck; AIRFLOW off keeps it airborne on the flight edge', () => {
  for (const airflow of [true, false]) {
    const { host, environment } = stage('p02', airflow);
    environment.updateMatrixWorld(true);
    // Airborne: cast from under the car's flight-guide ribbon, as the P02 scene test does.
    const hit = new THREE.Raycaster(new THREE.Vector3(0, airflow ? 3 : -1, 0), new THREE.Vector3(0, -1, 0)).intersectObject(environment, true)
      .filter(h => h.object.visible && h.object.isMesh)[0];
    if (airflow) assert.ok(hit?.object.name === 'ice-bridge' && Math.abs(hit.point.y) < .12, `deck under the grounded car: ${hit?.object.name} ${hit?.point.y}`);
    else assert.ok(!hit || hit.point.y < -25, `airborne over the void: ${hit?.object.name} ${hit?.point.y}`);
    host.dispose();
  }
});

test('the ice arch wears a pale ice crust over its face, as the reference shows it from the road', () => {
  const scene = new THREE.Scene(), env = createUpcomingEnvironment(scene);
  const arch = env.group.getObjectByName('ice-arch'), rock = arch.children[0];
  env.group.updateMatrixWorld(true);
  rock.geometry.computeBoundingBox();
  const radius = (rock.geometry.boundingBox.max.x - rock.geometry.boundingBox.min.x) / 2 - 8.5; // ring centreline
  let pale = 0, total = 0;
  for (let deg = 25; deg <= 155; deg += 10) for (const face of [1, -1]) {
    const a = deg * Math.PI / 180, local = new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, face * 40);
    const from = local.clone().applyMatrix4(arch.matrixWorld), to = new THREE.Vector3(local.x, local.y, 0).applyMatrix4(arch.matrixWorld);
    const hit = new THREE.Raycaster(from, to.sub(from).normalize()).intersectObject(arch, true)[0];
    if (!hit) continue;
    total++;
    if (hit.object.material.color.getHSL({}).l > .6) pale++;
  }
  assert.ok(total >= 20 && pale / total >= .75, `pale crust on the face ${pale}/${total}`);
  env.dispose();
});

test('P02 chasm mist hangs in the void between the bridge and the canyon floor, still under Reduced Motion', () => {
  const scene = new THREE.Scene(), env = createUpcomingEnvironment(scene);
  env.setShot('p02');
  const mist = env.group.getObjectByName('chasm-mist');
  assert.ok(mist, 'chasm-mist');
  env.group.updateMatrixWorld(true);
  const bridge = new THREE.Box3().setFromObject(env.group.getObjectByName('ice-bridge')), box = new THREE.Box3().setFromObject(mist);
  assert.ok(box.max.y < bridge.min.y - 4 && box.max.y - box.min.y < 60, `mist below the deck: ${box.min.y.toFixed(0)}..${box.max.y.toFixed(0)} vs deck ${bridge.min.y.toFixed(0)}`);
  mist.traverse(o => { if (o.isMesh) assert.ok(o.material.transparent && !o.material.depthWrite, 'soft sheet'); });
  const at = () => mist.children.map(o => o.position.toArray().join()).join(';');
  env.update(1, 'high', true); const still = at(); env.update(9, 'high', true);
  assert.equal(at(), still, 'Reduced Motion holds the mist');
  env.update(1, 'high', false); const a = at(); env.update(9, 'high', false);
  assert.notEqual(at(), a, 'mist drifts');
  env.dispose();
});

test('race scene: Rift chasm mist sits beside the lower road, never over the driving line', () => {
  const race = createFrostbiteRaceScene(new THREE.Scene());
  const mist = race.group.getObjectByName('chasm-mist');
  assert.ok(mist?.children.length >= 4, 'race chasm mist');
  race.group.updateMatrixWorld(true);
  const sheets = mist.children.map(o => new THREE.Box3().setFromObject(o));
  for (let d = FROSTBITE_SPAN.from - 60; d <= FROSTBITE_SPAN.to + 60; d += 4) for (let lateral = -ROAD_HALF; lateral <= ROAD_HALF; lateral += 2) {
    const f = frostbiteFrame(d), p = new THREE.Vector3(f.point.x + f.right[0] * lateral, f.point.y + 1, f.point.z + f.right[2] * lateral);
    assert.ok(!new THREE.Raycaster(p, new THREE.Vector3(0, 1, 0), 0, 6).intersectObject(mist, true).length, `mist over the road @${d}/${lateral}`);
  }
  assert.ok(sheets.every(b => b.max.y < frostbiteFrame(FROSTBITE_SPAN.from).point.y + 30), 'mist stays in the chasm');
  race.dispose();
});
