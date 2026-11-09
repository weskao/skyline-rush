import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRearLight } from '../src/rear-light.ts';
import { MAX_SPEED } from '../src/game.js';

const state = () => ({ phase: 'racing', player: { braking: false, boosting: false, nitroTime: 0, miniBoost: 0, speed: 0 } });

test('typed rear LED preserves brake/boost behavior and pauses its animation clock', () => {
  const light = createRearLight();
  const core = light.group.getObjectByName('Rear LED core');
  const flow = light.group.getObjectByName('Rear LED flow');
  const race = state();
  light.update(race, 0.2, true);
  assert.equal(core.material.emissiveIntensity, 1);
  assert.equal(flow.visible, false);
  race.player.braking = true;
  light.update(race, 0.2, true);
  assert.equal(core.material.emissiveIntensity, 2.6);
  race.player.braking = false;
  race.player.nitroTime = 1;
  light.update(race, 0.2, true);
  assert.equal(core.material.emissiveIntensity, 1.6);
  race.phase = 'paused';
  light.update(race, 1, true);
  const level = core.material.emissiveIntensity;
  light.update(race, 1, true);
  assert.equal(core.material.emissiveIntensity, level);
});

test('rear LED is one thin red line on a black panel', () => {
  const { group } = createRearLight();
  const core = group.getObjectByName('Rear LED core');
  core.geometry.computeBoundingBox();
  const { min, max } = core.geometry.boundingBox;
  assert.ok(max.x - min.x > 2, 'spans the rear fascia');
  assert.ok(max.y - min.y < 0.04, 'hairline height');
  assert.ok(max.z - min.z > 0, 'depth follows the fascia curve');
  assert.ok(group.getObjectByName('Rear LED black panel').material.roughness < 0.2);
  assert.equal(core.material.emissive.getHexString(), 'ff3030');
});

test('rear LED glow power tracks braking and nitro pulses above the cruising level', () => {
  const light = createRearLight();
  const glow = light.group.getObjectByName('Rear LED glow');
  const core = light.group.getObjectByName('Rear LED core');
  const race = state();
  light.update(race, 0.1, false);
  const cruising = { intensity: core.material.emissiveIntensity, glow: glow.material.uniforms.power.value };
  race.player.braking = true;
  light.update(race, 0.1, false);
  assert.ok(core.material.emissiveIntensity > cruising.intensity * 2);
  assert.ok(glow.material.uniforms.power.value > cruising.glow * 2);
  race.player.braking = false;
  race.player.nitroTime = 5;
  const intensities = [];
  for (let i = 0; i < 8; i++) { light.update(race, 0.07, false); intensities.push(core.material.emissiveIntensity); }
  assert.ok(Math.min(...intensities) > cruising.intensity, 'nitro stays above cruising');
  assert.ok(Math.max(...intensities) - Math.min(...intensities) > 0.15, 'nitro oscillates');
});

test('rear LED scans outward after ready becomes countdown and again after reset()', () => {
  const light = createRearLight();
  const lights = light.group.getObjectByName('Rear LED core').parent;
  const race = { ...state(), phase: 'ready' };
  light.update(race, 1, false);
  assert.equal(lights.scale.x, 1, 'a settled light is full width');
  race.phase = 'countdown';
  light.update(race, 0.1, false);
  assert.ok(lights.scale.x < 1, 'countdown restarts the scan');
  light.update(race, 0.8, false);
  assert.equal(lights.scale.x, 1);
  light.reset();
  light.update(race, 0.1, false);
  assert.ok(lights.scale.x < 1, 'reset() restarts the scan');
});

test('rear LED flow runs at top speed; reduced motion keeps it off and steady', () => {
  const light = createRearLight();
  const flow = light.group.getObjectByName('Rear LED flow');
  const race = state();
  race.player.speed = MAX_SPEED;
  light.update(race, 1, false);
  assert.equal(flow.visible, true);
  const x = flow.position.x;
  light.update(race, 0.1, false);
  assert.notEqual(flow.position.x, x, 'the flow moves along the bar');
  race.player.nitroTime = 5;
  light.update(race, 0.1, false);
  assert.equal(flow.visible, false, 'boosting hides the flow');

  const calm = createRearLight();
  const calmCore = calm.group.getObjectByName('Rear LED core');
  const calmRace = state();
  calmRace.player.speed = MAX_SPEED;
  calm.update(calmRace, 1, true);
  assert.equal(calm.group.getObjectByName('Rear LED flow').visible, false);
  calmRace.player.nitroTime = 5;
  const levels = new Set();
  for (let i = 0; i < 8; i++) { calm.update(calmRace, 0.07, true); levels.add(calmCore.material.emissiveIntensity); }
  assert.deepEqual([...levels], [1.6], 'reduced motion holds a constant boost level');
});
