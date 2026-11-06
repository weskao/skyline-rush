import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, RACE_TRACKS, ROAD_LIMIT, ITEMS_PER_CAR, stepRace, startRace, setLayoutSeed } from '../src/game.js';
import { rivalCollects, rivalSeek } from '../src/rival-items.ts';
import { Scene } from 'three';
import { RING_POOL_CAPACITY, createEffects } from '../src/effects.js';
import { drawnMarkers } from '../src/marker-pool.js';
import { TRAIN_SPACING } from '../src/ring-layout.ts';

// User, 2026-11-02: a few ring slots become trains (consecutive rings on the road or in the air) or a full-width row
// that every car on the road passes; pickups come in runs of 1-4. Not a wall of rows: the earlier 5-row streaks were
// "too many, too bunched".
// User, 2026-11-03: more rings and pickups (a medium step), most of the new rings as trains on the road down a middle
// lane (x -2.5 / 2.5), so driving straight collects ring after ring; still no walls and no dense scatter.
const MID_LANES = [-2.5, 2.5];
const rowsOf = rings => {
  const rows = new Map();
  for (const ring of rings) if (ring.row) rows.set(ring.distance, [...(rows.get(ring.distance) ?? []), ring]);
  return [...rows.values()];
};
const trainsOf = rings => Object.values(Object.groupBy(rings.filter(r => r.train !== undefined), r => r.group));
const RACES = [
  ...Object.keys(RACE_TRACKS).map(id => [id, createRace(id)]),
  ['harbor-circuit', createRace('harbor-circuit', { mode: 'circuit', laps: 3 })],
  ['endless', createRace('coast', { mode: 'endless' })],
];

test('a full-width row is passed by any car on the road, from the surface to 6 m up', () => {
  let rows = 0;
  for (const [id, race] of RACES) for (const row of rowsOf(race.rings)) {
    rows++;
    assert.equal(row.length, 4, id);
    for (let x = -ROAD_LIMIT; x <= ROAD_LIMIT; x += 0.2) for (let altitude = 0; altitude <= 6; altitude += 0.25)
      assert.ok(row.some(r => Math.hypot(r.x - x, r.altitude - altitude) < r.radius), `${id} row @${row[0].distance} misses x ${x.toFixed(1)} alt ${altitude}`);
  }
  assert.ok(rows > 0);
});

test('rows are few, trains more common, across many re-rolled layouts on every track', () => {
  let rows = 0, trains = 0, slots = 0, air = 0, layouts = 0;
  for (const id of Object.keys(RACE_TRACKS)) for (let seed = 1; seed <= 10; seed++) {
    setLayoutSeed(() => seed);
    const { rings } = createRace(id);
    rows += rowsOf(rings).length; trains += trainsOf(rings).length; slots += ITEMS_PER_CAR * 8; layouts++;
    air += trainsOf(rings).filter(t => t[0].altitude > 3).length;
  }
  setLayoutSeed();
  assert.ok(rows > 0 && rows / slots < 0.1, `rows ${rows}/${slots}`);
  // Sections keep shapes 40 m away, so many rolled trains stay single: 2.2 trains a race before 2026-11-03, 3+ now.
  assert.ok(trains > 2 * rows && trains / layouts >= 3 && trains / slots < 0.2, `trains ${trains}/${slots} in ${layouts} races`);
  assert.ok(air > 0 && air < 0.3 * trains, `air trains ${air}/${trains}: most trains sit on the road`);
});

test('a train is consecutive rings down one lane, its own PERFECT LINE group, clear of road sections', () => {
  for (const [id, race] of RACES) {
    for (const train of trainsOf(race.rings)) {
      assert.equal(train.length, 6, id);
      assert.ok(MID_LANES.includes(train[0].x), `${id} train @${train[0].distance} on lane x ${train[0].x}`);
      assert.ok(train.every((r, i) => r.x === train[0].x && r.altitude === train[0].altitude && r.groupSize === 6 &&
        r.distance === train[0].distance + i * TRAIN_SPACING), `${id} train @${train[0].distance}`);
    }
    if (race.mode === 'endless') continue;
    for (const r of race.rings.filter(r => r.row || r.train !== undefined)) {
      const d = r.distance % (race.mode === 'circuit' ? 2000 : Infinity);
      assert.ok(!race.sections.some(s => d >= s.from - 40 && d <= s.to + 40), `${id} shaped ring @${d} inside a section`);
    }
    assert.deepEqual(race.rings.map(r => r.distance), race.rings.map(r => r.distance).sort((a, b) => a - b), `${id} sorted`);
    // User, 2026-11-03: chains, not a bunch: a train ends 40 m before the next one starts (Circuit packs a slot every 45 m).
    const starts = trainsOf(race.rings).map(t => [t[0].distance, t.at(-1).distance]).sort((a, b) => a[0] - b[0]);
    starts.slice(1).forEach(([from], i) => assert.ok(from >= starts[i][1] + 40, `${id} train @${from} overlaps the one ending @${starts[i][1]}`));
  }
});

test('a car takes one ring of a row; a rival does too and leaves the rest for the next car', () => {
  const race = createRace('coast');
  const row = rowsOf(race.rings)[0];
  Object.assign(race, { rings: row, pickups: [], rivals: [], traffic: [] });
  Object.assign(race.player, { distance: row[0].distance - 5, x: 0, speed: 40 }); // x 0: inside two rings
  startRace(race); race.phase = 'racing';
  for (let i = 0; i < 10; i++) stepRace(race, { throttle: true }, 1 / 30);
  assert.equal(race.player.rings, 1);
  for (const ring of row) { ring.type = 'nitro'; ring.hit = false; ring.downUntil = undefined; }
  race.elapsed = 1;
  const rival = { x: 0, altitude: 0, distance: row[0].distance + 1, nitro: 0, itemTakes: 0, lastTake: null };
  rivalCollects({ ...race, config: { difficulty: 'hard' } }, rival, row[0].distance - 1);
  assert.equal(rival.itemTakes, 1);
  assert.equal(row.filter(r => r.downUntil > race.elapsed).length, 1);
});

test('driving a train collects every ring and a PERFECT LINE', () => {
  const race = createRace('coast');
  const train = trainsOf(race.rings).find(t => t[0].altitude < 3);
  Object.assign(race, { rings: train, pickups: [], rivals: [], traffic: [] });
  Object.assign(race.player, { distance: train[0].distance - 20, x: train[0].x, speed: 50 });
  startRace(race); race.phase = 'racing';
  for (let i = 0; i < 120; i++) { stepRace(race, { throttle: true }, 1 / 30); race.player.x = train[0].x; }
  assert.equal(race.player.rings, 6);
  assert.equal(race.player.perfectLines, 1);
});

test('Hard rivals do not change lane for a ring row: it is already on their lane', () => {
  const race = createRace('coast', { mode: 'custom', difficulty: 'hard' });
  const row = rowsOf(createRace('coast').rings)[0].map(r => ({ ...r, type: 'nitro' }));
  Object.assign(race, { rings: row, pickups: [], elapsed: 1 });
  const rival = { x: 2.5, altitude: 0, distance: row[0].distance - 50, nitro: 0, itemTakes: 0, lastTake: null };
  rivalSeek(race, rival);
  assert.equal(rival.seekX, undefined);
  race.rings = [{ ...row[0], row: undefined }]; // a single nitro ring still draws them over
  rivalSeek(race, rival);
  assert.equal(rival.seekX, row[0].x);
});

test('Endless: every 500 m chunk has a middle-lane train, 3 single rings and 5 pickup runs', () => {
  const race = createRace('coast', { mode: 'endless' });
  const chunks = Object.groupBy(race.rings, r => r.chunk);
  assert.ok(Object.keys(chunks).length >= 4);
  for (const [chunk, rings] of Object.entries(chunks)) {
    const trains = trainsOf(rings);
    assert.equal(trains.length, 1, `chunk ${chunk}`);
    assert.ok(MID_LANES.includes(trains[0][0].x) && trains[0].length === 6, `chunk ${chunk}`);
    assert.equal(rings.filter(r => !r.row && r.train === undefined).length, 3, `chunk ${chunk} singles`);
    assert.equal(race.pickups.filter(p => p.chunk === +chunk && !p.run).length, 5, `chunk ${chunk} pickups`);
  }
});

test('pickups come in runs of 1-4: the slot pickup, then cells 8 m apart down its line', () => {
  const lengths = new Set();
  for (const [id, race] of RACES) {
    const pickups = race.pickups;
    pickups.forEach((p, i) => {
      if (p.run) return;
      let n = 1;
      for (const q of pickups.slice(i + 1)) if (q.run && q.x === p.x && q.distance === p.distance + n * 8) n++;
      assert.ok(n >= 1 && n <= 4, `${id} run of ${n} @${p.distance}`);
      lengths.add(n);
    });
    assert.ok(pickups.filter(p => p.run).every(p => p.tier === 'cell'), id);
  }
  assert.deepEqual([...lengths].sort(), [1, 2, 3, 4]);
});

test('the ring pool draws every ring of one colour in the densest 900 m view', () => {
  const configs = [undefined, 'gold-rings', { mode: 'custom', itemRules: 'active' }, { mode: 'free', itemRules: 'all' }, { mode: 'endless' }];
  for (const id of Object.keys(RACE_TRACKS)) for (const config of configs) {
    const { rings } = createRace(id, config);
    for (const from of rings) {
      const counts = {};
      for (const r of rings) if (r.distance > from.distance && r.distance <= from.distance + 900) counts[r.type] = (counts[r.type] ?? 0) + 1;
      for (const [type, n] of Object.entries(counts)) assert.ok(n <= RING_POOL_CAPACITY, `${id} ${JSON.stringify(config)} ${type}: ${n}`);
    }
  }
});

test('every ring ahead of a full-width row is drawn where it scores, headless', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), effects = createEffects(scene, () => 0);
  t.after(() => effects.dispose());
  const group = scene.getObjectByName('Race rings');
  for (const id of Object.keys(RACE_TRACKS)) {
    const race = createRace(id);
    const row = rowsOf(race.rings)[0];
    if (!row) continue;
    race.phase = 'racing';
    race.player.distance = row[0].distance - 60;
    effects.update(race, 1 / 60, 0, false, true);
    const d = race.player.distance, ahead = race.rings.filter(r => !r.hit && !(r.downUntil > race.elapsed) && r.distance > d && r.distance <= d + 900);
    assert.ok(ahead.filter(r => r.row).length >= 4, `${id}: the full-width row is ahead`);
    assert.equal(drawnMarkers(group).length, ahead.length, `${id}: every ring ahead is drawn`);
  }
});
