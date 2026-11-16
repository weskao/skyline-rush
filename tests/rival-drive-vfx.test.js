import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { RIVAL_CAR_STYLES, makeCar } from '../src/car-model.js';
import { rivalDriveCue, attachRivalDriveVfx } from '../src/rival-drive-vfx.ts';

// 2026-11-16: a rival's NITRO burn and BOOST showed nothing on the player's screen but a 0.08 rad wing tilt.
const NITRO = { nitroTime: 1.2, boosting: false };
const BOOST = { nitroTime: 0, boosting: true };
const IDLE = { nitroTime: 0, boosting: false };
const cue = (car, quality, reducedMotion = false, time = 3, enabled = true) =>
  rivalDriveCue(car, quality, enabled, reducedMotion, time, 0, { light: 0, flame: 0, trail: 0 });

test('NITRO lights the tail; the flame starts at Medium and the trail at High', () => {
  const low = cue(NITRO, 'low'), medium = cue(NITRO, 'medium'), high = cue(NITRO, 'high');
  for (const frame of [low, medium, high]) assert.ok(frame.light > 1.5, `tail glow ${frame.light}`);
  assert.equal(low.flame, 0); assert.equal(low.trail, 0);
  assert.ok(medium.flame > 0); assert.equal(medium.trail, 0);
  assert.ok(high.flame > 0); assert.ok(high.trail > 0);
});

test('BOOST is a mild tail-light brightening only, never a flame', () => {
  for (const quality of ['low', 'medium', 'high']) {
    const frame = cue(BOOST, quality);
    assert.ok(frame.light > 1 && frame.light < cue(NITRO, quality).light, `boost glow ${frame.light}`);
    assert.equal(frame.flame, 0); assert.equal(frame.trail, 0);
  }
  assert.deepEqual(cue(IDLE, 'high'), { light: 1, flame: 0, trail: 0 });
});

test('VFX Off keeps the tail-light cue and drops the flame', () => {
  const frame = cue(NITRO, 'high', false, 3, false);
  assert.ok(frame.light > 1.5); assert.equal(frame.flame, 0); assert.equal(frame.trail, 0);
});

test('Reduced Motion holds a steady glow; otherwise the burn flickers', () => {
  const steady = [1, 1.37, 2.9].map(time => cue(NITRO, 'high', true, time));
  assert.ok(steady.every(frame => frame.light === steady[0].light && frame.flame === steady[0].flame));
  const live = [1, 1.37, 2.9].map(time => cue(NITRO, 'high', false, time).flame);
  assert.ok(new Set(live).size > 1, 'flame flickers when motion is allowed');
});

test('every rival car carries a hidden, depth-tested additive flame behind its own rear', () => {
  for (const style of RIVAL_CAR_STYLES) {
    const car = makeCar(style);
    const rear = new THREE.Box3().setFromObject(car).max.z;
    attachRivalDriveVfx(car);
    const { flame, trail } = car.userData.driveCue;
    assert.equal(flame.parent, car); assert.equal(flame.visible, false); // hidden yet attached: warmupShaders compiles it
    assert.ok(flame.position.z >= rear - 0.05 && flame.position.z < rear + 0.6, `${style.color}: flame at z ${flame.position.z}, rear ${rear}`);
    for (const part of [flame, trail]) {
      const m = part.material;
      assert.equal(m.blending, THREE.AdditiveBlending); assert.equal(m.depthTest, true); assert.equal(m.depthWrite, false);
    }
  }
});

test('update drives the flame and returns the tail-light gain', () => {
  const car = makeCar(RIVAL_CAR_STYLES[0]);
  attachRivalDriveVfx(car);
  const { driveCue } = car.userData;
  const medium = { enabled: true, quality: 'medium' }, high = { enabled: true, quality: 'high' }, low = { enabled: true, quality: 'low' };
  assert.ok(driveCue.update(NITRO, medium, false, 2) > 1.5);
  assert.equal(driveCue.flame.visible, true); assert.equal(driveCue.trail.visible, false);
  driveCue.update(NITRO, high, false, 2); assert.equal(driveCue.trail.visible, true);
  driveCue.update(NITRO, low, false, 2); assert.equal(driveCue.flame.visible, false); assert.equal(driveCue.trail.visible, false);
  driveCue.update(BOOST, high, false, 2); assert.equal(driveCue.flame.visible, false);
  assert.equal(driveCue.update(IDLE, high, false, 2), 1);
});

test('world.js gives rivals (only) the drive cue and feeds its gain to the tail light', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.ok(/RIVAL_CAR_STYLES\.map\([^\n]*attachRivalDriveVfx\(car\)/.test(world), "rivals get attachRivalDriveVfx");
  assert.ok(/brakeLight\.color[^\n]*driveCue\?\.update\(car, visual/.test(world), "updateCar feeds the cue gain to the tail light");
});
