import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

// These public UI helpers must remain behavior-compatible as TypeScript replaces
// their JavaScript implementations. The source file gate is RED until migration.
test('typed photo export keeps pixel orientation, FOV bounds and safe filenames', async () => {
  assert.ok(existsSync(new URL('../src/photo-export.ts', import.meta.url)), 'photo export must have a TypeScript implementation');
  const { flipRgbaRows, photoFov, photoFilename } = await import('../src/photo-export.ts');
  assert.deepEqual([...flipRgbaRows(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), 1, 2)], [5, 6, 7, 8, 1, 2, 3, 4]);
  assert.equal(photoFov(Infinity), 58);
  assert.equal(photoFov(20), 35);
  assert.equal(photoFilename('../invalid', new Date('2026-10-22T08:09:10Z')), 'skyline-rush-race-20261022-080910.png');
  assert.equal(existsSync(new URL('../src/photo-export.js', import.meta.url)), false, 'do not ship duplicate source');
});

test('typed swipe math preserves short drags, flicks and the velocity window', async () => {
  assert.ok(existsSync(new URL('../src/track-swipe.ts', import.meta.url)), 'swipe gesture calculations must use TypeScript');
  const { swipeAxis, swipeStep, addSwipeSample, releaseVelocity } = await import('../src/track-swipe.ts');
  assert.equal(swipeAxis(-12, 5), 'x');
  assert.equal(swipeStep(-40, 0, 390), 0);
  assert.equal(swipeStep(-40, -0.8, 390), 1);
  const samples = [];
  for (const [time, x] of [[0, 300], [300, 200], [350, 150], [400, 100]]) addSwipeSample(samples, time, x);
  assert.equal(releaseVelocity(samples, 400), -1);
  assert.equal(releaseVelocity(samples, 700), 0);
  assert.equal(existsSync(new URL('../src/track-swipe.js', import.meta.url)), false, 'do not ship duplicate source');
});
