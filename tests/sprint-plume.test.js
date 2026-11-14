import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Group } from 'three';
import { REAR_PORTS } from '../src/aero-vfx.js';
import * as plumeModule from '../src/sprint-plume.ts';

const { createSprintPlume } = plumeModule;
const JET_UNIFORMS = ['time', 'power', 'brightness', 'diamonds', 'extreme', 'nitroMix', 'tail', 'skinTint', 'skinPattern', 'trailAccent'];
/** One frame as src/aero-vfx.js fills it: a full-power sprint on High, racing on the road. */
const frame = (over = {}) => ({ time: 2, power: 1, nitroMix: 0, reach: 5, brightness: 1, diamonds: 0.5, extreme: 0, tail: 0,
  quality: 1, enabled: true, calm: false, voidPulse: false, racing: true, grounded: true, ...over });
const jetsOf = parent => parent.children.filter(child => child.name.startsWith('Cold gas nozzle'));

test('the rear exhaust lives in its own module', () => {
  assert.equal(typeof createSprintPlume, 'function');
  const aero = readFileSync(new URL('../src/aero-vfx.js', import.meta.url), 'utf8');
  assert.doesNotMatch(aero, /Cold gas nozzle|jetMaterial/, 'aero-vfx.js no longer builds the jets');
  const parent = new Group(), plume = createSprintPlume(parent, REAR_PORTS), jets = jetsOf(parent);
  assert.deepEqual(jets.map(jet => jet.name), [1, 2, 3, 4].map(n => `Cold gas nozzle ${n}`));
  assert.deepEqual(plume.jets, jets);
  assert.deepEqual(jets.map(jet => jet.position.x), REAR_PORTS.map(port => port.position[0]));
  assert.ok(jets.every(jet => !jet.visible), 'hidden from creation: the world warm-up compiles them');
  assert.equal(new Set(jets.map(jet => jet.material)).size, 4, 'each jet has its own material');
  for (const jet of jets) for (const name of JET_UNIFORMS) assert.ok(name in jet.material.uniforms, `uniform ${name}`);
  plume.update(frame());
  jets.forEach((jet, i) => {
    assert.ok(jet.visible);
    assert.equal(jet.scale.z, 5);
    assert.equal(jet.material.uniforms.time.value, 2 + i * 0.13);
  });
  plume.reset();
  assert.ok(jets.every(jet => !jet.visible), 'reset hides the jets');
});
