import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRaceObjective, raceCompletion } from '../src/race-objectives.ts';

test('typed objective contracts preserve immutable mode behavior', () => {
  assert.deepEqual(createRaceObjective({ mode: 'cup' }), { type: 'stage-points' });
  assert.equal(Object.isFrozen(createRaceObjective({ mode: 'time' })), true);
  assert.deepEqual(createRaceObjective({ mode: 'stunt', duration: 180 }), {
    type: 'timed-score', durationSeconds: 180, routeEndAllowed: true,
  });
  assert.equal(createRaceObjective({ mode: 'stunt', duration: 999 }).durationSeconds, 120);
  assert.throws(() => createRaceObjective({ mode: 'invalid' }), /Unknown race mode/);
});

test('typed completion preserves route, checkpoint, timer and endless modes', () => {
  const race = { mode: 'classic', player: { distance: 100 }, length: 100, elapsed: 10 };
  assert.deepEqual(raceCompletion(race), { done: true, reason: 'route' });
  assert.deepEqual(raceCompletion({ ...race, mode: 'free' }), { done: true, reason: 'route' });
  assert.deepEqual(raceCompletion({ ...race, mode: 'free', objective: { type: 'no-auto-finish' } }), { done: false, reason: null });
  assert.deepEqual(raceCompletion({ ...race, mode: 'checkpoint', checkpoint: { expired: true } }),
    { done: true, reason: 'expired' });
  assert.deepEqual(raceCompletion({ ...race, mode: 'stunt', length: 200, elapsed: 180, stuntLimit: 180 }),
    { done: true, reason: 'timer' });
  assert.equal(existsSync(new URL('../src/race-objectives.js', import.meta.url)), false);
});
