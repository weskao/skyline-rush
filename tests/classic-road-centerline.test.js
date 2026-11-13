import test from 'node:test';
import assert from 'node:assert/strict';
import { trackPoint, trackFrame, trackOverview } from '../src/track-paths.ts';
import { RACE_TRACKS } from '../src/game.js';

// Unbounded renderer chunks (behind the start / beyond the finish) must have
// the same lateral curve as the simulation and the sampled route map.
test('classic minimaps project the sampled road without replacing its turns', () => {
  for (const id of ['coast', 'neon', 'canyon', 'aurora']) {
    const overview = trackOverview(id, 128);
    assert.deepEqual([overview[0].distance, overview.at(-1).distance], [0, RACE_TRACKS[id].length]);
    for (let i = 1; i < overview.length; i++) {
      const previous = trackPoint(id, overview[i - 1].distance);
      const point = trackPoint(id, overview[i].distance);
      assert.ok(Math.abs(point.x - previous.x) < 1e-7 ||
        Math.sign(point.x - previous.x) === Math.sign(overview[i].x - overview[i - 1].x), id);
    }
  }
});

test('vehicle-facing road frames stay finite and continuous across the five original courses', () => {
  for (const id of ['coast', 'neon', 'canyon', 'aurora', 'spiral']) {
    const len=RACE_TRACKS[id].length;
    for (const distance of [0, 320, 1099.9, 1100, 1100.1, 1650, 2199.9, 2200, 2200.1, len-1, len]) {
      const f=trackFrame(id,distance);
      assert.ok(Number.isFinite(f.point.x) && Number.isFinite(f.point.y));
      for (const axis of ['forward','right','up']) {
        const v=f[axis];assert.ok(v.every(Number.isFinite), id + axis);
        assert.ok(Math.abs(Math.hypot(...v)-1) < 1e-6,id + ' ' + axis);
      }
      assert.ok(Math.abs(f.forward.reduce((acc,n,i)=>acc+n*f.right[i],0))<1e-6);
    }
  }
});
