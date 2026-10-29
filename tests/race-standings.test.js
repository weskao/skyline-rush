import test from 'node:test';
import assert from 'node:assert/strict';
import { racePosition, sprintGaps } from '../src/race-standings.ts';
import { racePosition as legacyPosition, sprintGaps as legacyGaps } from '../src/game.js';

test('typed standings preserve the original game.js API and exclude finished rivals from live gaps', () => {
  assert.equal(legacyPosition, racePosition);
  assert.equal(legacyGaps, sprintGaps);
  const race = {
    player: { distance: 120 },
    result: null,
    rivals: [
      { distance: 160, finishTime: null },
      { distance: 97, finishTime: null },
      { distance: 115, finishTime: null },
      { distance: 140, finishTime: 14 },
    ],
  };
  assert.equal(racePosition(race), 3, 'live overall position still includes finished rivals');
  assert.deepEqual(sprintGaps(race), { ahead: 40, behind: 5 });
  assert.deepEqual(race.rivals.map(rival => rival.distance), [160, 97, 115, 140], 'readers do not mutate race state');
});

test('standings preserve final position, empty-gaps and tie semantics', () => {
  const race = {
    player: { distance: 120 },
    result: { position: 2 },
    rivals: [{distance: 120, finishTime: null}, {distance: 155, finishTime: 5}],
  };
  assert.equal(racePosition(race), 2);
  assert.deepEqual(sprintGaps(race), {ahead: null, behind: null});
  race.result = null;
  assert.equal(racePosition(race), 2, 'only the strictly-ahead rival affects position');
  race.rivals = [];
  assert.equal(racePosition(race), 1);
  assert.deepEqual(sprintGaps(race), {ahead: null, behind: null});
});
