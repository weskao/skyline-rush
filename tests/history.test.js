import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_KEY, BEST_KEY, LEGACY_BEST_KEY, HISTORY_LIMIT, loadHistory, recordRace, loadBests, recordBest, careerStats } from '../src/history.js';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); } };
};
const throwingStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
const withBlockedLocalStorage = fn => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try { return fn(); } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
  }
};
const finishedRace = (result = {}, extra = {}) => ({
  trackId: 'coast', length: 5000, result: { position: 1, time: 61.5, collisions: 2, nearMisses: 3, ...result }, ...extra,
});

test('a finished race is saved as one record with every field', () => {
  const storage = memoryStorage();
  const race = finishedRace({ rings: 4, perfectLines: 1, nitroUses: 2, longestCombo: 7, score: 900 });
  const record = recordRace(race, storage, new Date('2026-01-02T03:04:05Z'));
  assert.deepEqual(record, { date: '2026-01-02T03:04:05.000Z', track: 'coast', position: 1, time: 61.5, collisions: 2, nearMisses: 3,
    rings: 4, perfectLines: 1, nitroUses: 2, longestCombo: 7, score: 900, distance: 5000 });
  assert.deepEqual(loadHistory(storage), [record]);
});

test('missing result keys default to zero and a missing trackId is coast', () => {
  const record = recordRace({ result: { position: 3, time: 70 } }, memoryStorage());
  assert.equal(record.track, 'coast');
  assert.deepEqual([record.rings, record.perfectLines, record.nitroUses, record.longestCombo, record.score, record.collisions, record.distance], [0, 0, 0, 0, 0, 0, 0]);
});

test('history keeps only the latest 50 records', () => {
  const storage = memoryStorage();
  for (let i = 0; i < HISTORY_LIMIT + 5; i++) recordRace(finishedRace({ score: i }), storage);
  const history = loadHistory(storage);
  assert.equal(history.length, 50);
  assert.equal(history[0].score, 5);
  assert.equal(history.at(-1).score, 54);
});

test('corrupt history reads as empty and is replaced on the next save', () => {
  const storage = memoryStorage({ [HISTORY_KEY]: '{not json' });
  assert.deepEqual(loadHistory(storage), []);
  storage.data[HISTORY_KEY] = '{"a":1}';
  assert.deepEqual(loadHistory(storage), []);
  recordRace(finishedRace(), storage);
  assert.equal(loadHistory(storage).length, 1);
});

test('best time is stored per track and only improves', () => {
  const storage = memoryStorage();
  assert.deepEqual(recordBest('coast', 60, storage), { best: 60, record: true });
  assert.deepEqual(recordBest('coast', 65, storage), { best: 60, record: false });
  assert.deepEqual(recordBest('coast', 55, storage), { best: 55, record: true });
  assert.deepEqual(recordBest('alpine', 90, storage), { best: 90, record: true });
  assert.deepEqual(loadBests(storage), { coast: 55, alpine: 90 });
  assert.deepEqual(JSON.parse(storage.data[BEST_KEY]), { coast: 55, alpine: 90 });
});

test('invalid best times never replace a saved best or create a new record', () => {
  for (const time of [NaN, Infinity, -Infinity, 0, -1, '55', null, undefined]) {
    const storage = memoryStorage({ [BEST_KEY]: '{"coast":60}' });
    assert.deepEqual(recordBest('coast', time, storage), { best: 60, record: false });
    assert.deepEqual(recordBest('aurora', time, storage), { best: undefined, record: false });
    assert.deepEqual(loadBests(storage), { coast: 60 });
    assert.equal(storage.data[BEST_KEY], '{"coast":60}');
  }
});

test('a failed best write preserves the stored best and still returns the session result', () => {
  const storage = memoryStorage({ [BEST_KEY]: '{"coast":60}' });
  storage.setItem = () => { throw new Error('quota exceeded'); };
  assert.deepEqual(recordBest('coast', 55, storage), { best: 55, record: true });
  assert.deepEqual(loadBests(storage), { coast: 60 });
});

test('the old single best migrates to coast once and the old key stays', () => {
  const storage = memoryStorage({ [LEGACY_BEST_KEY]: '72.5' });
  assert.deepEqual(loadBests(storage), { coast: 72.5 });
  assert.equal(storage.data[LEGACY_BEST_KEY], '72.5');
  assert.deepEqual(JSON.parse(storage.data[BEST_KEY]), { coast: 72.5 });
  assert.deepEqual(recordBest('coast', 80, storage), { best: 72.5, record: false });
});

test('migration never overwrites a better coast time or other tracks', () => {
  const storage = memoryStorage({ [LEGACY_BEST_KEY]: '90', [BEST_KEY]: '{"coast":60,"alpine":80}' });
  assert.deepEqual(loadBests(storage), { coast: 60, alpine: 80 });
  assert.deepEqual(JSON.parse(storage.data[BEST_KEY]), { coast: 60, alpine: 80 });
});

test('a garbage legacy value is ignored', () => {
  for (const bad of ['abc', '0', '-3', '']) assert.deepEqual(loadBests(memoryStorage({ [LEGACY_BEST_KEY]: bad })), {});
});

test('career stats are derived from history', () => {
  const history = [
    { position: 1, distance: 5000, longestCombo: 4, rings: 3 },
    { position: 3, distance: 5000, longestCombo: 9, rings: 1 },
    { position: 1, distance: 4000, longestCombo: 2, rings: 8 },
  ];
  assert.deepEqual(careerStats(history), { races: 3, wins: 2, totalDistance: 14000, longestCombo: 9, mostRings: 8 });
  assert.deepEqual(careerStats([]), { races: 0, wins: 0, totalDistance: 0, longestCombo: 0, mostRings: 0 });
  assert.deepEqual(careerStats(undefined), { races: 0, wins: 0, totalDistance: 0, longestCombo: 0, mostRings: 0 });
});

test('a storage object that throws never throws out of the module', () => {
  assert.deepEqual(loadHistory(throwingStorage), []);
  assert.equal(recordRace(finishedRace(), throwingStorage).track, 'coast');
  assert.deepEqual(loadBests(throwingStorage), {});
  assert.deepEqual(recordBest('coast', 60, throwingStorage), { best: 60, record: true });
});

test('a throwing localStorage getter never throws out of the module', () => {
  withBlockedLocalStorage(() => {
    assert.deepEqual(loadHistory(), []);
    assert.equal(recordRace(finishedRace()).track, 'coast');
    assert.deepEqual(loadBests(), {});
    assert.deepEqual(recordBest('coast', 60), { best: 60, record: true });
  });
});
