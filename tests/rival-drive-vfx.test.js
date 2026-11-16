import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { RIVAL_CAR_STYLES, makeCar } from '../src/car-model.js';
import { rivalDriveCue, attachRivalDriveVfx } from '../src/rival-drive-vfx.ts';
import { RIVAL_CUE_RANGE } from '../src/rival-cues.ts';

// 2026-11-16: a rival's NITRO burn and BOOST showed nothing on the player's screen but a 0.08 rad wing tilt.
const NITRO = { nitroTime: 1.2, boosting: false };
const BOOST = { nitroTime: 0, boosting: true };
const IDLE = { nitroTime: 0, boosting: false };
const cue = (car, quality, reducedMotion = false, time = 3, enabled = true, gap = 0, out = { light: 0, flame: 0, trail: 0 }) =>
  rivalDriveCue(car, quality, enabled, reducedMotion, time, 0, out, gap);

test('NITRO lights the tail; the flame starts at Medium and the trail at High', () => {
  const low = cue(NITRO, 'low'), medium = cue(NITRO, 'medium'), high = cue(NITRO, 'high');
  for (const frame of [low, medium, high]) assert.ok(frame.light > 1.5, `tail glow ${frame.light}`);
  assert.equal(low.flame, 0); assert.equal(low.trail, 0);
  assert.ok(medium.flame > 0); assert.equal(medium.trail, 0);
  assert.ok(high.flame > 0); assert.ok(high.trail > 0);
});

// 2026-11-16 (user): a tail light alone made a rival's BOOST surge (+14 m/s cap, +12 m/s²) look like cheating.
test('BOOST shows a smaller NITRO flame from Medium, only within RIVAL_CUE_RANGE of the player', () => {
  for (const quality of ['medium', 'high']) {
    const frame = cue(BOOST, quality);
    assert.ok(frame.flame > 0 && frame.flame < cue(NITRO, quality).flame * 0.8, `${quality} boost flame ${frame.flame}`);
    assert.equal(frame.trail, 0);
    assert.ok(frame.light > 1, `boost glow ${frame.light}`);
    assert.equal(cue(BOOST, quality, false, 3, true, RIVAL_CUE_RANGE + 1).flame, 0, 'no flame beyond the cue range');
    assert.ok(cue(BOOST, quality, false, 3, true, RIVAL_CUE_RANGE - 1).flame > 0);
  }
  assert.equal(cue(BOOST, 'low').flame, 0); assert.ok(cue(BOOST, 'low').light > 1);
  assert.equal(cue(BOOST, 'high', false, 3, false).flame, 0, 'VFX Off: tail light only');
  const { light, flame, trail } = cue(IDLE, 'high'); assert.deepEqual({ light, flame, trail }, { light: 1, flame: 0, trail: 0 });
});

test('BOOST ignition flashes the tail light once on the rising edge, on every tier', () => {
  for (const [quality, enabled, reducedMotion] of [['low', true, false], ['high', false, false], ['high', true, true]]) {
    const out = { light: 0, flame: 0, trail: 0 };
    const at = (car, time) => cue(car, quality, reducedMotion, time, enabled, 0, out).light;
    at(IDLE, 1);
    const flash = at(BOOST, 2), held = at(BOOST, 3);
    assert.ok(flash > held + 0.5, `${quality}: ignition ${flash} vs held ${held}`);
    assert.equal(at(BOOST, 4), held, 'a held BOOST never repeats the flash');
    at(IDLE, 5);
    assert.ok(at(BOOST, 6) > held + 0.5, 'the next BOOST flashes again');
  }
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
  const out = { light: 0, flame: 0, trail: 0 }; cue(BOOST, 'high', true, 0, true, 0, out); // past the ignition flash
  const boost = [1, 1.37, 2.9].map(time => ({ ...cue(BOOST, 'high', true, time, true, 0, out) }));
  assert.ok(boost.every(frame => frame.light === boost[0].light && frame.flame === boost[0].flame), 'BOOST is steady too');
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
  assert.equal(driveCue.update(IDLE, high, false, 2), 1);
});

test('update draws BOOST with the same flame sprite, smaller and dimmer, near the player only', () => {
  const car = makeCar(RIVAL_CAR_STYLES[0]);
  attachRivalDriveVfx(car);
  const { driveCue } = car.userData, medium = { enabled: true, quality: 'medium' };
  const rival = distance => ({ ...BOOST, distance });
  driveCue.update({ ...NITRO, distance: 500 }, medium, true, 2, 500);
  const nitroScale = driveCue.flame.scale.x, nitroOpacity = driveCue.flame.material.opacity, nitroMap = driveCue.flame.material.map;
  driveCue.update(rival(530), medium, true, 3, 500);
  assert.equal(driveCue.flame.visible, true); assert.equal(driveCue.trail.visible, false);
  assert.ok(driveCue.flame.scale.x < nitroScale * 0.8, `boost flame ${driveCue.flame.scale.x} vs NITRO ${nitroScale}`);
  assert.ok(driveCue.flame.material.opacity < nitroOpacity, 'dimmer than NITRO');
  assert.equal(driveCue.flame.material.map, nitroMap, 'the same glow sprite texture');
  driveCue.update(rival(500 + RIVAL_CUE_RANGE + 1), medium, true, 4, 500); assert.equal(driveCue.flame.visible, false);
  driveCue.update(rival(530), { enabled: true, quality: 'low' }, true, 5, 500); assert.equal(driveCue.flame.visible, false);
  driveCue.update({ ...NITRO, distance: 500 }, medium, true, 6, 500);
  assert.equal(driveCue.flame.material.opacity, nitroOpacity, 'NITRO gets its own look back');
});

test('world.js gives rivals (only) the drive cue and feeds its gain to the tail light', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.ok(/RIVAL_CAR_STYLES\.map\([^\n]*attachRivalDriveVfx\(car\)/.test(world), "rivals get attachRivalDriveVfx");
  assert.ok(/brakeLight\.color[^\n]*driveCue\?\.update\(car, visual, [^\n]*, time, distance\)/.test(world), "updateCar feeds the player's distance and takes the tail-light gain");
});
