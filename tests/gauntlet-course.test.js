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
