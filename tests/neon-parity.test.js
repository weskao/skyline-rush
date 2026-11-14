// Task 5b step 8: the Neon Downtown `?look=3d` look is art only. The course frame, lanes, tunnel extents, the
// shortcut, the ring and pickup layout and the gameplay props below were pinned at layout 6, before any Neon asset
// landed. A deliberate layout change bumps `layoutVersion` and updates this file in the same commit; an art change
// that turns one of these red has moved gameplay and is wrong.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRace } from '../src/game.js';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { classicRoadRoute } from '../src/classic-road-routes.ts';
import { CLASSIC_THEMED_PLACEMENTS } from '../src/track-themes-classic.ts';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

test('Neon keeps its length, three tunnels and the shortcut between the first two', () => {
  const { length, seed, layoutVersion, sections } = RACE_TRACKS.neon;
  assert.deepEqual({ length, seed, layoutVersion }, { length: 4000, seed: 2002, layoutVersion: 6 });
  assert.deepEqual(sections, [
    { from: 600, to: 1100, type: 'tunnel' }, { from: 1150, to: 1650, type: 'shortcut', x: 7.5, altitude: 6 },
    { from: 1700, to: 2300, type: 'tunnel' }, { from: 2900, to: 3400, type: 'tunnel' },
  ]);
});

test('the Neon course frame is where it was: centre line and heading every 50 m', () => {
  const road = classicRoadRoute('neon'), frame = [];
  for (let d = 0; d <= 4000; d += 50) frame.push(road.point(d).map(v => +v.toFixed(3)), +road.heading(d).toFixed(5));
  assert.deepEqual(road.point(4000).map(v => +v.toFixed(3)), [70.612, -3598.303], 'finish line');
  assert.equal(sha(frame), '2b33e401c6171511');
});

test('a Neon race has the same four lanes, rings and pickups', () => {
  const race = createRace('neon');
  assert.deepEqual([...new Set(race.traffic.map(car => car.homeX))].sort((a, b) => a - b), [-7.5, -2.5, 2.5, 7.5]);
  assert.equal(race.rings.length, 69);
  assert.equal(sha(race.rings.map(r => [r.distance, r.x, r.altitude, r.radius, r.type])), '3567dca7964f12f9', 'ring layout');
  assert.equal(race.pickups.length, 163);
  assert.equal(sha(race.pickups.map(p => [p.distance, p.x, p.altitude, p.tier])), 'e321b813c90b8e8a', 'pickup layout');
});

test('the Neon gameplay props stay put: barriers, gates, closures and the branch marker', () => {
  const props = CLASSIC_THEMED_PLACEMENTS.neon;
  assert.deepEqual(props.filter(p => p.type !== 'cone').map(p => [p.id, p.type, p.distance, p.lateralOffset]), [
    ['neon-works-1', 'barrier', 500, 4.6], ['neon-works-2', 'barrier', 2520, -4.6], ['neon-branch-1', 'branch-marker', 2600, 0],
    ['neon-gate-1', 'gate', 2700, 4.6], ['neon-works-3', 'barrier', 3600, -4.6], ['neon-gate-2', 'gate', 3720, -4.6],
  ]);
  assert.deepEqual(props.filter(p => p.type === 'cone').map(p => [p.distance, p.lateralOffset]), [
    ...[2380, 2392, 2404, 2416, 2428, 2440].map(d => [d, -7.5]), ...[3480, 3492, 3504, 3516, 3528, 3540].map(d => [d, 7.5]),
  ]);
  assert.equal(sha(props), 'ba8e203ad46c7b8f', 'trigger windows, movement and seeds');
});
