import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { createRaceObjective, raceCompletion } from '../src/race-objectives.ts';

// MODE-00 RED: a mode's win condition must not be inferred from route length alone.
test('every shipped mode has an explicit serializable objective', () => {
  const expected = {
    classic: 'placement', custom: 'placement', free: 'route-end',
    time: 'finish-time', gauntlet: 'placement', checkpoint: 'checkpoint-timer',
    cup: 'stage-points', stunt: 'timed-score', elimination: 'survival',
  };
  for (const [mode, type] of Object.entries(expected)) {
    const objective = createRaceObjective({ mode, ...(mode === 'stunt' ? { duration: 180 } : {}) });
    assert.equal(objective.type, type, mode);
    assert.equal(Object.isFrozen(objective), true, mode);
    assert.deepEqual(JSON.parse(JSON.stringify(objective)), objective, mode);
  }
  assert.deepEqual(createRaceObjective({ mode: 'stunt', duration: 180 }), {
    type: 'timed-score', durationSeconds: 180, routeEndAllowed: true,
  });
  assert.throws(() => createRaceObjective({ mode: 'bogus' }), /mode/i);
});

test('Elimination never auto-finishes at the authored route end', () => {
  const race = createRace('coast', { mode: 'elimination' });
  race.player.distance = race.length;
  assert.deepEqual(raceCompletion(race), { done: false, reason: null });
});

test('Free Drive finishes at the authored route end and not before', () => {
  const race = createRace('coast', { mode: 'free' });
  race.player.distance = race.length - 1;
  assert.deepEqual(raceCompletion(race), { done: false, reason: null });
  race.player.distance = race.length;
  assert.deepEqual(raceCompletion(race), { done: true, reason: 'route' });
});

test('Timed style scores finish by timer OR route end, without pretending they are laps', () => {
  const race = createRace('coast', { mode: 'stunt', duration: 120 });
  assert.deepEqual(raceCompletion(race), { done: false, reason: null });
  race.elapsed = 120;
  assert.deepEqual(raceCompletion(race), { done: true, reason: 'timer' });
  race.elapsed = 40;
  race.player.distance = race.length;
  assert.deepEqual(raceCompletion(race), { done: true, reason: 'route' });
});

test('Checkpoint expiry and route finish have distinct completion reasons', () => {
  const race = createRace('coast', { mode: 'checkpoint' });
  assert.deepEqual(raceCompletion(race), { done: false, reason: null });
  race.checkpoint.expired = true;
  assert.deepEqual(raceCompletion(race), { done: true, reason: 'expired' });
  race.checkpoint.expired = false;
  race.player.distance = race.length;
  assert.deepEqual(raceCompletion(race), { done: true, reason: 'route' });
});

test('Classic, Daily and Time Attack keep the authored finish boundary', () => {
  for (const race of [
    createRace('coast'),
    createRace('coast', 'double-traffic'),
    createRace('coast', { mode: 'time' }),
  ]) {
    assert.deepEqual(raceCompletion(race), { done: false, reason: null });
    race.player.distance = race.length;
    assert.deepEqual(raceCompletion(race), { done: true, reason: 'route' });
  }
});

test('Championship is an explicit stage-points objective, not a fake lap or a single race victory', () => {
  const race = createRace('coast', { mode: 'cup', cupTracks: ['coast', 'neon', 'canyon'] });
  assert.equal(race.objective.type, 'stage-points');
  assert.deepEqual(raceCompletion(race), { done: false, reason: null });
  race.player.distance = race.length;
  assert.deepEqual(raceCompletion(race), { done: true, reason: 'route' });
  assert.equal(createRaceObjective({ mode: 'cup' }).type, 'stage-points');
});
