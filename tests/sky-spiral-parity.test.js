// Task 8c step 1: the Sky Spiral detailed look is art only. The route was measured at 10 km on 2026-11-19, inside
// the 8-12 km art target (owner decision), so it is frozen as it shipped at layout 7: frame, lanes, sections, rings,
// pickups and gameplay props are pinned here. A deliberate layout change bumps `layoutVersion` (and the cloud-save
// ids in firestore.rules) and updates this file in the same commit; an art change that turns one of these red has
// moved gameplay and is wrong.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRace } from '../src/game.js';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { skyFrame, SKY_JUMPS, SKY_LENGTH, SKY_SPIRAL } from '../src/sky-track.ts';
import { CLASSIC_THEMED_PLACEMENTS } from '../src/track-themes-classic.ts';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

test('Sky Spiral keeps its length, helix, launches and shortcut', () => {
  const { length, seed, layoutVersion, sections } = RACE_TRACKS.spiral;
  assert.deepEqual({ length, seed, layoutVersion }, { length: 10000, seed: 5005, layoutVersion: 7 });
  assert.equal(SKY_LENGTH, 10000);
  assert.deepEqual({ start: SKY_SPIRAL.start, end: SKY_SPIRAL.end, rise: SKY_SPIRAL.rise }, { start: 1850, end: 3250, rise: 104 });
  assert.deepEqual(SKY_JUMPS.map(j => [j.rampFrom, j.rampTo, j.gapFrom, j.gapTo]), [[4650, 4720, 4720, 4785], [5550, 5625, 5625, 5690], [6350, 6430, 6430, 6500]]);
  assert.deepEqual(sections, [
    { from: 1850, to: 3250, type: 'spiral' },
    { from: 4650, to: 4720, type: 'launch' }, { from: 4720, to: 4785, type: 'gap' },
    { from: 5550, to: 5625, type: 'launch' }, { from: 5625, to: 5690, type: 'gap' },
    { from: 6350, to: 6430, type: 'launch' }, { from: 6430, to: 6500, type: 'gap' },
    { from: 7220, to: 7720, type: 'shortcut', x: -7.5, altitude: 6 },
  ]);
});

test('the Sky Spiral road frame is where it was: point and axes every 50 m', () => {
  const frame = [];
  for (let d = 0; d <= SKY_LENGTH; d += 50) {
    const { point, forward, right, up } = skyFrame(d);
    frame.push([point.x, point.y, point.z].map(v => +v.toFixed(3)), [...forward, ...right, ...up].map(v => +v.toFixed(5)));
  }
  assert.equal(sha(frame), '0581b1d0e3c5d6f9');
});

test('a Sky Spiral race has the same four lanes, rings and pickups', () => {
  const race = createRace('spiral');
  assert.deepEqual([...new Set(race.traffic.map(car => car.homeX))].sort((a, b) => a - b), [-7.5, -2.5, 2.5, 7.5]);
  assert.equal(race.rings.length, 147);
  assert.equal(sha(race.rings.map(r => [r.distance, r.x, r.altitude, r.radius, r.type])), '3138d7e9c493ea38', 'ring layout');
  assert.equal(race.pickups.length, 273);
  assert.equal(sha(race.pickups.map(p => [p.distance, p.x, p.altitude, p.tier])), 'a1fb530330e4d974', 'pickup layout');
});

test('the Sky Spiral gameplay props stay put: hoops, barriers and gates', () => {
  const props = CLASSIC_THEMED_PLACEMENTS.spiral;
  assert.deepEqual(props.map(p => [p.id, p.type, p.distance, p.lateralOffset]), [
    ['spiral-hoop-1', 'ring', 1930, 2.5], ['spiral-hoop-2', 'ring', 2550, -2.5], ['spiral-hoop-3', 'ring', 3120, 2.5],
    ['spiral-hoop-4', 'ring', 3450, -2.5], ['spiral-hoop-5', 'ring', 4350, 0],
    ['spiral-barrier-1', 'energy-barrier', 700, -2.5], ['spiral-gate-1', 'gate', 1500, 4.6], ['spiral-gate-2', 'gate', 1900, -4.6],
    ['spiral-barrier-2', 'energy-barrier', 2500, 2.5], ['spiral-barrier-3', 'energy-barrier', 3300, -2.5], ['spiral-gate-3', 'gate', 8230, 2.5],
  ]);
  assert.equal(sha(props), 'be89b77c4cd708a0', 'trigger windows, movement and seeds');
});
