import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace, startRace, stepRace, RACE_TRACKS, LANES, ROAD_LIMIT, CAR_HEIGHT, TUNNEL_CEILING, GAP_CLEARANCE } from '../src/game.js';
import { TRAIN_SPACING } from '../src/ring-layout.ts';

// Stage 2 (user, 2026-11-02): far more rings and pickups on every track and mode, full-width rows and dense trains.
const STAGE1 = JSON.parse(readFileSync(new URL('../scripts/pickup-economy-stage1.json', import.meta.url), 'utf8'));
const TRACKS = [...Object.keys(RACE_TRACKS).map(id => [id, undefined]), ['harbor-circuit', { mode: 'circuit', laps: 3 }]];
const key = (id, options) => options ? `circuit/normal/${id}` : `classic/normal/${id}`;
const rowsOf = rings => Object.values(Object.groupBy(rings.filter(r => r.row !== undefined), r => `${r.lap ?? 0}:${r.row}`));
const trainsOf = rings => Object.values(Object.groupBy(rings.filter(r => r.train), r => r.group));

test('D2: every track carries at least 1.8x the stage-1 rings and pickups', () => {
  for (const [id, options] of TRACKS) {
    const race = createRace(id, options), before = STAGE1[key(id, options)];
    assert.ok(race.rings.length >= before.rings * 1.8, `${id} rings ${before.rings} -> ${race.rings.length}`);
    assert.ok(race.pickups.length >= before.pickups * 1.8, `${id} pickups ${before.pickups} -> ${race.pickups.length}`);
  }
});

test('D2: a full-width row puts a ring on every lane, low enough that any road line passes one', () => {
  for (const [id, options] of TRACKS) {
    const rows = rowsOf(createRace(id, options).rings);
    assert.ok(rows.length >= 2, `${id} has rows`);
    for (const row of rows) {
      assert.deepEqual(row.map(r => r.x), LANES, `${id} row @${row[0].distance}`);
      assert.ok(row.every(r => r.distance === row[0].distance && r.altitude === row[0].altitude && r.type === row[0].type && r.type !== 'risk'));
      for (let x = -ROAD_LIMIT; x <= ROAD_LIMIT; x += 0.1) {
        assert.ok(row.some(r => Math.hypot(r.x - x, r.altitude) < r.radius), `${id} row @${row[0].distance} misses a car on the road at x ${x.toFixed(1)}`);
      }
    }
  }
});

// A dense train is one PERFECT LINE group of its own: every ring in it is a gate, so the bonus needs the whole run.
test('D2: a dense train is a straight run of closely spaced charge/nitro rings forming its own group', () => {
  for (const [id, options] of TRACKS) {
    const rings = createRace(id, options).rings, trains = trainsOf(rings);
    assert.ok(trains.length >= 1, `${id} has a train`);
    for (const train of trains) {
      assert.ok(train.length >= 4, `${id} train length ${train.length}`);
      assert.ok(train.every((r, i) => r.x === train[0].x && (i === 0 || r.distance - train[i - 1].distance === TRAIN_SPACING)), `${id} train @${train[0].distance}`);
      assert.ok(train.every(r => r.type === 'charge' || r.type === 'nitro'), `${id} train types`);
      assert.equal(rings.filter(r => r.group === train[0].group).length, train.length, `${id} the train is its own group`);
      assert.ok(train.every(r => r.groupSize === train.length));
    }
  }
});

test('D2: every group counts a full-width row as one gate', () => {
  for (const [id, options] of TRACKS) {
    const groups = Object.values(Object.groupBy(createRace(id, options).rings, r => r.group));
    for (const group of groups) {
      const gates = new Set(group.map(r => r.row !== undefined ? `row${r.row}` : r)).size;
      assert.ok(group.every(r => r.groupSize === gates), `${id} group ${group[0].group}: groupSize ${group[0].groupSize} vs ${gates} gates`);
    }
  }
});

// Drives the player through one ring of each gate in `gates` (skipping `skip`) and reports what the race paid.
function driveGates(id, gates, skip = -1) {
  const race = createRace(id);
  startRace(race); race.phase = 'racing'; race.traffic = []; race.rivals = [];
  gates.forEach((ring, i) => {
    if (i === skip) return;
    Object.assign(race.player, { distance: ring.distance - 0.5, x: ring.x, altitude: ring.altitude, speed: 30, verticalSpeed: 0 });
    stepRace(race, { throttle: true }, 1 / 60);
  });
  return race.player;
}

test('D2: PERFECT LINE through a group with a row needs one ring of the row and every other gate', () => {
  const rings = createRace('coast').rings;
  const withRow = Object.values(Object.groupBy(rings, r => r.group)).find(g => g.some(r => r.row !== undefined) && g.length > 4);
  assert.ok(withRow, 'Coast has a group with a full-width row');
  const gates = [...new Map(withRow.map(r => [r.row ?? r, r])).values()]; // one ring per gate
  const all = driveGates('coast', gates);
  assert.equal(all.perfectLines, 1, 'one ring of the row plus every other gate earns PERFECT LINE');
  assert.equal(all.rings, gates.length, 'a row pays once, however many of its rings the car touches');
  assert.equal(driveGates('coast', gates, gates.length - 1).perfectLines, 0, 'missing one gate still misses PERFECT LINE');
});

test('D2: rows and trains respect tunnel roofs and never sit over a gap hole', () => {
  for (const [id, options] of TRACKS) {
    const { rings, sections } = createRace(id, options), inside = (r, type) => sections.some(s => s.type === type && r.distance >= s.from && r.distance < s.to);
    for (const ring of rings.filter(r => r.row !== undefined || r.train)) {
      if (inside(ring, 'tunnel')) assert.ok(ring.altitude + CAR_HEIGHT <= TUNNEL_CEILING, `${id} tunnel ring @${ring.distance}`);
      assert.ok(!inside(ring, 'gap') || ring.altitude >= GAP_CLEARANCE, `${id} gap ring @${ring.distance}`);
    }
  }
});
