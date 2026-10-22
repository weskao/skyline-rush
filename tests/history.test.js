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
    rings: 4, perfectLines: 1, nitroUses: 2, longestCombo: 7, score: 900, fuelOuts: 0, gapFalls: 0, distance: 5000 });
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

test('top-three finishes permanently unlock the next track, even after history rolls over', async () => {
  const { loadUnlocks } = await import('../src/history.js');
  assert.equal(typeof loadUnlocks, 'function');
  const storage = memoryStorage();
  assert.deepEqual(loadUnlocks(storage), ['coast']);
  recordRace(finishedRace({ position: 4 }), storage);
  assert.deepEqual(loadUnlocks(storage), ['coast']);
  recordRace(finishedRace({ position: 3 }), storage);
  recordRace(finishedRace({ position: 2 }, { trackId: 'neon' }), storage);
  assert.deepEqual(loadUnlocks(storage), ['coast', 'neon', 'canyon']);
  for (let i = 0; i < 51; i++) recordRace(finishedRace({ position: 4 }), storage);
  assert.deepEqual(loadUnlocks(storage), ['coast', 'neon', 'canyon']);
  recordRace(finishedRace({ position: 1 }, { trackId: 'canyon' }), storage);
  assert.deepEqual(loadUnlocks(storage), ['coast', 'neon', 'canyon', 'aurora']);
  assert.deepEqual(loadUnlocks(throwingStorage), ['coast']);
});

test('unlock migration accepts only valid track finishes and ignores malformed progress', async () => {
  const { loadUnlocks } = await import('../src/history.js');
  assert.equal(typeof loadUnlocks, 'function');
  const storage = memoryStorage({
    'skyline-rush-unlocked': '["bad", null]',
    [HISTORY_KEY]: JSON.stringify([{ track: 'coast', position: 3, time: 70 }, { track: 'neon', position: 0, time: 65 }]),
  });
  assert.deepEqual(loadUnlocks(storage), ['coast', 'neon']);
});

test('the oldest qualifying legacy finish is migrated before the next save evicts it', async () => {
  const { loadUnlocks } = await import('../src/history.js');
  const history = Array.from({ length: 50 }, (_, i) => ({ track: i === 0 ? 'neon' : 'coast', position: i === 0 ? 2 : 4, time: 70 }));
  const storage = memoryStorage({ [HISTORY_KEY]: JSON.stringify(history) });
  recordRace(finishedRace({ position: 4 }), storage);
  assert.deepEqual(loadUnlocks(storage), ['coast', 'neon', 'canyon']);
});

test('medal rules: win, zero contacts, five PERFECT LINEs and a three-charge NITRO chain', async () => {
  const { medalsFor, MEDALS } = await import('../src/history.js');
  assert.deepEqual(MEDALS, ['first-win', 'clean-run', 'perfect-five', 'nitro-chain']);
  assert.deepEqual(medalsFor({ position: 1, collisions: 0, perfectLines: 5, nitroChain: 3 }), MEDALS);
  assert.deepEqual(medalsFor({ position: 2, collisions: 1, perfectLines: 4, nitroChain: 2, nitroUses: 3 }), []);
  assert.deepEqual(medalsFor({ position: 3, collisions: 0 }), ['clean-run']);
  assert.deepEqual(medalsFor(null), []);
});

test('medals are saved once with the first award date and only new ones are reported', async () => {
  const { recordMedals, loadMedals } = await import('../src/history.js');
  const storage = memoryStorage();
  const first = new Date('2026-10-01T10:00:00Z');
  assert.deepEqual(recordMedals({ position: 1, collisions: 2 }, storage, first), ['first-win']);
  assert.deepEqual(recordMedals({ position: 1, collisions: 0 }, storage, new Date('2026-10-02T10:00:00Z')), ['clean-run']);
  assert.deepEqual(loadMedals(storage), { 'first-win': first.toISOString(), 'clean-run': '2026-10-02T10:00:00.000Z' });
});

test('saved medals are validated and storage failures never throw', async () => {
  const { recordMedals, loadMedals } = await import('../src/history.js');
  const storage = memoryStorage({ 'skyline-rush-medals': JSON.stringify({ 'first-win': 'not a date', 'clean-run': '2026-10-02T10:00:00.000Z', hacked: '2026-10-02T10:00:00.000Z' }) });
  assert.deepEqual(loadMedals(storage), { 'clean-run': '2026-10-02T10:00:00.000Z' });
  assert.deepEqual(loadMedals(memoryStorage({ 'skyline-rush-medals': '[1,2]' })), {});
  assert.deepEqual(recordMedals({ position: 1 }, throwingStorage), ['first-win']);
  assert.deepEqual(loadMedals(throwingStorage), {});
});

test('paints unlock at 0 / 3 / 6 / 10 / 16 / 24 total stars and stay visual only', async () => {
  const { PAINTS, ownedPaints } = await import('../src/appearance.js');
  assert.deepEqual(Object.fromEntries(Object.entries(PAINTS).map(([id, paint]) => [id, paint.stars])), { pearl: 0, aurora: 3, glacier: 6, coral: 10, cobalt: 16, obsidian: 24 });
  assert.deepEqual(ownedPaints(0), ['pearl']);
  assert.deepEqual(ownedPaints(5), ['pearl', 'aurora']);
  assert.deepEqual(ownedPaints(23), ['pearl', 'aurora', 'glacier', 'coral', 'cobalt']);
  assert.deepEqual(ownedPaints(30), Object.keys(PAINTS));
  assert.deepEqual(ownedPaints(NaN), ['pearl']);
});

test('best stars are kept per track and summed; invalid saved stars are ignored', async () => {
  const { recordStars, loadStars, starTotal } = await import('../src/history.js');
  const storage = memoryStorage({ 'skyline-rush-stars': JSON.stringify({ coast: 2, neon: 7, nowhere: 3, canyon: 1.5 }) });
  assert.deepEqual(loadStars(storage), { coast: 2 });
  recordStars('coast', 1, storage);
  recordStars('neon', 3, storage);
  recordStars('canyon', 9, storage);
  assert.deepEqual(loadStars(storage), { coast: 2, neon: 3 });
  assert.equal(starTotal(loadStars(storage)), 5);
  recordStars('coast', 3, throwingStorage);
  assert.deepEqual(loadStars(throwingStorage), {});
});

test('the equipped paint is saved and falls back to pearl unless it is owned', async () => {
  const { loadPaint, savePaint } = await import('../src/history.js');
  const storage = memoryStorage();
  assert.equal(loadPaint(['pearl', 'coral'], storage), 'pearl');
  savePaint('coral', storage);
  assert.equal(loadPaint(['pearl', 'coral'], storage), 'coral');
  assert.equal(loadPaint(['pearl'], storage), 'pearl');
  assert.equal(loadPaint(['pearl', 'coral'], memoryStorage({ 'skyline-rush-paint': '"toString"' })), 'pearl');
  savePaint('coral', throwingStorage);
  assert.equal(loadPaint(['pearl', 'coral'], throwingStorage), 'pearl');
});

test('history keeps charge run-outs and gap falls for tuning, defaulting to 0 on old results', () => {
  const record = recordRace(finishedRace({ fuelOuts: 2, gapFalls: 1 }), memoryStorage());
  assert.deepEqual([record.fuelOuts, record.gapFalls], [2, 1]);
  const legacy = recordRace(finishedRace(), memoryStorage());
  assert.deepEqual([legacy.fuelOuts, legacy.gapFalls], [0, 0]);
});
