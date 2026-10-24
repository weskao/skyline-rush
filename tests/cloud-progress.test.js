import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeUnlocks, mergeProgress, readLocalProgress, saveLocalProgress, clearLocalProgress, claimCloudOwner, cloudFailureStatus } from '../src/cloud-progress.js';

test('cloud failure status reports whether a durable device copy exists', () => {
  assert.equal(cloudFailureStatus({ code: 'unavailable' }, false), 'cloud.localFailed');
  assert.equal(cloudFailureStatus({ code: 'unavailable' }, true), 'cloud.pending');
  assert.equal(cloudFailureStatus({ code: 'resource-exhausted' }, true), 'cloud.quota');
  assert.equal(cloudFailureStatus({ code: 'permission-denied' }, true), 'cloud.failed');
});

test('cloud unlocks merge with existing device progress in track order', () => {
  assert.deepEqual(mergeUnlocks(['coast', 'neon'], ['coast', 'canyon']), ['coast', 'neon', 'canyon']);
});

test('unknown and duplicate cloud tracks cannot enter progression', () => {
  assert.deepEqual(mergeUnlocks(['neon', 'neon'], ['wrong', 'cosmic']), ['coast', 'neon', 'cosmic']);
  assert.deepEqual(mergeUnlocks([], null), ['coast']);
});

test('legacy map save upgrades without losing local results', () => {
  const run = { date: '2026-10-23T00:00:00.000Z', track: 'coast', position: 1, time: 60, distance: 5000 };
  const local = { version: 2, unlocked: ['coast', 'neon'], stars: { coast: 2 }, bests: { coast: 60 },
    medals: { 'first-win': run.date }, history: [run], modeHistory: [], daily: [] };
  const merged = mergeProgress(local, { version: 1, unlocked: ['coast', 'canyon'] });
  assert.deepEqual(merged.unlocked, ['coast', 'neon', 'canyon']);
  assert.deepEqual(merged.stars, { coast: 2 });
  assert.deepEqual(merged.bests, { coast: 60 });
  assert.equal(merged.history.length, 1);
  assert.equal(merged.version, 2);
});

test('cloud merge keeps higher stars, lower times, earliest medals and unique latest runs', () => {
  const first = { date: '2026-10-21T00:00:00.000Z', track: 'coast', position: 1, time: 60, distance: 5000 };
  const second = { date: '2026-10-22T00:00:00.000Z', track: 'neon', position: 2, time: 70, distance: 4000 };
  const local = { version: 2, unlocked: ['coast', 'neon'], stars: { coast: 1 }, bests: { coast: 60 },
    medals: { 'first-win': '2026-10-22T00:00:00.000Z' }, history: [first, second], modeHistory: [], daily: [] };
  const cloud = { version: 2, unlocked: ['coast'], stars: { coast: 3 }, bests: { coast: 55 },
    medals: { 'first-win': '2026-10-20T00:00:00.000Z' }, history: [first], modeHistory: [], daily: [] };
  const merged = mergeProgress(local, cloud);
  assert.deepEqual(merged.stars, { coast: 3 });
  assert.deepEqual(merged.bests, { coast: 55 });
  assert.deepEqual(merged.medals, { 'first-win': '2026-10-20T00:00:00.000Z' });
  assert.deepEqual(merged.history.map(run => run.track), ['coast', 'neon']);
  assert.deepEqual(mergeProgress(merged, cloud), merged);
});

test('an unranked Classic result remains in history without unlocking a track', () => {
  const run = { date: '2026-10-23T00:00:00.000Z', track: 'coast', position: 0, time: 75, distance: 5000 };
  const merged = mergeProgress({ unlocked: ['coast'], history: [run] });
  assert.equal(merged.history.length, 1);
  assert.deepEqual(merged.unlocked, ['coast']);
});

test('mode and daily records merge independently without duplicates', () => {
  const mode = { date: '2026-10-21T00:00:00.000Z', mode: 'time', track: 'coast', rules: '{"mode":"time"}', time: 65, position: 1 };
  const daily = { id: '2026-10-22', track: 'coast', modifier: 'no-flight', time: 67, position: 2, score: 500,
    date: '2026-10-22T00:00:00.000Z' };
  const merged = mergeProgress({ unlocked: ['coast'], history: [], modeHistory: [mode], daily: [daily] },
    { version: 2, unlocked: ['coast'], modeHistory: [mode], daily: [daily] });
  assert.equal(merged.history.length, 0);
  assert.equal(merged.modeHistory.length, 1);
  assert.equal(merged.daily.length, 1);
  assert.deepEqual(mergeProgress(merged, merged), merged);
});

test('the largest accepted progress history stays well below one Firestore document', () => {
  const modeHistory = Array.from({ length: 50 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 9, 20, 0, i)).toISOString(), mode: 'time', track: 'coast',
    rules: 'x'.repeat(2000), time: 60 + i, position: 1,
  }));
  const progress = mergeProgress({ modeHistory });
  assert.equal(progress.modeHistory.length, 50);
  assert.ok(Buffer.byteLength(JSON.stringify(progress), 'utf8') < 256 * 1024);
});

test('malformed cloud star values cannot overrule a valid result', () => {
  const merged = mergeProgress({ stars: { coast: 2 } }, { version: 2, stars: { coast: '3', neon: 5 } });
  assert.deepEqual(merged.stars, { coast: 2 });
});

test('unknown future cloud schema is never overwritten', () => {
  assert.throws(() => mergeProgress({ unlocked: ['coast'] }, { version: 3, unlocked: ['coast'] }), /Unsupported/);
});

test('device progress binds to the first account before network sync', () => {
  assert.equal(claimCloudOwner(null, 'alice'), 'alice');
  assert.equal(claimCloudOwner('alice', 'alice'), 'alice');
  assert.equal(claimCloudOwner('alice', 'bob'), null);
});

test('restored progress writes only game results to local storage', () => {
  const data = new Map([['skyline-rush-vfx', 'kept']]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const progress = mergeProgress({ unlocked: ['coast', 'neon'], stars: { neon: 2 }, bests: {}, medals: {}, history: [], modeHistory: [], daily: [] });
  saveLocalProgress(progress, storage);
  assert.deepEqual(readLocalProgress(storage).unlocked, ['coast', 'neon']);
  assert.deepEqual(readLocalProgress(storage).stars, { neon: 2 });
  assert.equal(data.get('skyline-rush-vfx'), 'kept');
});

test('account switch clears all race results including legacy best but keeps device settings', () => {
  const data = new Map([
    ['skyline-rush-unlocked', '["coast","neon"]'],
    ['skyline-rush-best', '60'],
    ['skyline-rush-history', '[]'],
    ['skyline-rush-vfx', 'low'],
  ]);
  const storage = { getItem: key => data.get(key) ?? null, removeItem: key => data.delete(key) };
  assert.equal(clearLocalProgress(storage), true);
  assert.deepEqual(readLocalProgress(storage).unlocked, ['coast']);
  assert.deepEqual(readLocalProgress(storage).bests, {});
  assert.equal(data.get('skyline-rush-vfx'), 'low');
});

test('an empty browser store recovers all account progress fields', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const remote = mergeProgress({ unlocked: ['coast', 'neon'], stars: { coast: 2 }, bests: { coast: 60 },
    medals: { 'first-win': '2026-10-23T00:00:00.000Z' },
    history: [{ date: '2026-10-23T00:00:00.000Z', track: 'coast', position: 1, time: 60 }],
    modeHistory: [{ date: '2026-10-23T00:00:00.000Z', mode: 'time', track: 'coast', rules: '{}', time: 61 }],
    daily: [{ id: '2026-10-23', date: '2026-10-23T00:00:00.000Z', track: 'coast', modifier: 'no-flight', time: 62, position: 1, score: 100 }] });
  saveLocalProgress(mergeProgress(readLocalProgress(storage), remote), storage);
  const restored = readLocalProgress(storage);
  for (const field of ['unlocked', 'stars', 'bests', 'medals', 'history', 'modeHistory', 'daily'])
    assert.deepEqual(restored[field], remote[field], field);
});
