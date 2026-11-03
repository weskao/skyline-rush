import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';
import { isUpcomingEnterable as released } from '../src/access/production.ts';
import { isUpcomingEnterable as unlocked } from '../src/access/dev-unlocked.ts';

// Frostbite Canyon has a gated race runtime (`raceTrack`); the Stage 1 five do not.
const RUNTIME = new Set(['frostbite-canyon']);

test('make dev-unlocked enters a Coming Soon card only when its race runtime exists', () => {
  for (const id of Object.keys(UPCOMING_TRACKS)) {
    assert.equal(RACE_TRACKS[id], undefined, `${id} stays out of the sprint catalog`);
    assert.equal(unlocked(id), RUNTIME.has(id), id);
  }
  RACE_TRACKS['dune-tempest'] = RACE_TRACKS.coast; // stand-in for a finished runtime
  try { assert.equal(unlocked('dune-tempest'), true); } finally { delete RACE_TRACKS['dune-tempest']; }
});

test('release builds never enter a Coming Soon card, finished or not', () => {
  for (const id of Object.keys(UPCOMING_TRACKS)) assert.equal(released(id), false);
});
