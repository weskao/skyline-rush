import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCup, addCupResult } from '../src/championship-cup.ts';
import { loadCupProgress, saveCupProgress, retryCupHeat } from '../src/cup-progress.ts';
import { clearLocalProgress } from '../src/cloud-progress.ts';

const tracks = ['coast', 'neon', 'canyon'];
const key = 'skyline-rush-cup-progress-v1';
const finish = trackId => ({ trackId, phase: 'finished', elapsed: 40, length: 5000,
  result: { time: 40 }, rivals: ['NOVA', 'ORBIT', 'APEX'].map((name, i) =>
    ({ name, finishTime: 41 + i, distance: 4900, speed: 60 })) });
const partial = () => addCupResult(createCup(tracks, 'coast'), finish('coast'));
function memory(raw = null) {
  const values = new Map(raw === null ? [] : [[key, raw]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('Cup checkpoints round-trip finished heats without mutating live standings', () => {
  const store = memory();
  const cup = partial();
  saveCupProgress(cup, store);
  assert.deepEqual(loadCupProgress(tracks, store), cup);
  assert.equal(loadCupProgress(tracks, store).results.length, 1);
  assert.equal(store.getItem('skyline-rush-unlocked'), null);
});

test('Cup recovery rejects bad versions, bounds, drivers, ordering and locked courses', () => {
  const cup = partial();
  const invalid = [null, {}, { version: 2, cup }, { version: 1, cup: { ...cup, tracks: ['coast', 'coast', 'neon'] } },
    { version: 1, cup: { ...cup, results: [{ ...cup.results[0], times: { YOU: 40 } }] } },
    { version: 1, cup: { ...cup, results: [{ ...cup.results[0], order: ['APEX', 'ORBIT', 'NOVA', 'YOU'] }] } }];
  for (const value of invalid) assert.equal(loadCupProgress(tracks, memory(JSON.stringify(value))), null);
  assert.equal(loadCupProgress(tracks, memory('{')), null);
  assert.equal(loadCupProgress(tracks, memory(' '.repeat(16_385))), null);
  assert.equal(loadCupProgress(['coast', 'neon'], memory(JSON.stringify({ version: 1, cup }))), null);
});

test('retrying a finished heat rolls back only that heat; next heat retains points', () => {
  const cup = addCupResult(partial(), finish('neon'));
  assert.deepEqual(retryCupHeat(cup, 'neon').results.map(heat => heat.track), ['coast']);
  assert.deepEqual(retryCupHeat(cup, 'canyon'), cup);
  assert.deepEqual(cup.results.map(heat => heat.track), ['coast', 'neon']);
  assert.throws(() => retryCupHeat(cup, 'cosmic'), /Cup/);
});

test('completed or discarded Cups cannot be offered again; storage denial never blocks a race', () => {
  const store = memory();
  saveCupProgress(partial(), store);
  saveCupProgress(null, store);
  assert.equal(loadCupProgress(tracks, store), null);
  const completed = addCupResult(addCupResult(partial(), finish('neon')), finish('canyon'));
  saveCupProgress(completed, store);
  assert.equal(loadCupProgress(tracks, store), null);
  const blocked = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
  assert.equal(loadCupProgress(tracks, blocked), null);
  assert.doesNotThrow(() => saveCupProgress(partial(), blocked));
});

test('clearing game progress removes Cup recovery without erasing device preferences', () => {
  const store = memory();
  saveCupProgress(partial(), store);
  store.setItem('skyline-rush-controls', 'saved controls');
  store.setItem('skyline-rush-music', 'off');
  assert.equal(clearLocalProgress(store), true);
  assert.equal(loadCupProgress(tracks, store), null, 'deleted Cup standings must never reappear after tracks unlock again');
  assert.equal(store.getItem('skyline-rush-controls'), 'saved controls');
  assert.equal(store.getItem('skyline-rush-music'), 'off');
  const blocked = { ...store, removeItem(key) { if (key === 'skyline-rush-cup-progress-v1') throw Error('denied'); } };
  assert.equal(clearLocalProgress(blocked), false, 'a failed recovery deletion must keep the existing deletion guard active');
});
