import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRace, RACE_TRACKS, CAR_HEIGHT, TUNNEL_CEILING, GAP_CLEARANCE } from '../src/game.js';
import { measureEconomy, worldTourBaseline, median, WORLD_TOUR } from '../scripts/pickup-economy.mjs';

const layoutHash = id => {
  const race = createRace(id);
  return createHash('sha256').update(JSON.stringify({ rings: race.rings, pickups: race.pickups })).digest('hex').slice(0, 16);
};

test('AC1: the economy bot finishes all ten tracks with finite, repeatable numbers', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    const result = measureEconomy(id);
    assert.deepEqual(measureEconomy(id), result, id + ' must be deterministic');
    for (const key of ['time', 'nitroPerMinute', 'boostShare', 'fuelEmpty']) assert.ok(Number.isFinite(result[key]), `${id} ${key}`);
    assert.ok(result.rings > 0, id + ' bot collects rings');
  }
});

test('median picks the middle value, or the mean of the two middle values', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

// AC3: the seven tracks outside the tuning keep their Classic ring and pickup layout bit-for-bit.
const LOCKED_LAYOUTS = {
  aurora: 'ec56f1864017efd7', spiral: 'd20aca59f2c3d4c0', taipei: '77aaec0a53ef7f61', tokyo: '67f09fd5ab1b58e7',
  alpine: 'ab5d30cb554c2674', coastal: '2fc2ca94497def2e', cosmic: '050634fade732a55',
};
test('AC3: Aurora, Sky Spiral and the World Tour keep their ring and pickup layout', () => {
  for (const [id, hash] of Object.entries(LOCKED_LAYOUTS)) assert.equal(layoutHash(id), hash, id);
});

// AC2: within 15% of the World Tour median for NITRO and BOOST, and the first NITRO no later than it.
// Canyon was already above the NITRO median; the user chose a floor only, so no ceiling applies there.
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

test('Coast keeps its classic gate line and alternates high and road-height rings', () => {
  const rings = createRace('coast').rings;
  assert.ok(rings.every(r => r.x === 2.5));
  assert.deepEqual(rings.slice(0, 4).map(r => r.altitude), [8, 3, 8, 3]);
});

test('the World Tour baseline is the per-metric median of its five tracks', () => {
  const rows = WORLD_TOUR.map(measureEconomy), baseline = worldTourBaseline(rows);
  assert.equal(baseline.nitroPerMinute, median(rows.map(r => r.nitroPerMinute)));
  assert.ok(baseline.nitroPerMinute > 0 && baseline.boostShare > 0 && baseline.firstNitro > 0);
});
