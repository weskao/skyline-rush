import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeUnlocks, mergeProgress, readLocalProgress, saveLocalProgress, switchCloudAccount } from '../src/cloud-progress.js';

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
