import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classicRoadCenter, trackPoint, trackFrame, trackOverview } from '../src/track-paths.ts';
import { RACE_TRACKS } from '../src/game.js';

// Unbounded renderer chunks (behind the start / beyond the finish) must have
// the same lateral curve as the simulation and the sampled route map.
test('first four classic roads have exactly one centreline for renderer and map', () => {
  const renderer = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(renderer, /const roadCenter = classicRoadCenter;/);
  for (const id of ['coast', 'neon', 'canyon', 'aurora']) {
    for (const distance of [0, 60, 600, 1100, 1650, RACE_TRACKS[id].length]) {
      const point = trackPoint(id, distance);
      assert.ok(Math.abs(point.x-classicRoadCenter(distance)) < 1e-10, id);
      assert.equal(point.y, 0);
    }
    const overview = trackOverview(id, 128);
    assert.equal(overview.length, 128);
    assert.deepEqual([overview[0].distance, overview.at(-1).distance],[0,RACE_TRACKS[id].length]);
  }
  for (const distance of [-120, -1, 0, 5000, 6000, 8000]) {
    assert.ok(Number.isFinite(classicRoadCenter(distance)), 'renderer off-track chunks stay finite');
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
