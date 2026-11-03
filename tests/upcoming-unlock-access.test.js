import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';
import { isUpcomingEnterable as released } from '../src/access/production.ts';
import { isUpcomingEnterable as unlocked } from '../src/access/dev-unlocked.ts';

test('make dev-unlocked enters a Coming Soon card only when its race runtime exists', () => {
  for (const id of Object.keys(UPCOMING_TRACKS)) {
    assert.equal(RACE_TRACKS[id], undefined, `${id} has no runtime yet`);
    assert.equal(unlocked(id), false, `${id} stays Coming Soon even when unlocked`);
  }
  RACE_TRACKS['frostbite-canyon'] = RACE_TRACKS.coast; // stand-in for a finished runtime
  try { assert.equal(unlocked('frostbite-canyon'), true); } finally { delete RACE_TRACKS['frostbite-canyon']; }
});

test('release builds never enter a Coming Soon card, finished or not', () => {
  RACE_TRACKS['frostbite-canyon'] = RACE_TRACKS.coast;
  try { for (const id of Object.keys(UPCOMING_TRACKS)) assert.equal(released(id), false); } finally { delete RACE_TRACKS['frostbite-canyon']; }
});
