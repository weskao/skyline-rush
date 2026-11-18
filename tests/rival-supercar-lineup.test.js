import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Scene, Texture } from 'three';
import * as cars from '../src/car-model.js';
import * as cups from '../src/championship-cup.ts';
import { retryCupHeat, saveCupProgress, loadCupProgress } from '../src/cup-progress.ts';
import { RACE_DRIVER_IDS } from '../src/race-grid.ts';
import { vehicleContactSize } from '../src/vehicle-contact-size.js';
import { createRace } from '../src/game.js';

const ids = RACE_DRIVER_IDS.slice(1);
const tracks = ['coast', 'neon', 'canyon'];

test('a race draws a different unique chassis and paint family per driver, independent of grid order', async () => {
  const fleetUrl = new URL('../src/rival-fleet.js', import.meta.url);
  const { rivalLineup } = await import(fleetUrl).catch(error => {
    if (error.code !== 'ERR_MODULE_NOT_FOUND' || error.url !== fleetUrl.href) throw error;
    assert.fail('race uses a fixed chassis and paint assignment; a seeded lineup is missing');
  });
  const first = rivalLineup(120);
  assert.equal(new Set(ids.map(id => first[id].chassis)).size, 7);
  assert.equal(new Set(ids.map(id => first[id].livery.family)).size, 7);
  assert.deepEqual(rivalLineup(120), first);
  assert.notDeepEqual(ids.map(id => rivalLineup(321)[id].chassis), ids.map(id => first[id].chassis));
  assert.notDeepEqual(ids.map(id => rivalLineup(321)[id].livery.paint), ids.map(id => first[id].livery.paint));
  for (const seed of [0, 1, 120, 321, 0xffffffff]) {
    assert.equal(new Set(Object.values(rivalLineup(seed)).map(entry => entry.livery.paint)).size, 7);
  }
});

test('the actual race meshes preserve contact and all four thrusters for every driver and chassis pairing', async () => {
  assert.ok(cars.RIVAL_CAR_STYLES.every(style => style.body.attributes.position.count >= 100),
    'all seven body shells need sculpted shoulders and a full loft');
  const { createRivalFleet } = await import('../src/rival-fleet.js');
  const scene = new Scene();
  const { cars: pool, sync } = createRivalFleet(scene, new Texture());
  const initial = [...pool];
  const race = createRace('coast');
  race.phase = 'countdown';
  sync(race, 'high');
  const rimCounts = initial.map(car => car.userData.wheels[0].children[1].geometry.attributes.position.count);
  assert.ok(new Set(rimCounts).size >= 4, 'the fleet needs visibly different wheel-spoke designs');
  for (let seed = 0; seed < 24; seed++) {
    race.rivalVisualSeed = seed;
    sync(race, 'high');
    assert.equal(new Set(pool).size, 7);
    assert.ok(pool.every(car => initial.includes(car)));
    for (const [i, rival] of race.rivals.entries()) {
      const car = pool[i], { front, rear, halfWidth } = vehicleContactSize(race, rival);
      const { jets, driveCue, body, rivalFitOffset, rivalDetails } = car.userData;
      assert.equal(jets.children.length, 4);
      assert.ok(driveCue.flame && driveCue.trail && rivalDetails.visible);
      const { min, max } = new Box3().setFromObject(body, true);
      assert.ok(Math.max(-min.x, max.x) <= halfWidth + 0.001);
      assert.ok(min.z + rivalFitOffset >= -front - 0.001);
      assert.ok(max.z + rivalFitOffset <= rear + 0.001);
    }
  }
  const paint = pool.map(car => car.userData.body.material.color.getHexString());
  const driverCars = [...pool];
  const reordered = { ...race, rivals: [...race.rivals].reverse() };
  sync(reordered, 'high');
  assert.deepEqual(pool, [...driverCars].reverse(), 'sorting the race field must not swap any driver’s car');
  sync(race, 'high');
  sync(race, 'low');
  assert.deepEqual(pool.map(car => car.userData.body.material.color.getHexString()), paint);
  assert.ok(pool.every(car => !car.userData.rivalDetails.visible));
  for (const car of pool) {
    let triangles = 0;
    car.traverseVisible(part => {
      if (part.isMesh) triangles += (part.geometry.index?.count ?? part.geometry.attributes.position.count) / 3;
    });
    assert.ok(triangles < 1800, `Low rival geometry must fit its budget, got ${triangles} triangles`);
  }
  const [eliminated] = race.rivals.splice(1, 1);
  sync(race, 'low');
  assert.deepEqual(pool.slice(0, race.rivals.length).map(car => car.id), driverCars.filter((_, i) => i !== 1).map(car => car.id),
    'an in-place Elimination must leave each survivor in its own car');
  race.rivals.splice(1, 0, eliminated);
  race.phase = 'ready';
  sync(race, 'low');
  assert.deepEqual(pool, initial);
});

test('a Cup keeps its visual seed through saving, reversing the grid and retrying heat one', () => {
  const cup = cups.createCup(tracks, 'coast');
  assert.ok(Number.isInteger(cup.rivalVisualSeed), 'a new Cup must generate and persist a livery seed');
  const race = createRace('coast', { mode: 'cup' });
  Object.assign(race, { phase: 'finished', elapsed: 55, result: { time: 55 } });
  race.rivals.forEach((rival, i) => { rival.finishTime = 48 + i; });
  const partial = cups.addCupResult(cup, race);
  const next = createRace('neon', { mode: 'cup' }, {}, cups.nextCupGrid(partial));
  assert.notDeepEqual(next.grid.map(slot => slot.id), race.grid.map(slot => slot.id));
  assert.deepEqual(next.rivals.map(rival => rival.id), race.rivals.map(rival => rival.id));
  assert.equal(retryCupHeat(partial, 'coast').rivalVisualSeed, cup.rivalVisualSeed);
  const storage = {
    value: null, setItem(key, value) { this.value = value; },
    getItem() { return this.value; },
  };
  saveCupProgress(partial, storage);
  assert.equal(loadCupProgress(tracks, storage).rivalVisualSeed, cup.rivalVisualSeed);
  const legacy = { tracks, results: [] };
  assert.equal(cups.cupRivalVisualSeed(legacy), cups.cupRivalVisualSeed(JSON.parse(JSON.stringify(legacy))));
  assert.equal(cups.cupRivalVisualSeed({ ...legacy, rivalVisualSeed: 0 }), 0);
});
