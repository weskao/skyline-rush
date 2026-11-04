import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { UPCOMING_TRACKS, homeTrackStatus, upcomingReadiness } from '../src/upcoming-tracks.ts';
import { isUpcomingEnterable as released } from '../src/access/production.ts';
import { isUpcomingEnterable as unlocked } from '../src/access/dev-unlocked.ts';

test('only explicitly playable Coming Soon tracks can START in make dev-unlocked', () => {
  for (const id of Object.keys(UPCOMING_TRACKS)) {
    assert.equal(RACE_TRACKS[id], undefined, `${id} stays out of the campaign sprint catalog`);
    assert.equal(upcomingReadiness(id), id === 'frostbite-canyon' ? 'playable' : 'preview', id);
    assert.equal(unlocked(id), id === 'frostbite-canyon', id);
  }
  assert.equal(upcomingReadiness('unknown-track'), 'preview');
});

test('adding a runtime alone cannot unlock a concept-only Coming Soon track', () => {
  RACE_TRACKS['dune-tempest'] = RACE_TRACKS.coast; // pretend a developer registered a partial runtime
  try {
    assert.equal(unlocked('dune-tempest'), false);
  } finally {
    delete RACE_TRACKS['dune-tempest'];
  }
  assert.equal(unlocked('coast'), false, 'the upcoming-only gate must not accept normal tracks');
  assert.equal(unlocked('unknown-track'), false);
});

test('release builds always label Coming Soon cards and disable their START, despite saved unlocks or runtimes', () => {
  const savedUnlocks = new Set(Object.keys(UPCOMING_TRACKS));
  for (const id of Object.keys(UPCOMING_TRACKS)) {
    assert.equal(homeTrackStatus(id, savedUnlocks), 'coming-soon', id);
    assert.equal(released(id), false, id);
  }
  RACE_TRACKS['dune-tempest'] = RACE_TRACKS.coast;
  try {
    assert.equal(released('dune-tempest'), false, 'a runtime must not activate a preview in production');
  } finally {
    delete RACE_TRACKS['dune-tempest'];
  }
});
