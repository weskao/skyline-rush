import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { createRaceObjective, raceCompletion } from '../src/race-objectives.js';

// MODE-00 RED: a mode's win condition must not be inferred from route length alone.
test('every shipped mode has an explicit serializable objective', () => {
  const expected = {
    classic: 'placement', custom: 'placement', free: 'no-auto-finish',
    time: 'finish-time', gauntlet: 'placement', checkpoint: 'checkpoint-timer',
    cup: 'placement', stunt: 'timed-score', elimination: 'survival',
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

test('Free Drive and Elimination never auto-finish at the authored route end', () => {
  for (const mode of ['free', 'elimination']) {
    const race = createRace('coast', { mode });
    assert.equal(race.objective.type, mode === 'free' ? 'no-auto-finish' : 'survival');
    race.player.distance = race.length;
    assert.deepEqual(raceCompletion(race), { done: false, reason: null });
  }
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
