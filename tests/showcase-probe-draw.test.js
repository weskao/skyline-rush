import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldDrawShowcaseFrame, untilDrawn } from './fixtures/showcase-probe-draw.js';

// world.render() returns false while the model or scenery still loads (graphics-first-frame); a probe that renders in one
// synchronous loop never lets those loads finish, so it read a camera that never drew.
test('a probe waits across frames until the world really draws', async () => {
  const answers = [false, false, true];
  let calls = 0, frames = 0;
  await untilDrawn(() => answers[calls++], 10, () => { frames++; return Promise.resolve(); });
  assert.equal(calls, 3);
  assert.equal(frames, 2);
});

test('a world that never draws fails the probe instead of reading a stale camera', async () => {
  await assert.rejects(untilDrawn(() => false, 3, () => Promise.resolve()), /never drew/);
});

test('orbit camera checks draw only sampled frames plus the final frame', () => {
  const draws = Array.from({ length: 1246 }, (_, frame) => frame)
    .filter(frame => shouldDrawShowcaseFrame(frame, 1245, 8));
  assert.deepEqual(draws.slice(0, 4), [0, 8, 16, 24]);
  assert.equal(draws.at(-1), 1245);
  assert.equal(draws.length, 157);
});

test('fixed camera checks still render the final WebGL frame', () => {
  const draws = Array.from({ length: 61 }, (_, frame) => frame)
    .filter(frame => shouldDrawShowcaseFrame(frame, 60, 0));
  assert.deepEqual(draws, [60]);
});

test('a sample stride of one renders each frame', () => {
  assert.deepEqual([0, 1, 2].filter(frame => shouldDrawShowcaseFrame(frame, 2, 1)), [0, 1, 2]);
});
