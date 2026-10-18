import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';

test('a nonpositive first frame cannot revive dormant particles with uninitialized data', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene();
  const effects = createEffects(scene, () => 0);
  effects.update(createRace(), -0.005, 0, true, false);
  const particles = scene.children.find(object => object.isPoints);
  assert.ok([...particles.geometry.attributes.alpha.array].every(value => value === 0));
  assert.ok([...particles.geometry.attributes.position.array].every(Number.isFinite));
});

function flight(t, altitude = 4, speed = 40) {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene();
  const effects = createEffects(scene, () => 0);
  const race = createRace();
  race.phase = 'racing';
  Object.assign(race.player, { x: 0, altitude, speed, thrusting: true });
  const points = scene.children.find(object => object.isPoints);
  return { effects, race, attributes: points.geometry.attributes };
}

test('downwash descends and carries forward momentum after leaving a moving car', t => {
  const { effects, race, attributes } = flight(t);
  effects.update(race, 0.04, 0, false, false);
  const active = [...attributes.alpha.array].flatMap((alpha, i) => alpha > 0 ? [i] : []);
  assert.ok(active.length > 0);
  const before = attributes.position.array.slice();
  race.player.thrusting = false;
  effects.update(race, 0.04, 0, false, false);
  for (const i of active) {
    assert.ok(attributes.position.array[i * 3 + 1] < before[i * 3 + 1], 'air travels downward');
    assert.ok(attributes.position.array[i * 3 + 2] < before[i * 3 + 2] - 0.7, 'air retains vehicle momentum');
  }
});

test('downwash turns into an outward surface flow when it reaches the road', t => {
  const { effects, race, attributes } = flight(t, 0.05, 0);
  effects.update(race, 0.04, 0, false, false);
  race.player.thrusting = false;
  for (let i = 0; i < 8; i++) effects.update(race, 0.025, 0, false, false);
  const surface = [...attributes.alpha.array].flatMap((alpha, i) =>
    alpha > 0 && attributes.position.array[i * 3 + 1] < 0.3 ? [Math.abs(attributes.position.array[i * 3])] : []);
  assert.ok(surface.length > 0, 'surface wash remains briefly visible');
  assert.ok(Math.max(...surface) > 1.25, 'air spreads beyond the nozzle footprint');
});

test('reset clears visible vapor immediately and a paused frame leaves it empty', t => {
  const { effects, race, attributes } = flight(t);
  effects.update(race, 0.04, 0, false, false);
  assert.ok(attributes.alpha.array.some(alpha => alpha > 0));
  effects.reset();
  assert.ok(attributes.alpha.array.every(alpha => alpha === 0));
  effects.update(race, 0, 0, false, false);
  assert.ok(attributes.alpha.array.every(alpha => alpha === 0));
});
