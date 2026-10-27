import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, useHeldItem, RACE_TRACKS } from '../src/game.js';
import { Scene } from 'three';
import { createEffects } from '../src/effects.js';
import { validateRaceRequest, rulesSignature } from '../src/race-config.ts';

function collect(race, type, overrides = {}) {
  const ring = race.rings.find(ring => ring.type === type && !ring.hit);
  assert.ok(ring, `${type} has a real authored gate`);
  race.phase = 'racing';
  Object.assign(race.player, { distance: ring.distance - .1, x: ring.x, altitude: ring.altitude, verticalSpeed: 0, speed: 50, ...overrides });
  stepRace(race, {}, 1 / 60);
  assert.equal(ring.hit, true);
  return ring;
}
const all = (track = 'coast', rivals = 3) => createRace(track, { mode: 'custom', itemRules: 'all', rivals, traffic: 'off' });

test('bonus gate positions are bounded deterministic authored locations on all ten tracks', () => {
  for (const track of Object.keys(RACE_TRACKS)) {
    const race = all(track);
    assert.ok(race.rings.some(ring => ring.type === 'speed-pad'), track);
    assert.ok(race.rings.some(ring => ring.type === 'air-pad'), track);
    assert.ok(race.rings.some(ring => ring.type === 'recovery-pad'), track);
    assert.ok(race.rings.some(ring => ring.type === 'emp'), track);
    assert.deepEqual(race.rings, all(track).rings);
    const original = createRace(track).rings;
    for (const [index, ring] of race.rings.entries()) {
      assert.deepEqual([ring.distance, ring.x, ring.altitude, ring.radius],
        [original[index].distance, original[index].x, original[index].altitude, original[index].radius]);
    }
    assert.equal(createRace(track).rings.some(ring => ring.type.endsWith('-pad') || ring.type === 'emp'), false);
  }
});

test('speed/air gates cap their resources and cannot be collected again by a stationary frame', () => {
  const race = all();
  collect(race, 'speed-pad', { miniBoost: 0 });
  assert.equal(race.player.miniBoost, 1.2);
  const score = race.player.score;
  race.player.speed = 0;
  stepRace(race, {}, 1 / 60);
  assert.ok(race.player.miniBoost < 1.2);
  assert.equal(race.player.score, score);
  collect(race, 'air-pad', { fuel: 95 });
  assert.equal(race.player.fuel, 100);
});

test('recovery softens exactly one hit without erasing official collision counts', () => {
  const protectedRace = all();
  collect(protectedRace, 'recovery-pad');
  assert.equal(protectedRace.player.recoveryTime, 5);
  const plain = all();
  for (const race of [protectedRace, plain]) {
    race.phase = 'racing'; race.rings = []; race.traffic = []; race.rivals = [];
    Object.assign(race.player, { distance: 100, x: 0, altitude: 0, speed: 50, cooldown: 0, collisions: 2 });
    race.props = [{ id: 'test-barrier', from: 100, to: 103, left: -1, right: 1, bottom: 0, top: 3 }];
    stepRace(race, {}, .05);
  }
  assert.equal(protectedRace.player.collisions, 3);
  assert.equal(protectedRace.player.recoveryTime, 0);
  assert.ok(protectedRace.player.speed > plain.player.speed);
  assert.ok(protectedRace.player.impact.speedLost <= 7.5, 'one recovery hit retains at least 85% of pre-impact speed');
});

test('EMP only disrupts nearby opponents once and solo power is converted safely', () => {
  const race = all();
  collect(race, 'emp');
  assert.equal(race.player.heldItem, 'emp');
  const player = race.player;
  race.rivals[0].distance = player.distance + 15; race.rivals[0].x = player.x;
  race.rivals[1].distance = player.distance + 40; race.rivals[1].x = player.x;
  race.rivals[2].distance = player.distance + 20; race.rivals[2].x = player.x;
  assert.equal(useHeldItem(race), 'emp');
  assert.equal(race.rivals[0].empUntil, race.elapsed + 1.5);
  assert.equal(race.rivals[1].empUntil, undefined);
  assert.equal(race.rivals[2].empUntil, race.elapsed + 1.5);
  stepRace(race, {}, 1 / 60);
  assert.equal(race.rivals[0].pace / race.rivals[0].speed, .5);
  race.elapsed += 1.5;
  stepRace(race, {}, 1 / 60);
  assert.equal(race.rivals[0].pace / race.rivals[0].speed, 1);
  assert.equal(useHeldItem(race), null);
  race.player.heldItem = 'emp'; race.player.itemCooldown = 0; race.phase = 'paused';
  assert.equal(useHeldItem(race), null);
  const solo = all('coast', 0); solo.phase = 'racing'; solo.player.heldItem = 'emp';
  assert.equal(useHeldItem(solo), 'magnet');
  assert.equal(solo.player.effects.magnet, 5);
});

test('score tokens are opt-in, limited to style modes and use a nonstacking five-second double', () => {
  for (const mode of ['stunt', 'checkpoint']) {
    const race = createRace('coast', { mode, bonusGates: true });
    collect(race, 'score-pad');
    assert.equal(race.player.multiplierTime, 5);
    const another = race.rings.find(ring => ring.type === 'score-pad' && !ring.hit);
    if (another) { collect(race, 'score-pad', { distance: another.distance - .1 }); assert.ok(race.player.multiplierTime <= 5); }
    assert.ok(rulesSignature({ mode, bonusGates: true }) !== rulesSignature({ mode }));
    assert.equal(createRace('coast', { mode }).rings.some(ring => ring.type === 'score-pad'), false);
  }
  assert.throws(() => validateRaceRequest({ mode: 'classic', bonusGates: true }), /bonusGates/);
  assert.throws(() => validateRaceRequest({ mode: 'time', bonusGates: true }), /bonusGates/);
});

test('double-score duration is bounded, pauses freeze it, and 30/60/120 FPS earn the same twofold bonus', () => {
  for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
    const races = [0, 5].map(multiplierTime => {
      const race = createRace('coast', { mode: 'stunt', bonusGates: true });
      race.phase = 'racing'; race.rings = []; race.traffic = []; race.rivals = [];
      Object.assign(race.player, { distance: 100, x: 0, speed: 40, altitude: 5, multiplierTime });
      return race;
    });
    for (const race of races) for (let i = 0; i < Math.round(1 / dt); i++) stepRace(race, { fly: true }, dt);
    assert.ok(Math.abs(races[1].player.score - 2 * races[0].player.score) < 1e-8);
    assert.ok(Math.abs(races[1].player.multiplierTime - 4) < 1e-8);
    const before = races[1].player.multiplierTime;
    races[1].phase = 'paused'; stepRace(races[1], {}, dt);
    assert.equal(races[1].player.multiplierTime, before);
  }
});


test('all bonus gates render with existing warmed materials and bounded pools', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), effects = createEffects(scene, () => 0);
  t.after(() => effects.dispose());
  const gates = scene.getObjectByName('Race rings');
  const poolSize = gates.children.length;
  const warmed = new Set(gates.children.map(mesh => mesh.material));
  for (const config of [{ mode: 'custom', itemRules: 'all' }, { mode: 'stunt', bonusGates: true }]) {
    const race = createRace('coast', config);
    race.phase = 'racing';
    for (const gate of race.rings.filter(gate => gate.type.endsWith('-pad') || gate.type === 'emp')) {
      race.player.distance = gate.distance - 10;
      effects.update(race, 1 / 60, 0, false, true);
      const mesh = gates.children[0];
      assert.ok(mesh.visible);
      assert.ok(mesh.material && warmed.has(mesh.material), gate.type + ' uses an existing warmed variant');
      assert.ok(mesh.material.color.toArray().every(Number.isFinite));
      assert.equal(gates.children.length, poolSize);
    }
  }
});
