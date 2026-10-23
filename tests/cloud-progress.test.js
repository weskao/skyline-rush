import test from 'node:test';
import assert from 'node:assert/strict';
import { careerStats } from '../src/history.js';
import { mergeUnlocks, mergeProgress, readLocalProgress, saveLocalProgress, switchCloudAccount, readCloudSyncStatus, writeCloudSyncStatus } from '../src/cloud-progress.js';

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

test('unknown future cloud schema is never overwritten', () => {
  assert.throws(() => mergeProgress({ unlocked: ['coast'] }, { version: 3, unlocked: ['coast'] }), /Unsupported/);
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

test('switching Google accounts snapshots A and restores B without leaking progress or changing device settings', () => {
  const data = new Map([['skyline-rush-vfx', '{"quality":"low"}']]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  saveLocalProgress(mergeProgress({ unlocked: ['coast', 'neon'], stars: { neon: 3 }, bests: { neon: 66 } }), storage);
  data.set('skyline-rush-cloud-owner', 'player-A');
  const b = mergeProgress({ unlocked: ['coast', 'canyon'], stars: { canyon: 2 }, bests: { canyon: 77 } });
  data.set('skyline-rush-cloud-account:player-B', JSON.stringify(b));
  assert.equal(switchCloudAccount('player-A', 'player-B', storage), true);
  assert.deepEqual(readLocalProgress(storage).unlocked, ['coast', 'canyon']);
  assert.deepEqual(readLocalProgress(storage).stars, { canyon: 2 });
  assert.equal(data.get('skyline-rush-cloud-owner'), 'player-B');
  assert.equal(data.get('skyline-rush-vfx'), '{"quality":"low"}');
  assert.equal(switchCloudAccount('player-B', 'player-A', storage), true);
  assert.deepEqual(readLocalProgress(storage).unlocked, ['coast', 'neon']);
  assert.deepEqual(readLocalProgress(storage).stars, { neon: 3 });
});

test('a new Google account starts with clean progress rather than inheriting previous account unlocks', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  saveLocalProgress(mergeProgress({ unlocked: ['coast', 'neon'], stars: { neon: 3 } }), storage);
  data.set('skyline-rush-cloud-owner', 'player-A');
  assert.equal(switchCloudAccount('player-A', 'fresh-player', storage), true);
  assert.deepEqual(readLocalProgress(storage).unlocked, ['coast']);
  assert.deepEqual(readLocalProgress(storage).stars, {});
  assert.deepEqual(readLocalProgress(storage).history, []);
});

test('an unavailable storage or invalid account ID must fail closed rather than reassign progress', () => {
  const data = new Map([['skyline-rush-cloud-owner', 'player-A']]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: () => { throw new Error('Storage unavailable'); } };
  assert.equal(switchCloudAccount('player-A', 'player-B', storage), false);
  assert.equal(data.get('skyline-rush-cloud-owner'), 'player-A');
  assert.equal(switchCloudAccount('player-A', '', storage), false);
});

test('cloud pending state is saved per Google account without pretending a failed sync succeeded', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const empty = { pending: false, lastSuccess: null };
  assert.deepEqual(readCloudSyncStatus('A', storage), empty);
  assert.equal(writeCloudSyncStatus('A', { pending: true }, storage), true);
  assert.deepEqual(readCloudSyncStatus('A', storage), { pending: true, lastSuccess: null });
  assert.deepEqual(readCloudSyncStatus('B', storage), empty);
  assert.equal(writeCloudSyncStatus('A', { pending: false, lastSuccess: '2026-10-24T00:00:00.000Z' }, storage), true);
  assert.equal(writeCloudSyncStatus('A', { pending: true }, storage), true);
  assert.deepEqual(readCloudSyncStatus('A', storage), {
    pending: true, lastSuccess: '2026-10-24T00:00:00.000Z',
  });
  assert.deepEqual(readCloudSyncStatus('B', storage), empty);
});

test('invalid or unavailable cloud sync metadata never corrupts progress', () => {
  const data = new Map([['skyline-rush-cloud-sync:A', '{"pending":false,"lastSuccess":"invalid"}']]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert.deepEqual(readCloudSyncStatus('A', storage), { pending: false, lastSuccess: null });
  assert.equal(writeCloudSyncStatus('A', { pending: false, lastSuccess: 'invalid' }, storage), false);
  assert.deepEqual(readCloudSyncStatus('', storage), { pending: false, lastSuccess: null });
  assert.equal(writeCloudSyncStatus('', { pending: true }, storage), false);
  const blocked = { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } };
  assert.deepEqual(readCloudSyncStatus('A', blocked), { pending: false, lastSuccess: null });
  assert.equal(writeCloudSyncStatus('A', { pending: true }, blocked), false);
});

test('the same Classic race is deduplicated by stable run identity even if cloud telemetry differs', () => {
  const record = { date: '2026-10-24T00:00:00.000Z', track: 'coast', position: 1, time: 61, score: 200, nearMisses: 1 };
  const progress = mergeProgress({ history: [record] }, { version: 2, history: [{ ...record, nearMisses: 2 }] });
  assert.equal(progress.history.length, 1);
  assert.equal(careerStats(progress.history).races, 1);
  assert.equal(careerStats(progress.history).wins, 1);
  assert.deepEqual(mergeProgress(progress, { version: 2, history: [record] }).history.length, 1);
});

test('identical mode and daily attempts deduplicate without mixing rule signatures or challenge IDs', () => {
  const stamp = '2026-10-24T00:00:00.000Z';
  const mode = { date: stamp, track: 'coast', mode: 'stunt', rules: JSON.stringify({ mode: 'stunt' }), time: 45, score: 10, maxCombo: 3 };
  const d = { id: '2026-10-24', track: 'coast', modifier: 'no-fly', position: 1, time: 60, score: 50, date: stamp };
  const validModifier = (mergeProgress({ daily: [d] })).daily.length ? d.modifier : null;
  // Use a real modifier from the catalog; cloud sanitization must keep these attempts valid.
  const daily = { ...d, modifier: validModifier ?? 'double-fuel' };
  const merged = mergeProgress({ modeHistory: [mode], daily: [daily] }, { version: 2,
    modeHistory: [{ ...mode, score: 20 }, { ...mode, rules: JSON.stringify({ mode: 'stunt', activeItems: true }) }],
    daily: [{ ...daily, score: 55 }, { ...daily, id: '2026-10-23' }],
  });
  assert.equal(merged.modeHistory.length, 2);
  assert.equal(merged.daily.length, 2);
});
