import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRearLight } from '../src/rear-light.ts';

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
  assert.equal(core.material.emissiveIntensity, 3.8);
  race.player.braking = false;
  race.player.nitroTime = 1;
  light.update(race, 0.2, true);
  assert.equal(core.material.emissiveIntensity, 2.1);
  race.phase = 'paused';
  light.update(race, 1, true);
  const level = core.material.emissiveIntensity;
  light.update(race, 1, true);
  assert.equal(core.material.emissiveIntensity, level);
});
