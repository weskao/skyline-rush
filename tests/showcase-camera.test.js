import test from 'node:test';
import assert from 'node:assert/strict';
import * as camera from '../src/track-preview.js';
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

test('portrait and landscape preview distances stay appropriate for the home showcase', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    const landscape = camera.showcaseCameraPose(id, 'drive', 0, false);
    const portrait = camera.showcaseCameraPose(id, 'drive', 0, true);
    assert.ok(landscape.cameraBack > 9, id);
    assert.ok(portrait.cameraBack >= landscape.cameraBack, id);
  }
});
