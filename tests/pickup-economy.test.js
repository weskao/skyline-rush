import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRace, RACE_TRACKS, CAR_HEIGHT, TUNNEL_CEILING, GAP_CLEARANCE } from '../src/game.js';
import { createRings } from '../src/ring-layout.ts';
import { CIRCUIT_TRACK } from '../src/circuit-track.ts';
import { measureEconomy, worldTourBaseline, median, WORLD_TOUR } from '../scripts/pickup-economy.mjs';

const layoutHash = id => {
  const race = createRace(id);
  return createHash('sha256').update(JSON.stringify({ rings: race.rings, pickups: race.pickups })).digest('hex').slice(0, 16);
};

test('AC1: the economy bot finishes all ten tracks with finite, repeatable numbers', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    const result = measureEconomy(id);
    assert.deepEqual(measureEconomy(id), result, id + ' must be deterministic');
    assert.equal(result.phase, 'finished', id + ' bot finishes');
    for (const key of ['time', 'nitroPerMinute', 'boostShare', 'fuelEmpty']) assert.ok(Number.isFinite(result[key]), `${id} ${key}`);
    assert.ok(result.rings > 0, id + ' bot collects rings');
  }
});

test('median picks the middle value, or the mean of the two middle values', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

// AC3: Aurora and the World Tour layouts stay locked bit-for-bit. Stage 1 locked them unchanged; stage 2 (user
// decision 2026-11-02: more rings and pickups on all ten maps in every mode) lifted that lock deliberately and
// re-locked the new layouts here. Stage-1 hashes: aurora ec56f1864017efd7, taipei 77aaec0a53ef7f61, tokyo
// 67f09fd5ab1b58e7, alpine ab5d30cb554c2674, coastal 2fc2ca94497def2e, cosmic 050634fade732a55.
const LOCKED_LAYOUTS = {
  aurora: 'd1e3d16dea07414c', taipei: '5a49d8a1b47134c2', tokyo: '5118e29f13296376',
  alpine: '9d8fc5c6cf54335c', coastal: '6a9eabe8195ed8e4', cosmic: '9c897168bf1e1293',
};
test('AC3: Aurora and the World Tour keep their (stage-2) ring and pickup layout', () => {
  for (const [id, hash] of Object.entries(LOCKED_LAYOUTS)) assert.equal(layoutHash(id), hash, id);
});

// AC2: within 15% of the World Tour median for NITRO and BOOST, and the first NITRO no later than it.
// Canyon already had enough NITRO; the user chose a floor only for it, so no ceiling applies there.
test('AC2: Coast, Neon and Canyon reach the World Tour BOOST/NITRO economy', () => {
  const base = worldTourBaseline(), within = (value, target) => value >= target * 0.85 && value <= target * 1.15;
  for (const id of ['coast', 'neon', 'canyon']) {
    const r = measureEconomy(id), info = `${id} ${JSON.stringify(r)} vs ${JSON.stringify(base)}`;
    assert.ok(id === 'canyon' ? r.nitroPerMinute >= base.nitroPerMinute * 0.85 : within(r.nitroPerMinute, base.nitroPerMinute), 'NITRO/min ' + info);
    assert.ok(within(r.boostShare, base.boostShare), 'BOOST share ' + info);
    assert.ok(r.firstNitro !== null && r.firstNitro <= base.firstNitro, 'first NITRO ' + info);
  }
});

// AC5: denser rings stay under the tunnel roof and never ask a car on a broken bridge's hole to drive through one.
test('AC5: tuned rings sit below tunnel roofs and above gap holes', () => {
  for (const id of ['coast', 'neon', 'canyon']) {
    const { rings, sections } = createRace(id), inside = (r, type) => sections.some(s => s.type === type && r.distance >= s.from && r.distance < s.to);
    for (const ring of rings) {
      if (inside(ring, 'tunnel')) assert.ok(ring.altitude + CAR_HEIGHT <= TUNNEL_CEILING, `${id} tunnel ring @${ring.distance}`);
      if (inside(ring, 'gap')) assert.ok(ring.altitude >= GAP_CLEARANCE, `${id} gap ring @${ring.distance}`);
    }
  }
});

// Canyon, Sky Spiral and Circuit only bring the first NITRO forward: same ring count and positions,
// the opening rings turn into nitro and every later ring keeps its rolled type.
for (const [id, track, opening] of [['canyon', RACE_TRACKS.canyon, 2], ['spiral', RACE_TRACKS.spiral, 2], ['harbor-circuit', CIRCUIT_TRACK, 1]]) {
  test(`${id} keeps every ring position and count; only its first ${opening} ring(s) turn into nitro`, () => {
    const tuned = createRings(track), original = createRings({ ...track, openingNitroRings: 0 });
    assert.equal(track.openingNitroRings, opening);
    assert.deepEqual(tuned.map(r => [r.distance, r.x, r.altitude, r.group]), original.map(r => [r.distance, r.x, r.altitude, r.group]));
    assert.deepEqual(tuned.slice(0, opening).map(r => r.type), Array(opening).fill('nitro'));
    assert.deepEqual(tuned.slice(opening).map(r => r.type), original.slice(opening).map(r => r.type));
  });
}

test('every Circuit lap opens on a nitro ring and keeps its own PERFECT LINE groups', () => {
  for (const laps of [1, 3, 5]) {
    const { rings } = createRace('harbor-circuit', { mode: 'circuit', laps }), perLap = rings.length / laps, groups = 1 + Math.max(...rings.slice(0, perLap).map(r => r.group));
    for (let lap = 0; lap < laps; lap++) {
      const lapRings = rings.slice(lap * perLap, (lap + 1) * perLap);
      assert.equal(lapRings[0].type, 'nitro', `laps=${laps} lap ${lap}`);
      assert.ok(lapRings.every(r => r.lap === lap && Math.floor(r.group / groups) === lap), `laps=${laps} lap ${lap} groups`);
    }
  }
});

// AC2b: Sky Spiral and Circuit get their first NITRO no later than the World Tour median and keep at
// least the slowest World Tour NITRO rate; Aurora is left as it is (its layout is hash-locked above).
test('AC2b: Sky Spiral and Circuit bring the first NITRO forward without dropping below the World Tour floor', () => {
  const rows = WORLD_TOUR.map(id => measureEconomy(id)), base = worldTourBaseline(rows), floor = Math.min(...rows.map(r => r.nitroPerMinute));
  for (const [id, options] of [['spiral'], ['harbor-circuit', { mode: 'circuit', laps: 3 }]]) {
    const r = measureEconomy(id, options), info = `${id} ${JSON.stringify(r)} vs first ${base.firstNitro}, floor ${floor}`;
    assert.equal(r.phase, 'finished', info);
    assert.ok(r.firstNitro !== null && r.firstNitro <= base.firstNitro, 'first NITRO ' + info);
    assert.ok(r.nitroPerMinute >= floor, 'NITRO/min ' + info);
  }
});

// Stage 2 adds full-width rows across all lanes; every other Coast gate stays on the classic line
// (the slot-by-slot alternation is locked in tests/game.test.js).
test('Coast keeps its classic gate line and alternates high and road-height rings', () => {
  const lone = createRace('coast').rings.filter(r => r.row === undefined && !r.train);
  assert.ok(createRace('coast').rings.filter(r => r.row === undefined).every(r => r.x === 2.5));
  assert.deepEqual(new Set(lone.map(r => r.altitude)), new Set([8, 3]));
});

test('the World Tour baseline is the per-metric median of its five tracks', () => {
  const rows = WORLD_TOUR.map(id => measureEconomy(id)), baseline = worldTourBaseline(rows);
  assert.equal(baseline.nitroPerMinute, median(rows.map(r => r.nitroPerMinute)));
  assert.ok(baseline.nitroPerMinute > 0 && baseline.boostShare > 0 && baseline.firstNitro > 0);
});

// S4: modes and other generators. The nine modes below draw rings and pickups straight from the
// track, so the Classic tuning reaches them unchanged; options that change rings on purpose
// (gauntlet mixed layout, themes, bonus gates, active item rules) are left out.
const INHERITING_MODES = ['custom', 'free', 'time', 'gauntlet', 'checkpoint', 'cup', 'stunt', 'elimination'];
const CLASSIC_TRACKS = ['coast', 'neon', 'canyon', 'aurora', 'spiral'];
const layoutOf = race => JSON.stringify({ rings: race.rings.map(r => [r.distance, r.x, r.altitude, r.type, r.group]), pickups: race.pickups.map(p => [p.distance, p.x, p.altitude, p.tier]) });

test('S4: every inheriting mode keeps the Classic ring and pickup layout on the five Classic tracks', () => {
  for (const id of CLASSIC_TRACKS) {
    const classic = layoutOf(createRace(id));
    for (const mode of INHERITING_MODES) assert.equal(layoutOf(createRace(id, { mode })), classic, `${id} ${mode}`);
  }
});

test('S4: measureEconomy takes mode options and a time cap, and reports the phase it stopped in', () => {
  const capped = measureEconomy('coast', { mode: 'checkpoint' }, 120);
  assert.ok(['finished', 'racing'].includes(capped.phase), capped.phase);
  assert.ok(capped.time <= 120.1, 'cap ' + capped.time);
  assert.equal(measureEconomy('coast').phase, 'finished');
});

test('S4: Circuit, Endless and the gold-rings daily give finite, repeatable numbers', () => {
  for (const [id, options, cap] of [['harbor-circuit', { mode: 'circuit' }, 300], ['coast', { mode: 'endless' }, 120], ['neon', 'gold-rings', 120]]) {
    const result = measureEconomy(id, options, cap), label = `${id} ${JSON.stringify(options)}`;
    assert.deepEqual(measureEconomy(id, options, cap), result, label + ' must be deterministic');
    for (const key of ['time', 'nitroPerMinute', 'boostShare']) assert.ok(Number.isFinite(result[key]) && result[key] > 0, `${label} ${key}`);
  }
});
