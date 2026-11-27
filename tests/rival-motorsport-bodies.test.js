import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Layers, Raycaster, Scene, Texture, Vector3 } from 'three';
import { createCup } from '../src/championship-cup.ts';
import { retryCupHeat, loadCupProgress, saveCupProgress } from '../src/cup-progress.ts';
import { RACE_DRIVER_IDS } from '../src/race-grid.ts';
import { vehicleContactSize } from '../src/vehicle-contact-size.js';

const ids = RACE_DRIVER_IDS.slice(1);
const field = () => ids.map(id => ({ id, name: id }));
const race = seed => ({ phase: 'racing', rivals: field(), rivalVisualSeed: seed });
const loadFleet = () => import('../src/rival-fleet.js').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND' || !error.url?.endsWith('/src/rival-fleet.js')) throw error;
  assert.fail('the race still uses fixed, unshuffled rival models');
});

const camera = new Layers();
// What a camera submits: wheel pose meshes leave layer 0, their InstancedMesh draws each instance.
function drawn(car) {
  let triangles = 0, draws = 0;
  car.traverseVisible(part => {
    if (!part.isMesh || !part.layers.test(camera)) return;
    triangles += (part.geometry.index?.count ?? part.geometry.attributes.position.count) / 3 * (part.isInstancedMesh ? part.count : 1);
    draws++;
  });
  return { triangles, draws };
}

test('seven new race bodies have curved shells, visibly different tail lamps and a bounded low tier', async () => {
  const { createRivalFleet } = await loadFleet();
  const fleet = createRivalFleet(new Scene(), new Texture());
  const event = race(31);
  fleet.sync(event, 'high');
  assert.ok(fleet.cars.every(car => car.userData.body.geometry.attributes.position.count > 400),
    'opponents need curved body panels with wheel relief');
  const high = fleet.cars.map(drawn);
  const signatures = fleet.cars.map(car => {
    const lamp = car.getObjectByName('Rival rear light signature');
    assert.ok(lamp?.isMesh);
    assert.ok(lamp.material === car.userData.brakeLight, 'existing brake/boost cue owns the new tail lamps');
    assert.ok(car.getObjectByName('Rival livery graphics')?.isMesh);
    return Array.from(lamp.geometry.attributes.position.array, n => n.toFixed(2)).join(',');
  });
  assert.equal(new Set(signatures).size, 7);
  for (const car of fleet.cars) {
    assert.ok(car.userData.body.material.isMeshPhysicalMaterial, 'race paint needs a bounded clearcoat');
    assert.equal(car.userData.jets.children.length, 4, 'retain the four lift outlets');
    assert.ok(car.userData.driveCue.flame && car.userData.driveCue.trail);
  }
  assert.ok(high.every(({ draws, triangles }) => draws <= 24 && triangles <= 4500));
  fleet.sync(event, 'medium');
  assert.ok(fleet.cars.every(car => drawn(car).triangles < 2600), 'Medium uses its own geometry budget');
  fleet.sync(event, 'low');
  for (const [i, car] of fleet.cars.entries()) {
    assert.ok(drawn(car).triangles < 1800);
    assert.ok(drawn(car).triangles <= high[i].triangles * 0.65);
    assert.ok(car.getObjectByName('Rival rear light signature').visible && car.getObjectByName('Rival livery graphics').visible);
  }
});

test('livery stripes sit above the actual painted deck on every quality tier', async () => {
  const { createRivalFleet } = await loadFleet();
  const fleet = createRivalFleet(new Scene(), new Texture());
  const event = race(31);
  const ray = new Raycaster(new Vector3(),new Vector3(0,-1,0));
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  for (const quality of ['high','medium','low']) {
    fleet.sync(event, quality);
    for (const car of fleet.cars) {
      car.updateMatrixWorld(true);
      const graphics = car.getObjectByName('Rival livery graphics');
      const { index, attributes } = graphics.geometry;
      let tested = 0;
      for (let j = 0; j < index.count; j+=3) {
        a.fromBufferAttribute(attributes.normal,index.getX(j));
        if (a.y < .80) continue; // the side panels face away from the top-down ray
        a.fromBufferAttribute(attributes.position,index.getX(j));
        b.fromBufferAttribute(attributes.position,index.getX(j+1));
        c.fromBufferAttribute(attributes.position,index.getX(j+2));
        a.add(b).add(c).multiplyScalar(1/3).applyMatrix4(graphics.matrixWorld);
        ray.ray.origin.set(a.x,3,a.z);
        const painted = ray.intersectObject(car.userData.body)[0];
        assert.ok(painted && a.y >= painted.point.y, `${car.name} under-surface stripe at ${quality} / ${a.z.toFixed(2)}m`);
        tested++;
      }
      assert.ok(tested > 8);
    }
  }
});

test('normal starts choose different chassis and colour families and in-place knockout keeps driver identity', async () => {
  const { createRivalFleet, rivalLineup } = await loadFleet();
  const first = rivalLineup(31);
  assert.deepEqual(rivalLineup(31), first);
  assert.notDeepEqual(rivalLineup(215), first);
  assert.equal(new Set(Object.values(first).map(entry => entry.chassis)).size, 7);
  assert.equal(new Set(Object.values(first).map(entry => entry.livery.family)).size, 7);
  const fleet = createRivalFleet(new Scene(), new Texture());
  const event = race(31);
  for (const seed of [0, 1, 31, 215, 0xffffffff]) {
    event.rivalVisualSeed = seed;
    fleet.sync(event, 'high');
    for (const [index, driver] of event.rivals.entries()) {
      const car = fleet.cars[index];
      const bounds = new Box3().setFromObject(car.userData.body, true);
      const { front, rear, halfWidth } = vehicleContactSize(event, driver);
      assert.ok(bounds.min.z + car.userData.rivalFitOffset >= -front - 0.001);
      assert.ok(bounds.max.z + car.userData.rivalFitOffset <= rear + 0.001);
      assert.ok(Math.max(-bounds.min.x, bounds.max.x) <= halfWidth + 0.001);
    }
  }
  assert.deepEqual(fleet.cars.map(car => car.userData.rivalDriverId), event.rivals.map(driver=>driver.id));
  const models = fleet.cars.map(car => car.id);
  event.rivals.splice(2, 1);
  fleet.sync(event, 'high');
  assert.deepEqual(fleet.cars.slice(0, event.rivals.length).map(car => car.id), models.filter((_, i) => i !== 2));
});

test('Cup appearance seed survives storage and first-heat retry while fitting old saves', async () => {
  const cup = createCup(['coast', 'neon', 'canyon'], 'coast');
  assert.ok(Number.isInteger(cup.rivalVisualSeed), 'a new Cup must save its visual identity');
  const cupApi = await import('../src/championship-cup.ts');
  const { rivalLineup } = await loadFleet();
  const result = { trackId: 'coast', phase: 'finished', elapsed: 53, length: 1, result: { time: 53 },
    rivals: field().map((driver, i) => ({ ...driver, finishTime: 47 + i, distance: 1, speed: 1 })) };
  const current = cupApi.addCupResult(cup, result);
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  saveCupProgress(current, storage);
  const restored = loadCupProgress(cup.tracks, storage);
  assert.equal(restored.rivalVisualSeed, cup.rivalVisualSeed);
  assert.equal(retryCupHeat(restored, 'coast').rivalVisualSeed, cup.rivalVisualSeed);
  assert.deepEqual(rivalLineup(cupApi.cupRivalVisualSeed(restored)), rivalLineup(cup.rivalVisualSeed));
  const old = { tracks: cup.tracks, results: [] };
  assert.equal(cupApi.cupRivalVisualSeed(old), cupApi.cupRivalVisualSeed(structuredClone(old)));
  assert.equal(cupApi.cupRivalVisualSeed({ ...old, rivalVisualSeed: 0 }), 0);
});
