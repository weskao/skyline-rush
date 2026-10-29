import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HERO_PREVIEWS, isCuratedPreview, previewPlayer, previewRival, showcaseCameraPose } from '../src/track-preview.ts';

test('every preview mode is defined by one strict TypeScript service without shadow JS', () => {
  assert.equal(existsSync(new URL('../src/track-preview.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/track-preview.js', import.meta.url)), false);
  assert.deepEqual(Object.keys(HERO_PREVIEWS).sort(), ['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic', 'harbor-circuit'].sort());
  const player = { x: 2, altitude: 1, thrusting: true, speed: 50 };
  const grounded = previewPlayer('future-road', player, 7, false, true);
  assert.equal(grounded.altitude, 0);
  assert.equal(grounded.thrusting, false);
  assert.equal(player.altitude, 1, 'preview may not mutate the game player');
  assert.equal(isCuratedPreview('tokyo'), true);
  assert.equal(isCuratedPreview('future-road'), false);
  assert.deepEqual(showcaseCameraPose('tokyo', 'unknown'), showcaseCameraPose('tokyo', 'drive'));
  const remote = previewRival('future-road', 0, { distance: 100, altitude: 0 });
  assert.equal(remote.distance, 375);
  assert.equal(remote.altitude, 5);
});
