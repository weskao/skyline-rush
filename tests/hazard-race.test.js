import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('player hazard resolution lives in its own module, not game.js', async () => {
  const { stepPlayerHazards } = await import('../src/hazard-race.ts');
  assert.equal(typeof stepPlayerHazards, 'function');
  assert.doesNotMatch(readFileSync(new URL('../src/game.js', import.meta.url), 'utf8'), /a close, clean ground pass pays more/);
});

const { validateHazardPlacement } = await import('../src/hazard-schema.ts');
const entry = (type, movementPattern = { kind: 'static' }, extra = {}) => {
  const placement = validateHazardPlacement({ id: `e-${type}`, trackId: 'coast', distance: 1000, lateralOffset: 0, altitude: 0, type,
    triggerWindow: { from: 900, to: 1050 }, warningLeadSeconds: 1.5, movementPattern, difficulty: 'standard', seed: 4, ...extra });
  return { id: placement.id, type, distance: 1000, x: 0, altitude: placement.altitude, hit: false, passed: false, moving: false, phase: 0, speed: 0,
    halfWidth: placement.hitbox.halfWidth, halfLength: placement.hitbox.halfLength, height: placement.hitbox.height, placement };
};
const player = (x, extra = {}) => ({ distance: 1001, x, altitude: 0, cooldown: 0, score: 0, nearMisses: 0, speed: 60, ...extra });
const run = (hazard, car, elapsed = 0) => {
  const hits = [];
  return { hits, car, hazard, ...stepOnce({ hazards: [hazard], elapsed }, car, hits) };
};
function stepOnce(race, car, hits) { stepPlayerHazards(race, car, 999, (_r, kind, x) => hits.push([kind, x])); return {}; }
const { stepPlayerHazards, hazardPose, hazardReach } = await import('../src/hazard-race.ts');

test('ENV-05 authored sweeping gates hit where hazardFrame puts them', () => {
  const gate = () => entry('gate', { kind: 'sweep', amplitude: 1.8, period: 4, phase: 0 });
  assert.deepEqual(run(gate(), player(1.8), 1).hits, [['barrier', 1.8]]);
  const missed = run(gate(), player(-1.8), 1);
  assert.deepEqual(missed.hits, []);
  assert.equal(missed.hazard.passed, true);
  assert.equal(missed.car.score, 300, 'close clean pass of a blocker still pays');
});

test('ENV-05 a switched-off energy barrier lets the car through', () => {
  const barrier = () => entry('energy-barrier', { kind: 'pulse', period: 4, phase: 0 });
  assert.equal(run(barrier(), player(0), 0.5).hits.length, 1);
  assert.equal(run(barrier(), player(0), 2.5).hits.length, 0);
});

test('ENV-05 gusts shove sideways and terrain slows, once, with no crash and no score', () => {
  const gust = run(entry('gust'), player(1));
  assert.deepEqual(gust.hits, []);
  assert.equal(gust.car.x, 1 - 1.5, 'seed 4 blows toward the left');
  assert.equal(gust.car.score, 0);
  assert.equal(gust.car.cooldown, 0);
  const terrain = run(entry('terrain'), player(1));
  assert.equal(terrain.car.speed, 60 * 0.85);
  assert.equal(terrain.hazard.passed, true);
  const again = run(terrain.hazard, terrain.car);
  assert.equal(again.car.speed, 60 * 0.85, 'a crossed zone never applies twice');
});

test('ENV-05 contact is swept at the hazard, so a fast frame cannot tunnel through it', () => {
  assert.equal(run(entry('cone'), player(0, { distance: 1060 })).hits.length, 1);
});

test('ENV-05 generated hazards keep their original motion and reach', () => {
  const generated = { distance: 1000, x: 2.5, altitude: 0, hit: false, passed: false, moving: true, phase: 0, speed: 1.05 };
  assert.deepEqual(hazardPose(generated, 1), { x: 2.5 + Math.sin(1.05) * 1.8, altitude: 0, active: true });
  assert.equal(hazardReach(generated), 1.55 + 1.8);
  assert.equal(hazardReach(entry('gate', { kind: 'sweep', amplitude: 1.2, period: 4, phase: 0 })), 1.55 + 1.2);
  assert.equal(hazardReach(entry('checkpoint')), 0, 'AI never swerves around a trigger');
});

test('ENV-05 cars without an altitude field are on the ground', async () => {
  const { hazardTouch } = await import('../src/hazard-race.ts');
  const generated = { distance: 1000, x: 0, altitude: 0, hit: false, passed: false, moving: false, phase: 0, speed: 0 };
  assert.equal(hazardTouch(generated, { distance: 1000, x: 0, speed: 50 }, 0).effect, 'block');
  assert.equal(hazardTouch(entry('cone'), { distance: 1000, x: 0, speed: 50 }, 0).effect, 'block');
});

test('ENV-05 the renderer draws hazards exactly where the simulation resolves them', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(world, /hazardPose\(hazard, race\.elapsed\)/);
  assert.match(world, /if \(!active\) continue;/, 'a switched-off barrier is not drawn as solid');
  assert.doesNotMatch(world, /hazardX\(/);
});
