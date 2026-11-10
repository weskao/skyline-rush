import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WAVE3_DEMO_STORAGE_PREFIX, createWave3DemoStorage, browserWave3DemoStorage,
} from '../src/wave3-demo-storage.ts';

const NOW = 1_800_000_000_000;
const WEEK = 7 * 24 * 60 * 60 * 1000;
const key = account => `${WAVE3_DEMO_STORAGE_PREFIX}${account}`;
const snapshot = (accountId = 'guest', changes = {}) => ({
  version: 1, catalogVersion: 1, mode: 'local-demo', authority: 'local',
  syncState: 'local-only', accountId,
  missions: {
    'mission-race': { progress: 1, goal: 2, claimed: false, rewardDemoPoints: 10 },
    'mission-drift': { progress: 2, goal: 2, claimed: true, rewardDemoPoints: 10 },
  },
  demoPoints: 40, demoInventory: ['thruster-ion'], equippedPreview: 'thruster-ion',
  updatedAt: NOW, ...changes,
});
const storage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    data, getItem: k => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); },
    removeItem: k => { data.delete(k); },
  };
};
const adapter = (store, now = () => NOW) => createWave3DemoStorage({ storage: store, now });

test('serializes the frozen F01 ExperienceSnapshot and restores it after reload', () => {
  const store = storage();
  const first = adapter(store);
  const initial = snapshot();
  assert.equal(first.save(initial), true);
  const raw = JSON.parse(store.data.get(key('guest')));
  assert.equal(raw.version, 1);
  assert.equal(raw.accountId, 'guest');
  assert.equal(raw.savedAt, NOW);
  assert.deepEqual(raw.snapshot, initial);
  assert.deepEqual(adapter(store).load('guest'), initial);
});

test('corrupt JSON and wrong data types fail closed without altering other keys', () => {
  const store = storage({ [key('guest')]: '{no json', 'skyline-rush-stars': 'keep' });
  assert.equal(adapter(store).load('guest'), null);
  assert.equal(store.data.get('skyline-rush-stars'), 'keep');
  for (const invalid of [
    { ...snapshot(), demoPoints: '100' },
    { ...snapshot(), missions: { 'mission-race': { progress: 4, goal: 2, claimed: false, rewardDemoPoints: 10 } } },
    { ...snapshot(), accessToken: 'do-not-cache' },
    { ...snapshot(), equippedPreview: 'not-in-demo-inventory' },
  ]) {
    store.data.set(key('guest'), JSON.stringify({ version: 1, accountId: 'guest', savedAt: NOW, snapshot: invalid }));
    assert.equal(adapter(store).load('guest'), null);
  }
});

test('oversized stored payload and oversized outbound snapshot are rejected', () => {
  const store = storage({ [key('guest')]: 'x'.repeat(65_537) });
  assert.equal(adapter(store).load('guest'), null);
  const giant = snapshot('guest', { missions: Object.fromEntries(
    Array.from({ length: 3000 }, (_, i) => [`mission-${i}`, { progress: 0, goal: 1, claimed: false, rewardDemoPoints: 10 }]),
  ) });
  assert.equal(adapter(store).save(giant), false);
  assert.equal(store.data.has(key('guest')), false);
});

test('expired records are ignored and a new save extends the rolling seven-day retention', () => {
  const store = storage();
  adapter(store).save(snapshot());
  assert.deepEqual(adapter(store, () => NOW + WEEK - 1).load('guest'), snapshot());
  assert.equal(adapter(store, () => NOW + WEEK + 1).load('guest'), null);
  assert.equal(adapter(store, () => NOW + WEEK + 1).save(snapshot('guest', { updatedAt: NOW + WEEK + 1 })), true);
  assert.deepEqual(adapter(store, () => NOW + WEEK * 2).load('guest')?.demoPoints, 40);
});

test('future versions, invalid timestamps and server authority are never restored', () => {
  const store = storage();
  for (const changes of [
    { version: 2 }, { catalogVersion: 2 },
    { updatedAt: NOW + WEEK }, { updatedAt: NaN },
    { mode: 'server', authority: 'verified', syncState: 'synced' },
  ]) {
    store.data.set(key('guest'), JSON.stringify({ version: 1, accountId: 'guest', savedAt: NOW, snapshot: snapshot('guest', changes) }));
    assert.equal(adapter(store).load('guest'), null);
  }
  store.data.set(key('guest'), JSON.stringify({ version: 2, accountId: 'guest', savedAt: NOW, snapshot: snapshot() }));
  assert.equal(adapter(store).load('guest'), null);
  assert.equal(adapter(store).save(snapshot('guest', { mode: 'server', authority: 'verified' })), false);
});

test('account A and B each have isolated keys, and a mismatched record is discarded', () => {
  const store = storage();
  const repo = adapter(store);
  assert.equal(repo.save(snapshot('driver_A', { demoPoints: 57 }), 'driver_A'), true);
  assert.equal(repo.save(snapshot('driver_B', { demoPoints: 90 }), 'driver_B'), true);
  assert.equal(repo.save(snapshot('driver_A'), 'driver_B'), false);
  assert.equal(repo.load('driver_A')?.demoPoints, 57);
  assert.equal(repo.load('driver_B')?.demoPoints, 90);
  store.data.set(key('driver_B'), JSON.stringify({ version: 1, accountId: 'driver_A', savedAt: NOW, snapshot: snapshot('driver_A') }));
  assert.equal(adapter(store).load('driver_B'), null);
  assert.equal(repo.load('driver_B')?.demoPoints, 90, 'current in-memory state remains separate');
  assert.equal(repo.load('../not-a-user'), null);
});

test('get/set/remove blocked: all demo behavior continues safely in memory', () => {
  const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
    removeItem() { throw new Error('SecurityError'); },
  };
  const cache = adapter(blocked);
  assert.equal(cache.load('guest'), null);
  assert.equal(cache.save(snapshot()), false);
  assert.deepEqual(cache.load('guest'), snapshot());
  assert.doesNotThrow(() => cache.resetDemo('guest'));
  assert.equal(cache.load('guest'), null);
});

test('resetDemo only removes its own account demo key, not cloud, real unlocks, paints or another account', () => {
  const initial = {
    [key('driver_A')]: 'data-a', [key('driver_B')]: 'data-b',
    'skyline-rush-cloud-account:driver_A': 'cloud', 'skyline-rush-garage-skin-picks:driver_A': 'paints',
    'skyline-rush-history': 'history', 'skyline-rush-unlocked': 'unlocked',
  };
  const store = storage(initial);
  adapter(store).resetDemo('driver_A');
  assert.equal(store.data.has(key('driver_A')), false);
  for (const [k, v] of Object.entries(initial)) if (k !== key('driver_A')) assert.equal(store.data.get(k), v);
});

test('reload uses the same browser storage but unavailable storage starts a fresh disposable session', () => {
  const store = storage();
  assert.equal(adapter(store).save(snapshot()), true);
  assert.equal(adapter(store).load('guest')?.demoPoints, 40);
  const memoryOnly = createWave3DemoStorage({ storage: null, now: () => NOW });
  assert.equal(memoryOnly.load('guest'), null);
  assert.equal(memoryOnly.save(snapshot()), false);
  assert.equal(memoryOnly.load('guest')?.demoPoints, 40);
});

test('server adapter selection ignores cached demo and cannot save verified entitlement', () => {
  const store = storage();
  const local = adapter(store);
  local.save(snapshot());
  assert.equal(local.load('guest', 'server'), null);
  assert.equal(local.save(snapshot('guest', { authority: 'verified', mode: 'server', demoPoints: 9999 })), false);
  assert.deepEqual(adapter(store).load('guest'), snapshot());
});

test('guarded localStorage getter gives null, with no DOM requirement', () => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    assert.equal(browserWave3DemoStorage(), null);
  } finally {
    if (had) Object.defineProperty(globalThis, 'localStorage', had);
    else delete globalThis.localStorage;
  }
});

test('a failed remove cannot resurrect the previous demo snapshot in this session', () => {
  const backing = storage();
  const cannotRemove = { ...backing, removeItem() { throw new Error('blocked remove'); } };
  const cache = adapter(cannotRemove);
  assert.equal(cache.save(snapshot()), true);
  cache.resetDemo('guest');
  assert.equal(cache.load('guest'), null);
  assert.equal(cache.save(snapshot('guest', { demoPoints: 77 })), true);
  assert.equal(cache.load('guest')?.demoPoints, 77);
});

test('replay-aware checkpoint restores with the demo balance in one bounded namespace', () => {
  const backing = storage();
  const checkpoint = { snapshot: snapshot(), seenEvents: ['drift-event-0001'],
    settledCompletions: ['race-finish-0001'] };
  assert.equal(adapter(backing).saveCheckpoint(checkpoint), true);
  assert.deepEqual(adapter(backing).loadCheckpoint('guest'), checkpoint);
  assert.deepEqual(adapter(backing).load('guest'), checkpoint.snapshot);
  assert.equal(backing.data.has(key('guest') + ':replay'), false, 'single-key atomic payload');
});

test('snapshot-only caches are not hydrated without replay proof', () => {
  const backing = storage();
  assert.equal(adapter(backing).save(snapshot()), true);
  assert.equal(adapter(backing).loadCheckpoint('guest'), null);
});

test('corrupt replay IDs reject the whole checkpoint, never credit without dedupe', () => {
  const backing = storage();
  const checkpoint = { snapshot: snapshot(), seenEvents: ['event-1234'], settledCompletions: ['race-1234'] };
  assert.equal(adapter(backing).saveCheckpoint(checkpoint), true);
  const raw = JSON.parse(backing.data.get(key('guest')));
  raw.checkpoint.settledCompletions = Array.from({ length: 1025 }, (_, i) => 'race-' + i);
  backing.data.set(key('guest'), JSON.stringify(raw));
  assert.equal(adapter(backing).loadCheckpoint('guest'), null);
});
