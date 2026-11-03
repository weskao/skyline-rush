import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, setLayoutSeed, RACE_TRACKS, CAR_HEIGHT, TUNNEL_CEILING, GAP_CLEARANCE, ITEMS_PER_CAR } from '../src/game.js';

// User, 2026-11-02: rings and pickups scale with the cars on the grid (5 slots per car since the user's 2026-11-03
// "medium increase"; 4 before), spread over the whole track,
// and their positions are re-rolled every race. A ring slot may be a train or a full-width row and a pickup slot
// trails a run of cells (tests/ring-rows.test.js): `slots` counts one ring per slot, `pickupsOf` one pickup.
const TRACKS = Object.keys(RACE_TRACKS);
const PER_CAR = ITEMS_PER_CAR;
const singles = race => race.rings.filter(ring => !ring.train && !(ring.row && ring.x !== -7.5)); // one ring per slot
const cars = race => 1 + race.rivals.length;
const inCorridor = (race, p) => race.sections.some(s => s.type === 'shortcut' && p.distance >= s.from && p.distance < s.to && p.x === s.x && p.altitude === s.altitude);
// The scattered pickups: not the overcharge, not a shortcut corridor's own reward line.
const pickupsOf = race => race.pickups.filter(p => p.tier !== 'overcharge' && !p.run && !inCorridor(race, p));

test('L1: a race carries ITEMS_PER_CAR single rings per car on the grid, on every track', () => {
  for (const id of TRACKS) for (const rivals of [0, 1, 2, 7]) {
    const race = createRace(id, { mode: 'custom', rivals });
    assert.equal(singles(race).length, PER_CAR * (rivals + 1), `${id} with ${rivals + 1} car(s)`);
  }
  for (const id of TRACKS) assert.equal(singles(createRace(id)).length, 40, `${id} classic grid of 8: 5 per car`);
});

test('L2: a slot is a single ring, a 6-ring train or a 4-ring full-width row', () => {
  for (const id of TRACKS) for (const ring of createRace(id).rings) {
    if (ring.train !== undefined) assert.ok(ring.train >= 0 && ring.train < 6, `${id} train @${ring.distance}`);
    if (ring.row) assert.equal(createRace(id).rings.filter(r => r.row && r.distance === ring.distance).length, 4, `${id} row @${ring.distance}`);
  }
});

// One item per equal slice of the track: no two slices' worth of road (plus the 300 m start/finish margin) stays empty.
test('L3: rings and pickups spread from start to finish, never bunched on one stretch', () => {
  for (const id of TRACKS) for (const rivals of [0, 7]) for (const seed of [1, 2, 3]) {
    setLayoutSeed(() => seed);
    const race = createRace(id, { mode: 'custom', rivals }), length = race.length;
    for (const items of [singles(race), pickupsOf(race)]) {
      const stops = [0, ...items.map(item => item.distance), length];
      const longest = Math.max(...stops.slice(1).map((d, i) => d - stops[i]));
      assert.ok(longest < 2 * length / items.length + 300, `${id} seed ${seed}: ${longest} m empty in ${items.map(i => Math.round(i.distance))}`);
      assert.ok(items.every(item => item.distance > 0 && item.distance < length), id);
    }
  }
  setLayoutSeed();
});

test('L4: a race carries ITEMS_PER_CAR single pickups per car plus the one overcharge', () => {
  for (const id of TRACKS) for (const rivals of [0, 2, 7]) {
    const race = createRace(id, { mode: 'custom', rivals });
    assert.equal(pickupsOf(race).length, PER_CAR * (rivals + 1), `${id} with ${rivals + 1} car(s)`);
    assert.equal(race.pickups.filter(p => p.tier === 'overcharge').length, 1, id);
  }
});

test('L5: no pickup sits over a gap hole or inside a tunnel roof', () => {
  for (const id of TRACKS) for (const seed of [1, 2, 3]) {
    setLayoutSeed(() => seed);
    const race = createRace(id);
    for (const p of race.pickups) for (const s of RACE_TRACKS[id].sections) {
      if (p.distance < s.from - 10 || p.distance >= s.to + 10) continue;
      assert.ok(!(s.type === 'gap' && p.altitude === 0), `${id} seed ${seed}: ground pickup over the gap @${p.distance}`);
      assert.ok(!(s.type === 'tunnel' && p.altitude > 0), `${id} seed ${seed}: air pickup in the tunnel @${p.distance}`);
    }
  }
  setLayoutSeed();
});

test('L6: Circuit gives every lap ITEMS_PER_CAR single rings and pickups per car', () => {
  const race = createRace('harbor-circuit', { mode: 'circuit', laps: 3 });
  assert.equal(singles(race).length, PER_CAR * cars(race) * 3);
  assert.equal(pickupsOf(race).length, PER_CAR * cars(race) * 3);
});

test('L7: positions are re-rolled per race seed, and a pinned seed repeats the layout', () => {
  const layout = race => [...race.rings, ...race.pickups].map(item => `${item.distance}:${item.x}:${item.altitude}`).join();
  for (const id of TRACKS) {
    setLayoutSeed(() => 11);
    const a = layout(createRace(id)), again = layout(createRace(id));
    setLayoutSeed(() => 12);
    const b = layout(createRace(id));
    assert.equal(a, again, `${id} same seed`);
    assert.notEqual(a, b, `${id} another seed`);
  }
  setLayoutSeed();
  assert.equal(layout(createRace('coast')), layout(createRace('coast')), 'the default seed is the track seed');
});

test('L8: every ring fits under a tunnel roof and clears a gap hole', () => {
  for (const id of [...TRACKS, 'harbor-circuit']) for (const seed of [1, 2, 3]) {
    setLayoutSeed(() => seed);
    const { rings, sections } = id === 'harbor-circuit' ? createRace(id, { mode: 'circuit', laps: 1 }) : createRace(id);
    const inside = (r, type) => sections.some(s => s.type === type && r.distance >= s.from && r.distance < s.to);
    for (const ring of rings) {
      if (inside(ring, 'tunnel')) assert.ok(ring.altitude + CAR_HEIGHT <= TUNNEL_CEILING, `${id} seed ${seed}: tunnel ring @${ring.distance}`);
      assert.ok(!inside(ring, 'gap') || ring.altitude >= GAP_CLEARANCE, `${id} seed ${seed}: gap ring @${ring.distance} alt ${ring.altitude}`);
    }
  }
  setLayoutSeed();
});

// Drives the player through `gates` (skipping `skip`) on Coast and reports what the race paid.
function driveGates(gates, skip = -1) {
  const race = createRace('coast');
  startRace(race); race.phase = 'racing'; race.traffic = []; race.rivals = [];
  gates.forEach((ring, i) => {
    if (i === skip) return;
    Object.assign(race.player, { distance: ring.distance - 0.5, x: ring.x, altitude: ring.altitude, speed: 30, verticalSpeed: 0 });
    stepRace(race, { throttle: true }, 1 / 60);
  });
  return race.player;
}

test('L9: PERFECT LINE needs every ring of a group; missing one misses it', () => {
  const rings = createRace('coast').rings, single = rings.find(r => r.group > 0 && rings.every(o => o.group !== r.group || (!o.row && o.train === undefined)));
  const group = rings.filter(r => r.group === single.group); // a group of single rings (rows and trains: tests/ring-rows.test.js)
  assert.ok(group.length >= 3 && group.every(r => r.groupSize === group.length));
  const all = driveGates(group);
  assert.equal(all.perfectLines, 1);
  assert.equal(all.rings, group.length);
  assert.equal(driveGates(group, group.length - 1).perfectLines, 0);
});
