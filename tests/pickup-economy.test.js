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

// AC3: Aurora and the World Tour layouts (at the default track seed) stay locked bit-for-bit. Stage 1 locked them
// unchanged; stage 2 (user decision 2026-11-02: more rings and pickups on all ten maps in every mode) and the scaled
// layout (user, 2026-11-02: 4 rings and pickups per car, re-rolled per race in the app) each lifted that lock
// deliberately and re-locked the new layouts here. Stage-2 hashes: aurora d1e3d16dea07414c, taipei 5a49d8a1b47134c2,
// tokyo 5118e29f13296376, alpine 9d8fc5c6cf54335c, coastal 6a9eabe8195ed8e4, cosmic 9c897168bf1e1293.
// Re-locked again for the user's ring trains, a few full-width rows and pickup runs of 1-4 (2026-11-02), on the same
// 4 slots per car. 4-per-car hashes: aurora 0556decf5e917770, taipei 92328db2e65aaf02, tokyo 8a0f615c217d6154,
// alpine b28b3261f4815a4d, coastal d0e7f481e35cd2d6, cosmic a08289e1073ffbfd.
// Re-locked for the user's 2026-11-03 medium increase (5 slots per car, more 6-ring trains down a middle lane, mostly
// on the road). Train-layout hashes before it: aurora dfbdee2481a1067c, taipei 7e3e494aeb87c4da, tokyo 1b414b5f6ef56db9,
// alpine 4d9a65bf5d0b8de7, coastal 1bdfb51a66d090c9, cosmic 9999583aa5be70d4.
// Re-locked for the user's 2026-11-07 lane variety (ring lines and trains on all four lanes; tests/ring-variety.test.js
// holds collecting near the old ease). Middle-lane hashes before it: aurora 4c8e2977913671d9, taipei a1fcaaf6829fc7ab,
// tokyo 0e0c60b082ae64d6, alpine 3baaf86d05a6687d, coastal 59c8c7f6d245f3b0, cosmic 95e09bd6901f2a9d.
const LOCKED_LAYOUTS = {
  aurora: 'accf48d891104502', taipei: 'c8a0656396c290d7', tokyo: 'd1963910b490325b',
  alpine: 'edf1cb0bf8ec882a', coastal: 'fbbf0b518e3cba3b', cosmic: '02405104894581e8',
};
test('AC3: Aurora and the World Tour keep their (scaled) ring and pickup layout', () => {
  for (const [id, hash] of Object.entries(LOCKED_LAYOUTS)) assert.equal(layoutHash(id), hash, id);
});

// AC2 (Coast, Neon and Canyon within 15% of the World Tour NITRO/BOOST median) was retired 2026-11-02: the user
// accepted the scarcity of 4 rings and pickups per car on every track, so the count rule, not per-track parity,
// sets the economy now.

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

// Stage 2 adds full-width rows across all lanes; every other Coast gate keeps the classic heights on a lane, which
// moves between all four since the user's 2026-11-07 variety pass (the slot-by-slot alternation is locked in
// tests/game.test.js).
test('Coast keeps its classic gate heights on every lane and alternates high and road-height rings', () => {
  const rings = createRace('coast').rings.filter(r => !r.row && r.train === undefined); // the gate line, not rows or trains
  assert.deepEqual(new Set(rings.map(r => r.x)), new Set([-7.5, -2.5, 2.5, 7.5]));
  assert.deepEqual(new Set(rings.map(r => r.altitude)), new Set([8, 3]));
});

test('the World Tour baseline is the per-metric median of its five tracks', () => {
  const rows = WORLD_TOUR.map(id => measureEconomy(id)), baseline = worldTourBaseline(rows);
  assert.equal(baseline.nitroPerMinute, median(rows.map(r => r.nitroPerMinute)));
  assert.ok(baseline.nitroPerMinute > 0 && baseline.boostShare > 0 && baseline.firstNitro > 0);
});

// S4: modes and other generators. The modes below draw rings and pickups straight from the track, 4 per car, so
// every mode with the same grid lays out the same rings and pickups; options that change rings on purpose
// (gauntlet mixed layout, themes, bonus gates, active item rules) are left out.
const SAME_GRID = [['classic', 'cup', { mode: 'custom', rivals: 7 }], ['time', 'free', 'gauntlet', 'checkpoint', 'stunt', { mode: 'custom', rivals: 0 }]];
const CLASSIC_TRACKS = ['coast', 'neon', 'canyon', 'aurora', 'spiral'];
const layoutOf = race => JSON.stringify({ rings: race.rings.map(r => [r.distance, r.x, r.altitude, r.type, r.group]), pickups: race.pickups.map(p => [p.distance, p.x, p.altitude, p.tier]) });

test('S4: every mode with the same grid keeps one ring and pickup layout on the five Classic tracks', () => {
  for (const id of CLASSIC_TRACKS) for (const [first, ...rest] of SAME_GRID) {
    const options = mode => typeof mode === 'string' ? { mode } : mode, reference = layoutOf(createRace(id, options(first)));
    for (const mode of rest) assert.equal(layoutOf(createRace(id, options(mode))), reference, `${id} ${JSON.stringify(mode)}`);
  }
});

test('S4: Elimination intentionally shares the Endless highway layout on every classic theme', () => {
  for (const id of CLASSIC_TRACKS) {
    const knockout = createRace(id, { mode: 'elimination' });
    const survival = createRace(id, { mode: 'endless' });
    assert.equal(knockout.rivals.length, 7, id);
    assert.equal(survival.rivals.length, 0, id);
    assert.deepEqual(layoutOf(knockout), layoutOf(survival), id + ': shared procedural ring/pickup layout');
    assert.equal(knockout.traffic.length, survival.traffic.length, id + ': same streamed traffic budget');
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
