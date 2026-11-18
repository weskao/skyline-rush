import test from 'node:test';
import assert from 'node:assert/strict';
import { skyPoint, skyFrame, skyPosition, SKY_LENGTH, SKY_SPIRAL, SKY_JUMPS } from '../src/sky-track.ts';

const { start, end, rise } = SKY_SPIRAL, length = end - start;
const entry = lap => lap * SKY_LENGTH + (lap % 2 ? SKY_LENGTH - end : start);
const delta = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test('Sky Spiral Endless shares the sprint centreline and repeats the elevated helix', () => {
  for (const d of [0, start, end, SKY_JUMPS[0].gapFrom, SKY_LENGTH]) assert.deepEqual(skyPoint(d, true), skyPoint(d));
  for (const lap of [0, 1, 10, 100]) {
    const at = entry(lap);
    const a = skyPoint(at, true), middle = skyPoint(at + length / 2, true), b = skyPoint(at + length, true);
    assert.ok((middle.x - a.x) * (lap % 2 ? -1 : 1) > 300);
    assert.ok(middle.y > a.y + 40);
    assert.ok(Math.hypot(b.x - a.x, b.z - a.z) < .02);
    assert.ok(Math.abs(b.y - a.y - rise) < 1e-6);
    for (const boundary of [at, at + length]) {
      assert.ok(delta(skyPoint(boundary - .01, true), skyPoint(boundary + .01, true)) < .05);
      const f = skyFrame(boundary, true);
      assert.ok(f.forward.every(Number.isFinite) && f.up.every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(...f.right) - 1) < .001);
    }
  }
});

test('Endless Sky Spiral frames use the extended road centre at every helix turn', () => {
  for (const lap of [0, 1, 20, 100]) {
    for (const d of [entry(lap) + 10, entry(lap) + length / 3, entry(lap) + length - 10]) {
      assert.ok(delta(skyFrame(d, true).point, skyPoint(d, true)) < 1e-9);
      assert.ok(Math.hypot(...skyPosition(d, 0, 0, d, true)) < 1e-8);
      assert.ok(delta(skyFrame(d).point, skyPoint(d)) < 1e-9);
    }
  }
});

test('Sky Spiral Endless retains the lateral sweepers between elevated loops', () => {
  for (const lap of [1, 2, 100]) {
    const s = lap * SKY_LENGTH + (lap % 2 ? SKY_LENGTH - 7700 : 7700);
    const a = skyPoint(s - 150, true), b = skyPoint(s + 150, true);
    assert.ok(Math.abs(a.x - b.x) > 120);
  }
});
