import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/game.js';
import { createHazards } from '../src/hazards.ts';
import { validateHazardPlacement } from '../src/hazard-schema.ts';

let course = {};
try { course = await import('../src/gauntlet-course.ts'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const LANES = [-7.5, -2.5, 2.5, 7.5];
const EXCLUDED = ['gap', 'launch', 'tunnel', 'boost-tunnel', 'shortcut'];
const build = (trackId, tier = 'standard') => course.createGauntletCourse(trackId, RACE_TRACKS[trackId], LANES, tier);

test('mixed Gauntlet builds a seeded layout of barricades, moving gates, debris and hoops', () => {
  assert.equal(typeof course.createGauntletCourse, 'function', 'mixed Gauntlet course builder must exist');
  for (const trackId of Object.keys(RACE_TRACKS)) {
    const a = build(trackId);
    assert.deepEqual(build(trackId), a, `${trackId} is deterministic`);
    const types = new Set(a.hazards.map(h => h.type));
    for (const type of ['barrier', 'gate', 'debris']) assert.ok(types.has(type), `${trackId} has ${type}`);
    assert.ok(a.hoops.length > 0, `${trackId} has flying hoops`);
    assert.ok(a.hazards.some(h => h.placement.movementPattern.kind === 'sweep'), `${trackId} has moving gates`);
    assert.ok(a.hazards.some(h => h.placement.movementPattern.kind === 'fall'), `${trackId} has falling debris`);
    for (const h of a.hazards) {
      assert.deepEqual(validateHazardPlacement(h.placement), h.placement, 'every placement passes the ENV-02 boundary');
      assert.equal(h.distance, h.placement.distance);
      assert.ok(!RACE_TRACKS[trackId].sections.some(s => EXCLUDED.includes(s.type) && h.distance >= s.from - 35 && h.distance <= s.to + 35),
        `${trackId} ${h.id} avoids gaps, ramps, tunnels and shortcuts`);
    }
    const ordered = a.hazards.map(h => h.distance);
    assert.deepEqual(ordered, [...ordered].sort((x, y) => x - y));
  }
});

test('each obstacle leaves at least two lanes open and stands alone in its stretch', () => {
  for (const trackId of Object.keys(RACE_TRACKS)) {
    const { hazards } = build(trackId, 'extreme');
    for (let i = 1; i < hazards.length; i++) assert.ok(hazards[i].distance - hazards[i - 1].distance >= 120, `${trackId} spacing`);
    for (const h of hazards) {
      const move = h.placement.movementPattern;
      const reach = h.halfWidth + (move.kind === 'sweep' ? move.amplitude : 0) + 0.85;
      const open = LANES.filter(x => Math.abs(x - h.x) >= reach);
      assert.ok(open.length >= 2, `${trackId} ${h.id} leaves ${open.length} lanes open`);
    }
  }
});

test('the risky line is a hoop over a barricade; the safe line drives around it', () => {
  const { hazards, hoops } = build('coast');
  for (const hoop of hoops) {
    const below = hazards.find(h => h.distance === hoop.distance);
    assert.ok(below && below.type === 'barrier', 'a hoop always sits over a barricade');
    assert.equal(hoop.x, below.x);
    assert.ok(hoop.altitude - hoop.radius > below.height, 'flying through the hoop clears the barricade');
    assert.equal(hoop.type, 'risk');
  }
});

test('the course escalates: tighter spacing and more moving gates toward the finish', () => {
  for (const trackId of ['coast', 'tokyo', 'spiral']) {
    const { hazards } = build(trackId), half = RACE_TRACKS[trackId].length / 2;
    const first = hazards.filter(h => h.distance < half), second = hazards.filter(h => h.distance >= half);
    // Median consecutive gap: skipped no-build stretches (Spiral's gaps and launches) would distort a mean.
    const gap = list => list.slice(1).map((h, i) => h.distance - list[i].distance).sort((x, y) => x - y)[Math.floor((list.length - 1) / 2)];
    assert.ok(gap(second) < gap(first), `${trackId} spacing tightens`);
    const sweeps = list => list.filter(h => h.placement.movementPattern.kind === 'sweep').length / list.length;
    assert.ok(sweeps(second) >= sweeps(first), `${trackId} gates move more often later`);
    assert.ok(build(trackId, 'extreme').hazards.length > hazards.length, `${trackId} extreme is denser`);
  }
});

test('the original Gauntlet layout is untouched', () => {
  const before = createHazards(RACE_TRACKS.coast, LANES);
  assert.ok(before.every(h => !('placement' in h) && !('type' in h)));
  assert.deepEqual(createHazards(RACE_TRACKS.coast, LANES), before);
});

test('layout:mixed is a Gauntlet-only opt-in that keeps every existing signature', async () => {
  const { normalizeRaceConfig, rulesSignature } = await import('../src/race-config.ts');
  assert.equal(normalizeRaceConfig({ mode: 'gauntlet', layout: 'mixed' }).layout, 'mixed');
  for (const mode of ['classic', 'custom', 'free', 'time', 'checkpoint']) assert.equal(normalizeRaceConfig({ mode, layout: 'mixed' }).layout, undefined, mode);
  assert.equal(rulesSignature({ mode: 'gauntlet' }), rulesSignature({ mode: 'gauntlet', layout: 'classic' }));
  assert.notEqual(rulesSignature({ mode: 'gauntlet' }), rulesSignature({ mode: 'gauntlet', layout: 'mixed' }));
});

test('a mixed Gauntlet race uses the course; the default Gauntlet race is byte-identical', async () => {
  const { createRace, startRace, stepRace } = await import('../src/game.js');
  const plain = createRace('coast', { mode: 'gauntlet' });
  assert.deepEqual(plain.hazards, createHazards(RACE_TRACKS.coast, LANES));
  assert.deepEqual(plain.rings, createRace('coast').rings);
  const race = createRace('coast', { mode: 'gauntlet', layout: 'mixed' });
  const expected = build('coast');
  assert.deepEqual(race.hazards.map(h => h.id), expected.hazards.map(h => h.id));
  for (const hoop of expected.hoops) assert.ok(race.rings.some(r => r.distance === hoop.distance && r.type === 'risk' && r.altitude === hoop.altitude));
  const ordered = race.rings.map(r => r.distance);
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));

  startRace(race); race.phase = 'racing'; race.countdown = 0;
  const barricade = race.hazards.find(h => h.type === 'barrier' && race.rings.some(r => r.distance === h.distance));
  Object.assign(race.player, { distance: barricade.distance - 2, x: barricade.x, altitude: 0, speed: 60, cooldown: 0, collisions: 0 });
  stepRace(race, { throttle: true }, .1);
  assert.equal(race.player.collisions, 1, 'driving into a barricade still collides');
  const fresh = createRace('coast', { mode: 'gauntlet', layout: 'mixed' });
  startRace(fresh); fresh.phase = 'racing'; fresh.countdown = 0;
  const hoop = fresh.rings.find(r => r.distance === barricade.distance);
  Object.assign(fresh.player, { distance: hoop.distance - 2, x: hoop.x, altitude: hoop.altitude, speed: 60, cooldown: 0, collisions: 0, score: 0 });
  stepRace(fresh, { throttle: true, fly: true }, .1);
  assert.equal(fresh.player.collisions, 0, 'the risky line over the barricade is clear');
  assert.ok(hoop.hit && fresh.player.score > 0, 'the hoop pays out');
});
