// Task 5b step 8: the Neon Downtown `?look=3d` look is art only. The course frame, lanes, tunnel extents, the
// shortcut, the ring and pickup layout and the gameplay props below are pinned at layout 7: the closed clockwise
// loop of step 1b (owner decision N7, 2026-11-14), which replaced the layout-6 open road for every look. A
// deliberate layout change bumps `layoutVersion` and updates this file in the same commit; an art change that
// turns one of these red has moved gameplay and is wrong.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRace } from '../src/game.js';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { classicRoadRoute } from '../src/classic-road-routes.ts';
import { CLASSIC_THEMED_PLACEMENTS } from '../src/track-themes-classic.ts';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

test('Neon keeps its length, the rail underpass and the shortcut after it', () => {
  const { length, seed, layoutVersion, sections } = RACE_TRACKS.neon;
  assert.deepEqual({ length, seed, layoutVersion }, { length: 4000, seed: 2002, layoutVersion: 7 });
  assert.deepEqual(sections, [
    { from: 470, to: 690, type: 'tunnel' }, { from: 1150, to: 1650, type: 'shortcut', x: 7.5, altitude: 6 },
  ]);
});

test('the Neon course frame is where it was: centre line and heading every 50 m', () => {
  const road = classicRoadRoute('neon'), frame = [];
  for (let d = 0; d <= 4000; d += 50) frame.push(road.point(d).map(v => +v.toFixed(3)), +road.heading(d).toFixed(5));
  assert.deepEqual(road.point(4000).map(v => +v.toFixed(3)), [0, 0], 'the finish line is the start line');
  assert.equal(sha(frame), 'c5c7cd99904d21c6');
});

test('a Neon race has the same four lanes, rings and pickups', () => {
  const race = createRace('neon');
  assert.deepEqual([...new Set(race.traffic.map(car => car.homeX))].sort((a, b) => a - b), [-7.5, -2.5, 2.5, 7.5]);
  // Step 10 (owner brief, 2026-11-15): five authored sector lines (34 rings) replace the random rings across their
  // spans, so 98 rings (a41b116b654c6772) became 67. Pickups did not move. Layout 7 never shipped, so it stays 7.
  assert.equal(race.rings.length, 67);
  assert.equal(sha(race.rings.map(r => [r.distance, r.x, r.altitude, r.radius, r.type])), 'ebf031e91b3b1ade', 'ring layout');
  assert.equal(race.pickups.length, 163);
  assert.equal(sha(race.pickups.map(p => [p.distance, p.x, p.altitude, p.tier])), '242e47c4fbcaeb56', 'pickup layout');
});

test('the Neon gameplay props stay put: barriers, gates, closures and the branch marker', () => {
  const props = CLASSIC_THEMED_PLACEMENTS.neon;
  assert.deepEqual(props.filter(p => p.type !== 'cone').map(p => [p.id, p.type, p.distance, p.lateralOffset]), [
    ['neon-works-1', 'barrier', 760, 4.6], ['neon-works-2', 'barrier', 2520, -4.6], ['neon-branch-1', 'branch-marker', 2600, 0],
    ['neon-gate-1', 'gate', 2700, 4.6], ['neon-works-3', 'barrier', 3600, -4.6], ['neon-gate-2', 'gate', 3720, -4.6],
  ]);
  assert.deepEqual(props.filter(p => p.type === 'cone').map(p => [p.distance, p.lateralOffset]), [
    ...[2380, 2392, 2404, 2416, 2428, 2440].map(d => [d, -7.5]), ...[3480, 3492, 3504, 3516, 3528, 3540].map(d => [d, 7.5]),
  ]);
  assert.equal(sha(props), 'e8f6e9b4a58b44ef', 'trigger windows, movement and seeds');
});
