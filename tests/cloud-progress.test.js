import test from 'node:test';
import assert from 'node:assert/strict';
import { careerStats } from '../src/history.js';
import { DAILY_MODIFIERS } from '../src/game.js';
import { mergeUnlocks, mergeProgress, readLocalProgress, saveLocalProgress, clearLocalProgress, claimCloudOwner, cloudFailureStatus, switchCloudAccount, readCloudSyncStatus, writeCloudSyncStatus, mergeModeBests, readLocalModeBests, saveLocalModeBests } from '../src/cloud-progress.js';

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
  const daily = { id: '2026-10-24', track: 'coast', modifier: DAILY_MODIFIERS[0], position: 1, time: 60, score: 50, date: stamp };
  const merged = mergeProgress({ modeHistory: [mode], daily: [daily] }, { version: 2,
    modeHistory: [{ ...mode, score: 20 }, { ...mode, rules: JSON.stringify({ mode: 'stunt', activeItems: true }) }],
    daily: [{ ...daily, score: 55 }, { ...daily, id: '2026-10-23' }],
  });
  assert.equal(merged.modeHistory.length, 2);
  assert.equal(merged.daily.length, 2);
});

test('cloud mode history preserves v1 additive telemetry and accepts local 4096-character rules', () => {
  const run = {
    date: '2026-10-24T00:00:00.000Z', mode: 'checkpoint', track: 'coast',
    rules: 'x'.repeat(4096), time: 65, position: 1, score: 420,
    modeId: 'checkpoint', trackId: 'coast', rulesVersion: 2,
    rulesSignature: 'x'.repeat(4096), distance: 5000, stageCount: 3,
    lapCount: null, itemsUsed: 2, hazardPasses: 3, hazardHits: 1,
  };
  const merged = mergeProgress({ modeHistory: [run] });
  assert.equal(merged.modeHistory.length, 1);
  for (const key of ['rulesVersion', 'distance', 'stageCount', 'lapCount', 'itemsUsed', 'hazardPasses', 'hazardHits'])
    assert.deepEqual(merged.modeHistory[0][key], run[key], key);
  assert.equal(merged.modeHistory[0].rules, run.rules);
  assert.deepEqual(mergeProgress({}, merged).modeHistory, merged.modeHistory);
});

test('permanent mode records keep the fastest non-stunt result after 50 recent runs expire', () => {
  const key = JSON.stringify(['coast', { mode: 'time', duration: 180 }]);
  const a = mergeModeBests({ bests: { [key]: 61 } }, { version: 1, bests: { [key]: 67 } });
  assert.equal(a.bests[key], 61);
  assert.equal(mergeModeBests(a, { version: 1, bests: { [key]: 59 } }).bests[key], 59);
});

test('permanent Stunt scores and combo peaks merge without downgrading earlier achievements', () => {
  const key = JSON.stringify(['tokyo', { mode: 'stunt', duration: 90 }]);
  const local = { bests: { [key]: 9500 }, stunts: { [key]: { score: 9500, maxCombo: 12, airTime: 18, medal: 'gold' } } };
  const cloud = { version: 1, bests: { [key]: 9000 }, stunts: { [key]: { score: 9000, maxCombo: 15, airTime: 10, medal: 'silver' } } };
  const merged = mergeModeBests(local, cloud);
  assert.equal(merged.bests[key], 9500);
  assert.deepEqual(merged.stunts[key], { score: 9500, maxCombo: 15, airTime: 18, medal: 'gold' });
  assert.deepEqual(mergeModeBests(merged, merged), merged);
});

test('permanent bests are local and can be restored without changing device preferences', () => {
  const key = JSON.stringify(['coast', { mode: 'time' }]);
  const data = new Map([['skyline-rush-vfx', 'high']]);
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const snapshot = mergeModeBests({ bests: { [key]: 62.3 } });
  assert.equal(saveLocalModeBests(snapshot, storage), true);
  assert.deepEqual(mergeModeBests(readLocalModeBests(storage)), snapshot);
  assert.equal(data.get('skyline-rush-vfx'), 'high');
});

test('permanent bests reject malformed keys and unsupported remote schemas', () => {
  const accepted = JSON.stringify(['coast', { mode: 'time' }]);
  const merged = mergeModeBests({ bests: { arbitrary: 1, [accepted]: 60 } });
  assert.deepEqual(merged.bests, { [accepted]: 60 });
  assert.throws(() => mergeModeBests({}, { version: 999, bests: {} }), /Unsupported/);
});

test('switching accounts preserves each UID permanent records and does not leak local rule bests', () => {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
  const rule = JSON.stringify(['coast', { mode: 'time' }]);
  saveLocalModeBests(mergeModeBests({ bests: { [rule]: 41 } }), storage);
  assert.equal(switchCloudAccount('first', 'second', storage), true);
  assert.deepEqual(readLocalModeBests(storage).bests, {});
  assert.equal(switchCloudAccount('second', 'first', storage), true);
  assert.equal(readLocalModeBests(storage).bests[rule], 41);
});

test('clearing a cloud account removes permanent bests but keeps device settings', () => {
  const data = new Map([['skyline-rush-vfx', 'high']]);
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
  saveLocalModeBests(mergeModeBests({ bests: { [JSON.stringify(['coast',{mode:'time'}])]: 50 } }), storage);
  assert.equal(clearLocalProgress(storage), true);
  assert.deepEqual(readLocalModeBests(storage), { bests: {}, stunts: {} });
  assert.equal(data.get('skyline-rush-vfx'), 'high');
});

test('a partial device write rolls back all changed progress fields', () => {
  const data = new Map([['skyline-rush-unlocked','["coast","neon"]'],['skyline-rush-stars','{"coast":2}']]);
  const initial = [...data.entries()];
  let writes = 0;
  const storage = {
    getItem: k => data.get(k) ?? null,
    setItem: (k,v) => { if (++writes === 2) throw new Error('quota'); data.set(k,v); },
    removeItem: k => data.delete(k),
  };
  const next = mergeProgress({ unlocked: ['coast','tokyo'], stars: { coast: 3 } });
  assert.equal(saveLocalProgress(next,storage),false);
  assert.deepEqual([...data.entries()],initial);
});
