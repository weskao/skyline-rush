import test from 'node:test';
import assert from 'node:assert/strict';
import { pickupVisibilityScale, pickupTargetPixels } from '../src/pickup-visibility.js';

test('near pickups retain their authored size; mid-range compensation is smooth and bounded', () => {
  const scale = depth => pickupVisibilityScale(depth, 320, 2, 28, 1.65);
  assert.equal(scale(0), 1);
  assert.equal(scale(30), 1);
  assert.ok(scale(60) > 1 && scale(60) < 1.65);
  assert.ok(scale(100) >= scale(60));
  assert.equal(scale(900), 1.65);
  assert.ok(Math.abs(scale(30.01) - scale(30)) < .001);
  assert.ok(Math.abs(scale(99.99) - scale(100)) < .001);
});

test('CSS viewport and projection control visibility independently of render quality and DPR', () => {
  assert.equal(pickupTargetPixels(.6, 844), 24);
  assert.equal(pickupTargetPixels(1.8, 390), 28);
  assert.equal(pickupTargetPixels(1.5, 768), 24);
  assert.ok(pickupVisibilityScale(75, 300, 2, 28, 1.65) > pickupVisibilityScale(75, 900, 2, 24, 1.65));
  assert.equal(pickupVisibilityScale(120, 0, 2, 24, 1.65), 1);
  assert.equal(pickupVisibilityScale(NaN, 320, 2, 24, 1.65), 1);
  assert.equal(pickupVisibilityScale(-100, 320, 2, 24, 1.65), 1);
});

test('a bounded halo can remain more visible than the model at long range', () => {
  assert.equal(pickupVisibilityScale(500, 320, 3, 28, 2.5), 2.5);
  assert.ok(pickupVisibilityScale(150, 320, 3, 28, 2.5) >= 1.65);
});

test('projected pickup and halo never shrink as a fixed camera approaches', () => {
  // Sweep all practical silhouette sizes, viewport/FOV scales and model/halo caps.
  for (const pixelsPerMetre of [180, 320, 600, 1100]) {
    for (const worldSize of [1.4, 2, 3, 5, 8]) {
      for (const [target, cap] of [[24, 1.65], [28, 1.65], [43.2, 2.5], [50.4, 2.5]]) {
        let previous = 0;
        for (let depth = 900; depth >= 5; depth -= .5) {
          const projected = pixelsPerMetre * worldSize * pickupVisibilityScale(depth, pixelsPerMetre, worldSize, target, cap) / depth;
          assert.ok(projected >= previous - 1e-9, `shrinks at ${depth} m: ${previous} -> ${projected} px (${pixelsPerMetre}, ${worldSize}, ${target}, ${cap})`);
          previous = projected;
        }
      }
    }
  }
});
