import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastHomeTrack, rememberLastHomeTrack, restoreHomeTrack } from '../src/last-home-track.ts';

const playable = id => ['coast', 'neon', 'canyon'].includes(id);
const upcoming = id => id === 'dune-tempest' || id === 'frostbite-canyon';

test('remembering a home course keeps it in memory and never writes storage', () => {
  const storage = { local: 0, session: 0 };
  const local = globalThis.localStorage, session = globalThis.sessionStorage;
  globalThis.localStorage = { getItem() { return null; }, setItem() { storage.local++; } };
  globalThis.sessionStorage = { getItem() { return null; }, setItem() { storage.session++; } };
  try {
    rememberLastHomeTrack('neon');
    assert.equal(lastHomeTrack(), 'neon');
    rememberLastHomeTrack('canyon');
    assert.equal(lastHomeTrack(), 'canyon');
    rememberLastHomeTrack('');
    assert.equal(lastHomeTrack(), 'canyon');
    assert.equal(storage.local, 0);
    assert.equal(storage.session, 0);
  } finally {
    if (local === undefined) delete globalThis.localStorage; else globalThis.localStorage = local;
    if (session === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = session;
  }
});

test('returning to home restores the last picker course, including after Daily overwrote the race', () => {
  assert.deepEqual(restoreHomeTrack('neon', 'coast', playable, upcoming), { upcoming: null, trackId: 'neon' });
  assert.deepEqual(restoreHomeTrack('dune-tempest', 'coast', playable, upcoming), { upcoming: 'dune-tempest', trackId: 'coast' });
  assert.deepEqual(restoreHomeTrack(null, 'canyon', playable, upcoming), { upcoming: null, trackId: 'canyon' });
  assert.deepEqual(restoreHomeTrack(null, 'unknown', playable, upcoming), { upcoming: null, trackId: 'coast' });
});
