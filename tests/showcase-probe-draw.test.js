import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldDrawShowcaseFrame } from './fixtures/showcase-probe-draw.js';

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
