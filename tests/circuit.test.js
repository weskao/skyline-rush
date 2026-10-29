import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, RACE_TRACKS, stepRace } from '../src/game.js';
import { recordModeRace, loadModeHistory, loadModeBest, saveModeGhost, loadModeGhost } from '../src/history.ts';
import { mergeProgress } from '../src/cloud-progress-merge.ts';
import { mergeModeBests } from '../src/cloud-mode-bests.ts';
import { validGhost } from '../src/ghost.ts';
import { Scene, Vector3 } from 'three';
import * as circuitRecords from '../src/circuit-records.ts';
import { createCircuitScene } from '../src/circuit-scene.ts';
import { createEffects } from '../src/effects.js';
import { trackLocalPosition } from '../src/track-paths.ts';
import { routeMarker } from '../src/route-map.ts';
import { trackPoint, trackFrame } from '../src/track-paths.ts';

const id = 'harbor-circuit';
test('a new circuit has periodic geometry without changing the ten sprint routes', () => {
  assert.equal(Object.keys(RACE_TRACKS).length, 10);
  const race = createRace(id, { mode: 'circuit', laps: 3 });
  assert.equal(race.length, 6000);
  for (const s of [0, .01, 499, 1999.99, 2000, 4000]) {
    const a = trackPoint(id, s), b = trackPoint(id, s + 2000);
    for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(a[axis] - b[axis]) < 1e-8);
    const fa = trackFrame(id, s), fb = trackFrame(id, s + 2000);
    for (const key of ['forward', 'right', 'up']) {
      assert.ok(Math.abs(Math.hypot(...fa[key]) - 1) < 1e-12);
      assert.ok(fa[key].every((v, i) => Math.abs(v - fb[key][i]) < 1e-9));
    }
  }
});

for (const laps of [1, 3, 5]) for (const dt of [1 / 30, 1 / 60, 1 / 120]) test(`completes exactly ${laps} valid laps at ${1 / dt} Hz, including AI drivers`, () => {
  const race = createRace(id, { mode: 'circuit', laps });
  race.phase = 'racing'; race.pickups = []; race.rings = [];
  // Separate lanes make this a deterministic sector/timer test, not a collision race.
  race.player.x = 2.5;
  while (race.phase === 'racing' && race.elapsed < 220) stepRace(race, { throttle: true }, dt);
  assert.equal(race.phase, 'finished');
  assert.equal(race.circuit.player.completed, laps);
  assert.equal(race.circuit.player.lapTimes.length, laps);
  assert.ok(race.circuit.player.lapTimes.every(lap => lap.time > 0 && lap.splits.length === 4));
  assert.ok(Math.abs(race.result.time - race.circuit.player.lapTimes.reduce((sum, lap) => sum + lap.time, 0)) < 1e-8);
  assert.equal(race.player.distance, race.length);
  assert.ok(Object.values(race.circuit.rivals).every(driver => driver.nextSector > 1));
});

test('teleporting to the finish never completes a circuit or grants a lap', () => {
  const race = createRace(id, { mode: 'circuit', laps: 1 });
  race.phase = 'racing'; race.player.distance = 1999; race.player.speed = 88;
  stepRace(race, { throttle: true }, .1);
  assert.equal(race.phase, 'racing');
  assert.equal(race.circuit.player.completed, 0);
  assert.equal(race.circuit.player.valid, false);
});

test('items get separate per-lap identities and groups, with the same physical placements', () => {
  const race = createRace(id, { mode: 'circuit', laps: 3 });
  const first = race.pickups.filter(item => item.distance < 2000);
  assert.equal(race.pickups.length, first.length * 3);
  assert.equal(new Set(race.pickups.map(item => item.id)).size, race.pickups.length);
  for (let lap = 0; lap < 3; lap++) assert.deepEqual(race.pickups.filter(item => item.lap === lap).map(item => item.distance - lap * 2000), first.map(item => item.distance));
  assert.notEqual(race.rings[0].group, race.rings.find(item => item.lap === 1).group);
});

test('lap-adjacent cars collide across the seam while ranking uses unwrapped progress', () => {
  const race = createRace(id, { mode: 'circuit', laps: 3 });
  race.phase = 'racing'; race.player.distance = 1999; race.player.speed = 30;
  race.rivals = [{ ...race.rivals[0], distance: 1, x: race.player.x, homeX: race.player.x, speed: 30 }];
  stepRace(race, {}, .01);
  assert.equal(race.player.collisions, 1);
  assert.ok(race.rivals[0].cooldown > 0);
});


test('circuit records and Ghost bounds retain 1/3/5-lap identities independently of Classic', () => {
  const data = new Map(), store = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  for (const laps of [1, 3, 5]) {
    const race = createRace(id, { mode: 'circuit', laps });
    race.phase = 'racing'; race.rings = []; race.pickups = [];
    while (race.phase === 'racing' && race.elapsed < 220) stepRace(race, { throttle: true }, .1);
    assert.doesNotThrow(() => recordModeRace(race, store));
    assert.equal(loadModeHistory(store).at(-1).lapCount, laps);
    assert.equal(loadModeHistory(store).at(-1).lapTimes.length, laps);
    assert.equal(loadModeBest(id, race.config, store), race.result.time);

  }
  assert.equal(loadModeHistory(store).length, 3);
  const runs = loadModeHistory(store);
  assert.equal(mergeProgress({ modeHistory: runs }, null).modeHistory.length, 3);
  const key = JSON.stringify([id, createRace(id, { mode: 'circuit', laps: 3 }).config]);
  assert.equal(mergeModeBests({ bests: { [key]: 80 } }, { version: 1, bests: { [key]: 70 } }).bests[key], 70);
  assert.equal(data.has('skyline-rush-history'), false);
});


test('Circuit Ghost bounds require matching 1/3/5-lap rules and remain independent of Classic', () => {
  const data = new Map(), store = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  for (const laps of [1, 3, 5]) {
    const race = createRace(id, { mode: 'circuit', laps });
    const time = race.length / 80;
    const ghost = { time, samples: Array.from({ length: time * 10 + 1 }, (_, i) => [i * 8, 2.5, 0]) };
    assert.equal(validGhost(ghost, id, race.config), true);
    assert.equal(saveModeGhost(id, race.config, ghost, store), true);
    assert.deepEqual(loadModeGhost(id, race.config, store), ghost);
    assert.equal(validGhost(ghost, id), false, 'missing Circuit rules cannot borrow a lap bound');
    assert.equal(validGhost(ghost, 'coast'), false);
  }
});


test('nonfinite public circuit progress resolves to the safe start frame and map marker', () => {
  for (const distance of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(trackPoint(id, distance), trackPoint(id, 0));
    assert.deepEqual(routeMarker(id, distance), routeMarker(id, 0));
  }
});


test('visible circuit rings face the same physical frame as their road and vehicles', t => {
  globalThis.devicePixelRatio = 1; t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), effects = createEffects(scene, () => 0);
  t.after(() => effects.dispose());
  const race = createRace(id, { mode: 'circuit', laps: 3 });
  race.phase = 'racing';
  const ring = race.rings[0]; race.player.distance = ring.distance - 20;
  effects.update(race, .016, 0, false, true, [], {
    worldPoint: (s, x, y, origin) => trackLocalPosition(id, s, x, y, origin), worldFrame: s => trackFrame(id, s),
  });
  const mesh = scene.getObjectByName('Race rings').children[0], frame = trackFrame(id, ring.distance);
  const normal = new Vector3(0, 0, 1).applyQuaternion(mesh.quaternion);
  assert.ok(normal.dot(new Vector3(...frame.forward).negate()) > .999999);
  assert.deepEqual(mesh.position.toArray(), trackLocalPosition(id, ring.distance, ring.x, ring.altitude, race.player.distance));
});


test('leaving the circuit scene releases each owned shared geometry exactly once', () => {
  const scene = new Scene(), kit = createCircuitScene(scene), disposals = new Map();
  scene.traverse(object => {
    if (!object.geometry || disposals.has(object.geometry)) return;
    disposals.set(object.geometry, 0);
    object.geometry.addEventListener('dispose', () => disposals.set(object.geometry, disposals.get(object.geometry) + 1));
  });
  kit.dispose();
  assert.equal(scene.children.length, 0);
  assert.ok([...disposals.values()].every(count => count === 1));
});


test('personal best lap remains separate from total time after rolling history is full', () => {
  assert.equal(typeof circuitRecords.loadCircuitLapBest, 'function');
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const race = createRace(id, { mode: 'circuit', laps: 3 });
  const result = times => ({ time: times.reduce((a, b) => a + b, 0), position: 1, score: 0, success: true,
    lapTimes: times.map(time => ({ time, splits: [time / 4, time / 2, time * 3 / 4, time] })) });
  recordModeRace({ ...race, result: result([30, 35, 35]) }, storage);
  for (let i = 0; i < 55; i++) recordModeRace({ ...race, result: result([40, 40, 40]) }, storage);
  assert.equal(circuitRecords.loadCircuitLapBest(race.config, storage), 30);
  assert.equal(loadModeBest(id, race.config, storage), 100);
  assert.equal(circuitRecords.loadCircuitLapBest(createRace(id, { mode: 'circuit', laps: 1 }).config, storage), null);
});

test('permanent lap-best metrics merge by minimum without changing ordinary race-best keys', () => {
  const config = createRace(id, { mode: 'circuit', laps: 3 }).config;
  const lap = JSON.stringify([id, config, 'lap']), total = JSON.stringify([id, config]);
  const saved = mergeModeBests({ bests: { [lap]: 30, [total]: 100 } }, { version: 1, bests: { [lap]: 25, [total]: 110 } });
  assert.equal(saved.bests[lap], 25); assert.equal(saved.bests[total], 100);
  assert.deepEqual(mergeModeBests({ bests: { [JSON.stringify(['coast', { mode: 'classic' }, 'lap'])]: 1 } }).bests, {});
});


test('backwards progress and recovery invalidate ordered sectors, while hovering cannot farm the finish', () => {
  const driven = target => {
    const race = createRace(id, { mode: 'circuit', laps: 3 });
    race.phase = 'racing'; race.rivals = []; race.rings = []; race.pickups = [];
    while (race.player.distance < target) stepRace(race, { throttle: true }, .05);
    return race;
  };
  for (const change of [car => { car.distance -= 20; }, car => { car.falls++; }]) {
    const race = driven(550); change(race.player); stepRace(race, {}, .01);
    assert.equal(race.circuit.player.valid, false);
    assert.equal(race.circuit.player.completed, 0);
  }
  const race = driven(2001);
  Object.assign(race.player, { speed: 0, altitude: 10, verticalSpeed: 0 });
  for (let i = 0; i < 100; i++) stepRace(race, {}, .1);
  assert.equal(race.circuit.player.completed, 1);
  assert.equal(race.circuit.player.finishTime, null);
});
