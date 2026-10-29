import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { racePresentationView, racePresentationFor, updateRaceSetup } from '../src/race-presentation-ui.ts';

test('preparing another track preview does not discard the current race preset when a swipe is canceled', () => {
  updateRaceSetup(createRace('coast', { mode: 'custom' }, { visualPreset: 'night' }));
  racePresentationView.visualPreset = 'night';
  assert.deepEqual(racePresentationFor('custom', 'neon'), { visualPreset: 'track' });
  assert.equal(racePresentationView.visualPreset, 'night');
  assert.deepEqual(racePresentationFor('custom', 'coast'), { visualPreset: 'night' });
  updateRaceSetup(createRace('neon', { mode: 'custom' }));
  assert.equal(racePresentationView.visualPreset, 'track');
});
