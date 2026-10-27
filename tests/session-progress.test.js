import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadSessionProgress, adoptProgress, progressSnapshot } from '../src/session-progress.ts';
import { createGhostStore } from '../src/ghost-store.ts';

const memoryStorage = () => {
  const store = new Map();
  return { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
};

test('session progress and ghost caches have one owner each, not loose variables in main.js', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const moved of [/let sessionHistory/, /const sessionBests/, /let sessionMedals/, /let sessionDaily/, /const ghosts = \{\}/, /const modeGhosts/])
    assert.doesNotMatch(main, moved);
});

test('adopting merged progress unions unlocks, keeps object identity for bests/stars and replaces run lists', () => {
  globalThis.localStorage = memoryStorage();
  const progress = loadSessionProgress(['coast']);
  const { bests, stars } = progress;
  adoptProgress(progress, { version: 2, unlocked: ['coast', 'neon'], stars: { coast: 2 }, bests: { coast: 61.5 }, medals: { first: '2026-01-01' },
    history: [{ date: '2026-01-01' }], modeHistory: [], daily: [] });
  assert.deepEqual([...progress.unlocked], ['coast', 'neon']);
  assert.equal(progress.bests, bests);
  assert.equal(progress.stars, stars);
  assert.equal(progress.bests.coast, 61.5);
  assert.equal(progress.stars.coast, 2);
  assert.deepEqual(progress.medals, { first: '2026-01-01' });
  assert.equal(progress.history.length, 1);
  delete globalThis.localStorage;
});

test('the progress snapshot prefers session bests over stored ones and lists unlocked tracks', () => {
  globalThis.localStorage = memoryStorage();
  const progress = loadSessionProgress(['coast', 'neon']);
  progress.bests.coast = 50;
  const snapshot = progressSnapshot(progress);
  assert.deepEqual(snapshot.unlocked, ['coast', 'neon']);
  assert.equal(snapshot.bests.coast, 50);
  assert.equal(snapshot.stars, progress.stars);
  delete globalThis.localStorage;
});

test('ghosts load once per track or ruleset and a saved ghost is stored and replaces the cached one', () => {
  globalThis.localStorage = memoryStorage();
  const ghosts = createGhostStore();
  assert.equal(ghosts.classic('coast'), null);
  const race = { trackId: 'coast', config: { mode: 'time' } };
  assert.equal(ghosts.mode(race), null);
  const ghost = { time: 60, samples: [[0, 0, 0]] };
  ghosts.saveClassic('coast', ghost);
  assert.equal(ghosts.classic('coast'), ghost);
  ghosts.saveMode(race, ghost);
  assert.equal(ghosts.mode(race), ghost);
  delete globalThis.localStorage;
});
