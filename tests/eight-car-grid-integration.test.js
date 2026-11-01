import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace } from '../src/game.js';
import { startingGrid, reversedGrid, RACE_DRIVER_IDS } from '../src/race-grid.ts';
import { createCup, addCupResult, cupStandings, nextCupGrid } from '../src/championship-cup.ts';
import { createSprintSeries, addSprintStage, nextSprintGrid } from '../src/sprint-series.ts';
import { rulesSignature, normalizeRaceConfig } from '../src/race-config.ts';

const ids = [...RACE_DRIVER_IDS];
const times = Object.fromEntries(ids.map((id, i) => [id, 40 + i]));
const finish = (trackId, values = times) => ({
  trackId, phase: 'finished', result: { time: values.YOU, position: 1, score: 500 },
  elapsed: values.YOU, length: 5000,
  rivals: ids.slice(1).map(name => ({ name, distance: 4900, speed: 60, finishTime: values[name] })),
});

test('real eight-car initial slots remain disjoint throughout a stopped countdown', () => {
  const race = createRace('coast');
  assert.equal(race.grid.length, 8);
  assert.equal(new Set(race.grid.map(s => s.id)).size, 8);
  for (const driver of race.grid) {
    const car = driver.id === 'YOU' ? race.player : race.rivals.find(r => r.id === driver.id);
    assert.deepEqual([car.x, car.distance], [driver.x, driver.distance]);
  }
  const start = race.grid.map(x => [x.id, x.x, x.distance]);
  race.phase = 'countdown'; race.countdown = 2;
  for (let i = 0; i < 30; i++) stepRace(race, { throttle: true }, 1 / 60);
  assert.deepEqual(race.grid.map(x => [x.id, x.x, x.distance]), start);
  assert.equal(race.player.distance, start.find(x => x[0] === 'YOU')[2]);
});

test('all 2–8 participants occupy collision-safe, deterministic start slots', () => {
  for (let total = 2; total <= 8; total++) {
    const a = startingGrid(ids.slice(1, total));
    const b = startingGrid(ids.slice(1, total));
    assert.deepEqual(a, b);
    for (const [i, x] of a.entries()) for (const [j, y] of a.entries()) if (j > i)
      assert.ok(Math.abs(x.distance - y.distance) >= 4.4 || Math.abs(x.x - y.x) >= 1.7);
  }
  assert.throws(() => startingGrid(['NOVA', 'NOVA']), /Invalid/);
  assert.throws(() => startingGrid(['UNKNOWN']), /Invalid/);
  assert.throws(() => startingGrid(ids.slice(1), [...ids.slice(1), 'NOVA']), /Invalid/);
});

test('all eight positions are fully reversed for Cup heat 2, and points carry into heat 3', () => {
  let cup = addCupResult(createCup(['coast', 'neon', 'canyon'], 'coast'), finish('coast'));
  const order = cup.results[0].order;
  assert.deepEqual(nextCupGrid(cup), [...order].reverse());
  const heat2 = createRace('neon', { mode: 'cup' }, {}, nextCupGrid(cup));
  assert.deepEqual(heat2.grid.map(slot => slot.id), [...order].reverse());
  cup = addCupResult(cup, finish('neon', Object.fromEntries(ids.map((id, i) => [id, 48 - i]))));
  const points = cupStandings(cup);
  assert.equal(points.length, 8);
  assert.equal(points.reduce((sum, row) => sum + row.points, 0), 2 * 39);
  assert.deepEqual(nextCupGrid(cup), [...cup.results[1].order].reverse());
});

test('multi-heat Custom sprint reverses full on-track result, legacy sprint remains readable', () => {
  const stage1 = addSprintStage(createSprintSeries(3), finish('coast'));
  assert.deepEqual(nextSprintGrid(stage1), reversedGrid(ids));
  const reverse = createRace('neon', { mode: 'custom', rivals: 7 }, {}, nextSprintGrid(stage1));
  assert.deepEqual(reverse.grid.map(slot => slot.id), [...ids].reverse());
  const stage2 = addSprintStage(stage1, finish('neon', Object.fromEntries(ids.map((id, i) => [id, 49 - i]))));
  assert.equal(stage2.results.length, 2);
  const legacy = addSprintStage(createSprintSeries(2), { phase: 'finished', result: { time: 45, position: 2, score: 200 } });
  assert.equal(nextSprintGrid(legacy), null);
  assert.equal(legacy.results[0].score, 200);
});

test('invalid finish lists, tampered saved Cup and historical 4-car sessions are isolated', () => {
  assert.throws(() => reversedGrid(['YOU', 'YOU']), /Invalid/);
  assert.throws(() => reversedGrid(['YOU', 'HACK']), /Invalid/);
  const saved = addCupResult(createCup(['coast','neon','canyon'], 'coast'), finish('coast'));
  const broken = structuredClone(saved);
  broken.results[0].order[3] = broken.results[0].order[2];
  assert.throws(() => cupStandings(broken), /Invalid/);
  assert.throws(() => nextCupGrid(broken), /Invalid/);
  const legacy = normalizeRaceConfig({ mode: 'cup', rulesVersion: 1, rivals: 3 });
  const race = createRace('coast', legacy);
  assert.equal(race.rivals.length, 3);
  assert.equal(race.session.rulesSignature, rulesSignature(legacy));
  assert.deepEqual(createRace('coast', { mode:'time' }).rivals, []);
});
