// Task 5b step 8: the Neon Downtown `?look=3d` look is art only. The course frame, lanes, tunnel extents, the
// shortcut, the ring and pickup layout and the gameplay props below are pinned at layout 7: the closed clockwise
// loop of step 1b (owner decision N7, 2026-11-14), which replaced the layout-6 open road for every look, at the
// 10 km of the owner's 2026-11-15 amendment (one lap, eight sectors; layout 7 never shipped, so it stays 7). A
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
  assert.deepEqual({ length, seed, layoutVersion }, { length: 10000, seed: 2002, layoutVersion: 7 });
  assert.deepEqual(sections, [
    { from: 690, to: 910, type: 'tunnel' }, { from: 2200, to: 2700, type: 'shortcut', x: 7.5, altitude: 6 },
    { from: 4500, to: 5300, type: 'crosswind', dir: 1 }, { from: 8290, to: 8750, type: 'shortcut', x: -7.5, altitude: 6 },
  ]);
});

test('the Neon course frame is where it was: centre line and heading every 50 m', () => {
  const road = classicRoadRoute('neon'), frame = [];
  for (let d = 0; d <= 10000; d += 50) frame.push(road.point(d).map(v => +v.toFixed(3)), +road.heading(d).toFixed(5));
  assert.deepEqual(road.point(10000).map(v => +v.toFixed(3)), [0, 0], 'the finish line is the start line');
  assert.equal(sha(frame), 'd19bdc7fa0923e8e'); // 4 km lap: c5c7cd99904d21c6
});

test('a Neon race has the same four lanes, rings and pickups', () => {
  const race = createRace('neon');
  assert.deepEqual([...new Set(race.traffic.map(car => car.homeX))].sort((a, b) => a - b), [-7.5, -2.5, 2.5, 7.5]);
  // Step 10 (owner brief, 2026-11-15): five authored sector lines (34 rings) replace the random rings across their
  // spans, so 98 rings (a41b116b654c6772) became 67. Pickups did not move. Layout 7 never shipped, so it stays 7.
  // 10 km lap (2026-11-15): 2.5 times the slots on 2.5 times the road and the five lines at their new lap metres,
  // 67 rings (ebf031e91b3b1ade) became 190, 163 pickups (242e47c4fbcaeb56) became 375.
  assert.equal(race.rings.length, 190);
  assert.equal(sha(race.rings.map(r => [r.distance, r.x, r.altitude, r.radius, r.type])), 'f650b0fc26092d8b', 'ring layout');
  assert.equal(race.pickups.length, 375);
  assert.equal(sha(race.pickups.map(p => [p.distance, p.x, p.altitude, p.tier])), 'a5fb40d8f56d59ef', 'pickup layout');
});

test('the Neon gameplay props stay put: barriers, gates, closures and the branch marker', () => {
  const props = CLASSIC_THEMED_PLACEMENTS.neon;
  assert.deepEqual(props.filter(p => p.type !== 'cone').map(p => [p.id, p.type, p.distance, p.lateralOffset]), [
    ['neon-works-1', 'barrier', 980, 4.6], ['neon-gate-4', 'gate', 1850, 4.6], ['neon-works-2', 'barrier', 6362, -4.6],
    ['neon-branch-1', 'branch-marker', 6442, 0], ['neon-gate-1', 'gate', 6542, 4.6], ['neon-works-4', 'barrier', 6880, 4.6],
    ['neon-gate-3', 'gate', 7813, -4.6], ['neon-works-3', 'barrier', 9600, -4.6], ['neon-gate-2', 'gate', 9720, -4.6],
  ]);
  assert.deepEqual(props.filter(p => p.type === 'cone').map(p => [p.distance, p.lateralOffset]), [
    ...[3950, 3962, 3974, 3986, 3998, 4010].map(d => [d, -7.5]), ...[6040, 6052, 6064, 6076, 6088, 6100].map(d => [d, -7.5]),
    ...[9480, 9492, 9504, 9516, 9528, 9540].map(d => [d, 7.5]),
  ]);
  assert.equal(sha(props), '2e9e08e0760448d2', 'trigger windows, movement and seeds'); // 4 km lap: e8f6e9b4a58b44ef
});
