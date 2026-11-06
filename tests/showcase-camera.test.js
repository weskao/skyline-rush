import test from 'node:test';
import assert from 'node:assert/strict';
import * as camera from '../src/track-preview.ts';
import * as settings from '../src/vfx-settings.ts';
import { RACE_TRACKS } from '../src/game.js';

const views = ['drive', 'front', 'rear', 'left', 'right', 'orbit'];

test('showcase modes have a single shared ordering for the home UI and VFX menu', () => {
  assert.deepEqual(settings.SHOWCASE_VIEWS, views);
});

test('every current and future track can use the same preview camera modes', () => {
  assert.equal(typeof camera.showcaseCameraPose, 'function');
  for (const id of Object.keys(RACE_TRACKS)) {
    for (const view of views) {
      const pose = camera.showcaseCameraPose(id, view, 2);
      for (const key of ['cameraSide', 'cameraBack', 'cameraHeight', 'lookSide', 'lookAhead', 'lookHeight']) {
        assert.ok(Number.isFinite(pose[key]), `${id}/${view}/${key}`);
      }
    }
  }
  // A track without hand-curated art direction must still have a usable view.
  assert.ok(Number.isFinite(camera.showcaseCameraPose('future-track', 'front', 0).cameraBack));
});

test('front/rear and left/right views differ and orbit rotates while drive stays stable', () => {
  const { showcaseCameraPose: pose } = camera;
  for (const id of Object.keys(RACE_TRACKS)) {
    assert.ok(pose(id, 'front').cameraBack < 0, id);
    assert.ok(pose(id, 'rear').cameraBack > 0, id);
    assert.ok(pose(id, 'left').cameraSide < 0, id);
    assert.ok(pose(id, 'right').cameraSide > 0, id);
    assert.notEqual(pose(id, 'orbit', 0).cameraSide, pose(id, 'orbit', 8).cameraSide);
    assert.deepEqual(pose(id, 'drive', 0), pose(id, 'drive', 8));
  }
});

test('landscape angles aim left of the car so it sits right of the home panel; portrait stays centred', () => {
  for (const id of [...Object.keys(RACE_TRACKS), 'future-track']) {
    for (const [view, time] of [['front', 0], ['rear', 0], ['left', 0], ['right', 0], ['orbit', 3], ['orbit', 19]]) {
      const pose = camera.showcaseCameraPose(id, view, time, false);
      // The camera's own left, in (side, back) road coordinates, seen from its bearing around the car.
      const angle = Math.atan2(pose.cameraSide, pose.cameraBack);
      const towardLeft = pose.lookSide * -Math.cos(angle) + -pose.lookAhead * Math.sin(angle);
      assert.ok(towardLeft > 3.5, `${id}/${view}@${time}: look ${towardLeft.toFixed(2)} m left`);
      const portrait = camera.showcaseCameraPose(id, view, time, true);
      assert.equal(Math.hypot(portrait.lookSide, portrait.lookAhead), 0, `${id}/${view} portrait`);
    }
  }
});

test('portrait and landscape preview distances stay appropriate for the home showcase', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    const landscape = camera.showcaseCameraPose(id, 'drive', 0, false);
    const portrait = camera.showcaseCameraPose(id, 'drive', 0, true);
    assert.ok(landscape.cameraBack > 9, id);
    assert.ok(portrait.cameraBack >= landscape.cameraBack, id);
  }
});

const bearing = pose => Math.atan2(pose.cameraSide, pose.cameraBack) * 180 / Math.PI;
const wrap = degrees => ((degrees + 540) % 360) - 180;

test('fixed views sit at their own bearing around the car; drive stays behind it', () => {
  const { showcaseCameraPose: pose } = camera;
  for (const id of [...Object.keys(RACE_TRACKS), 'future-track']) {
    for (const portrait of [false, true]) {
      for (const [view, expected] of Object.entries({ rear: 0, right: 90, front: 180, left: -90 })) {
        const gap = Math.abs(wrap(bearing(pose(id, view, 0, portrait)) - expected));
        assert.ok(gap < 1e-6, `${id}/${view}/portrait ${portrait}: bearing off by ${gap}°`);
      }
      assert.ok(Math.abs(bearing(pose(id, 'drive', 0, portrait))) < 90, `${id}/drive/portrait ${portrait}`);
    }
  }
});

test('orbit turns at a steady .18 rad/s on a constant 9 m radius, a full 360° within 40 s', () => {
  const { showcaseCameraPose: pose } = camera;
  const perStep = .25 * .18 * 180 / Math.PI;
  for (const id of [...Object.keys(RACE_TRACKS), 'future-track']) {
    for (const portrait of [false, true]) {
      let turned = 0, previous = bearing(pose(id, 'orbit', 0, portrait));
      for (let step = 1; step <= 160; step++) { // 0.25 s samples over 40 s
        const p = pose(id, 'orbit', step * .25, portrait), now = bearing(p), delta = wrap(now - previous);
        assert.ok(Math.abs(delta - perStep) < 1e-6, `${id}/portrait ${portrait}: step ${step} turned ${delta}°`);
        assert.ok(Math.abs(Math.hypot(p.cameraSide, p.cameraBack) - 9) < 1e-9, `${id}/portrait ${portrait}: radius at step ${step}`);
        turned += delta;
        previous = now;
      }
      assert.ok(turned >= 360, `${id}/portrait ${portrait}: turned ${turned.toFixed(0)}°`);
    }
  }
});
