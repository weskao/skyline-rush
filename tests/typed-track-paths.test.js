import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RACE_TRACKS } from '../src/game.js';

test('all ten course coordinates and HUD route projections use one strict typed path service', async () => {
  assert.equal(existsSync(new URL('../src/track-paths.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/track-paths.js', import.meta.url)), false);
  const { trackPoint, trackFrame, trackLocalPosition, trackOverview } = await import('../src/track-paths.ts');
  for (const [id, track] of Object.entries(RACE_TRACKS)) {
    const first = trackPoint(id, 0);
    assert.deepEqual(trackPoint(id, -999), first);
    assert.deepEqual(trackPoint(id, NaN), first);
    assert.deepEqual(trackPoint(id, track.length + 1), trackPoint(id, track.length));
    for (const d of [0, track.length / 4, track.length / 2, track.length]) {
      const frame = trackFrame(id, d);
      for (const axis of [frame.right, frame.up, frame.forward]) {
        assert.equal(axis.length, 3);
        assert.ok(axis.every(Number.isFinite));
        assert.ok(Math.abs(Math.hypot(...axis) - 1) < 1e-6, id + ' @' + d);
      }
      assert.deepEqual(trackLocalPosition(id, d, 0, 0, d), [0, 0, 0]);
    }
    const overview = trackOverview(id, 40);
    assert.equal(overview.length, 40);
    assert.ok(overview.every(p => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));
  }
  assert.throws(() => trackPoint('missing-course', 2), /Unknown track/);
  assert.throws(() => trackOverview('missing-course'), /Unknown track/);
});
