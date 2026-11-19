// The cloud sea's noise map (src/cloud-noise.ts) is generated at run time: it must be the same map on every device,
// wrap without a seam (the sea repeats it every 2,048 m) and carry slopes that agree with its heights (the shader
// lights the clouds from the slope channels alone).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudNoise, CLOUD_SLOPE } from '../src/cloud-noise.ts';

const SIZE = 256, map = cloudNoise(SIZE);
const at = (column, row, channel = 0) => map[((row + SIZE) % SIZE * SIZE + (column + SIZE) % SIZE) * 4 + channel];

test('the cloud noise is deterministic and uses the whole range of both billow channels', () => {
  assert.equal(map.length, SIZE * SIZE * 4);
  assert.deepEqual(cloudNoise(SIZE), map);
  for (const channel of [0, 3]) {
    let low = 255, high = 0;
    for (let i = channel; i < map.length; i += 4) { low = Math.min(low, map[i]); high = Math.max(high, map[i]); }
    assert.deepEqual([low, high], [0, 255], `channel ${channel}`);
  }
});

test('the cloud noise wraps without a seam', () => {
  let interior = 0, seam = 0;
  for (let row = 0; row < SIZE; row++) for (let column = 0; column < SIZE - 1; column++) {
    interior = Math.max(interior, Math.abs(at(column + 1, row) - at(column, row)), Math.abs(at(row, column + 1) - at(row, column)));
  }
  for (let i = 0; i < SIZE; i++) seam = Math.max(seam, Math.abs(at(0, i) - at(SIZE - 1, i)), Math.abs(at(i, 0) - at(i, SIZE - 1)));
  assert.ok(seam <= interior, `the step across the edge (${seam}) is no larger than a step inside the map (${interior})`);
});

test('the slope channels are the height channel\'s own slope, unclipped', () => {
  let worst = 0;
  for (let row = 0; row < SIZE; row++) for (let column = 0; column < SIZE; column++) {
    for (const [channel, dx, dy] of [[1, 1, 0], [2, 0, 1]]) {
      const stored = at(column, row, channel);
      assert.ok(stored > 0 && stored < 255, `slope clipped at ${column},${row}`);
      const slope = (stored / 255 - .5) / CLOUD_SLOPE, measured = (at(column + dx, row + dy) - at(column - dx, row - dy)) / 510;
      worst = Math.max(worst, Math.abs(slope - measured));
    }
  }
  assert.ok(worst < .004, `largest disagreement ${worst}`);
});
