import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace } from '../src/game.js';
import { normalizeRaceConfig, validateRaceRequest } from '../src/race-config.ts';
import { createCup, addCupResult, cupStandings } from '../src/championship-cup.ts';
import { createSprintSeries, addSprintStage } from '../src/sprint-series.ts';

const ids = ['NOVA', 'ORBIT', 'APEX', 'VEGA', 'PULSE', 'COMET', 'RIFT'];
const heat = (track, times) => ({
  trackId: track, phase: 'finished', elapsed: times.YOU, result: { time: times.YOU },
  length: 5000, rivals: ids.map(name => ({ name, finishTime: times[name], distance: 4900, speed: 60 })),
});

test('new Classic and Cup fields contain seven stable AI IDs and collision-safe 8-car grid', () => {
  for (const config of [null, { mode: 'cup' }]) {
    const a = createRace('coast', config);
    const b = createRace('coast', config);
    assert.deepEqual(a.rivals.map(r => r.id), ids);
    assert.deepEqual(a.rivals.map(r => [r.x, r.distance]), b.rivals.map(r => [r.x, r.distance]));
    assert.equal(new Set(['YOU', ...a.rivals.map(r => r.id)]).size, 8);
    const cars = [a.player, ...a.rivals];
    for (let i = 0; i < cars.length; i++)
      for (let j = i + 1; j < cars.length; j++)
        assert.ok(Math.abs(cars[i].distance - cars[j].distance) >= 4.4 || Math.abs(cars[i].x - cars[j].x) >= 1.7, 'unsafe spawn ' + i + '/' + j);
  }
});

test('Custom total field 2–8 and solo remain isolated', () => {
  for (const rivals of [1, 7]) {
    const config = validateRaceRequest({ mode: 'custom', rivals });
    assert.equal(createRace('coast', config).rivals.length, rivals);
  }
  assert.throws(() => validateRaceRequest({ mode: 'custom', rivals: 8 }), /rivals/);
  assert.equal(normalizeRaceConfig({ mode: 'time' }).rivals, 0);
  assert.equal(createRace('coast', { mode: 'time' }).rivals.length, 0);
});

test('Easy, Normal, Hard produce ordered AI pace without affecting player state', () => {
  const distances = ['easy', 'normal', 'hard'].map(difficulty => {
    const race = createRace('coast', { mode: 'custom', rivals: 1, difficulty, traffic: 'off' });
    race.phase = 'racing';
    for (let frame = 0; frame < 500; frame++) stepRace(race, {}, 1 / 60);
    assert.equal(race.player.distance, 0);
    return race.rivals[0].distance;
  });
  assert.ok(distances[0] < distances[1] && distances[1] < distances[2]);
});

test('eight-car Cup scores all eight ranks, preserves four-car history and rejects duplicates', () => {
  let cup = createCup(['coast', 'neon', 'canyon'], 'coast');
  const times = Object.fromEntries(['YOU', ...ids].map((id, index) => [id, 40 + index]));
  cup = addCupResult(cup, heat('coast', times));
  assert.equal(cupStandings(cup).length, 8);
  assert.equal(cupStandings(cup)[0].name, 'YOU');
  assert.equal(cupStandings(cup)[0].points, 10);
  const legacy = addCupResult(createCup(['coast', 'neon', 'canyon'], 'coast'), {
    trackId: 'coast', phase: 'finished', elapsed: 40, result: { time: 40 }, length: 5000,
    rivals: ['NOVA', 'ORBIT', 'APEX'].map((name, i) => ({ name, finishTime: 41+i, distance: 4900, speed: 60 })),
  });
  assert.equal(cupStandings(legacy).length, 4);
  assert.throws(() => addCupResult(cup, heat('neon', { ...times, RIFT: Infinity })), /Invalid/);
});

test('Sprint validates eighth place in 8-car field', () => {
  const series = createSprintSeries(2);
  assert.equal(addSprintStage(series, { phase: 'finished', result: { time: 42, position: 8, score: 0 } }).results[0].position, 8);
});
