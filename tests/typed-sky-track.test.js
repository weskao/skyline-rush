import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('Sky Spiral path geometry has a single typed source and frame math stays continuous', async () => {
  assert.equal(existsSync(new URL('../src/sky-track.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/sky-track.js', import.meta.url)), false);
  const { skyPoint, skyFrame, skyPosition, skyGapAt, SKY_JUMPS, SKY_LENGTH } = await import('../src/sky-track.ts');
  const expected = SKY_JUMPS.map(x => [x.gapFrom, x.gapTo]);
  assert.deepEqual(expected, [[4720, 4880], [5625, 5790], [6430, 6600]]);
  for (let d = 0; d < SKY_LENGTH; d += 41) {
    const frame = skyFrame(d);
    for (const v of [frame.right, frame.up, frame.forward]) {
      assert.equal(v.length, 3);
      assert.ok(v.every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-8);
    }
    const p = skyPoint(d), atCenter = skyPosition(d, 0, 0, 0);
    assert.ok(Math.hypot(...atCenter.map((x, i) => x - [p.x, p.y, p.z][i])) < 1e-8);
  }
  for (const { gapFrom, gapTo } of SKY_JUMPS) {
    assert.equal(skyGapAt(gapFrom - .001), false);
    assert.equal(skyGapAt(gapFrom), true);
    assert.equal(skyGapAt(gapTo), false);
  }
});
