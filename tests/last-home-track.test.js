import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootHomeTrack, lastHomeTrack, rememberLastHomeTrack, restoreHomeTrack, withoutRacedQuery } from '../src/last-home-track.ts';

const playable = id => ['coast', 'neon', 'canyon'].includes(id);
const upcoming = id => id === 'dune-tempest' || id === 'frostbite-canyon';

test('the last confirmed course survives a fresh page and ignores empty choices', async () => {
  const stored = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  try {
    rememberLastHomeTrack('neon');
    rememberLastHomeTrack('canyon');
    rememberLastHomeTrack('');
    const freshPage = await import('../src/last-home-track.ts?fresh-page');
    assert.equal(freshPage.lastHomeTrack(), 'canyon');
  } finally {
    if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original;
  }
});

test('blocked storage still allows selecting and restoring a course during the same visit', async () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() { throw new Error('storage blocked'); },
    setItem() { throw new Error('storage blocked'); },
  };
  try {
    const freshPage = await import('../src/last-home-track.ts?blocked-storage');
    assert.equal(freshPage.lastHomeTrack(), null);
    freshPage.rememberLastHomeTrack('neon');
    assert.equal(freshPage.lastHomeTrack(), 'neon');
  } finally {
    if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original;
  }
});

test('legacy raced-course URLs open the raced course once before subsequent visits use the saved course', () => {
  const playable = id => id === 'taipei' || id === 'neon';
  assert.equal(bootHomeTrack('?raced=taipei', 'neon', playable), 'taipei');
  assert.equal(bootHomeTrack('', 'neon', playable), 'neon');
  assert.equal(bootHomeTrack('', null, playable), null);
  assert.equal(bootHomeTrack('?raced=locked', 'neon', playable), 'neon');
  assert.equal(bootHomeTrack('?stage2-preview=frostbite-canyon', 'neon', playable), 'neon');
  assert.equal(withoutRacedQuery('?raced=taipei'), '');
  assert.equal(withoutRacedQuery('?raced=taipei&shot=p02'), '?shot=p02');
});

test('returning to home restores the last picker course, including after Daily overwrote the race', () => {
  assert.deepEqual(restoreHomeTrack('neon', 'coast', playable, upcoming), { upcoming: null, trackId: 'neon' });
  assert.deepEqual(restoreHomeTrack('dune-tempest', 'coast', playable, upcoming), { upcoming: 'dune-tempest', trackId: 'coast' });
  assert.deepEqual(restoreHomeTrack(null, 'canyon', playable, upcoming), { upcoming: null, trackId: 'canyon' });
  assert.deepEqual(restoreHomeTrack(null, 'unknown', playable, upcoming), { upcoming: null, trackId: 'coast' });
});
