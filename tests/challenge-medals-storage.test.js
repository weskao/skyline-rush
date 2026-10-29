import test from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGE_MEDALS_KEY, loadChallengeMedals, recordChallengeMedals } from '../src/history-challenge-medals.ts';
import { readLocalProgress, saveLocalProgress, clearLocalProgress, switchCloudAccount, parseProgressExport } from '../src/cloud-progress.ts';
import { loadSessionProgress, progressSnapshot } from '../src/session-progress.ts';

const memory = () => {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const earn = storage => recordChallengeMedals({ phase: 'finished', mode: 'time', trackId: 'coast',
  result: { success: true, time: 30, collisions: 0 } }, loadChallengeMedals(storage), storage, new Date('2026-10-29T01:00:00.000Z')).state;

test('an explicit local progress restore includes personal medals atomically', () => {
  const source = memory(), state = earn(source), restored = memory();
  assert.equal(saveLocalProgress({ ...readLocalProgress(source), localChallengeMedals: state }, restored), true);
  assert.equal(loadChallengeMedals(restored).awards['time-clean'], '2026-10-29T01:00:00.000Z');
});

test('progress deletion removes personal medals while preserving device controls', () => {
  const storage = memory(); earn(storage); storage.setItem('skyline-rush-controls', 'keep');
  assert.equal(clearLocalProgress(storage), true);
  assert.deepEqual(loadChallengeMedals(storage).awards, {});
  assert.equal(storage.getItem('skyline-rush-controls'), 'keep');
});

test('account switching isolates the new collection and restores the original account', () => {
  const storage = memory(); earn(storage); storage.setItem('skyline-rush-cloud-owner', 'alice');
  assert.equal(switchCloudAccount('alice', 'bob', storage), true);
  assert.deepEqual(loadChallengeMedals(storage).awards, {}, 'a new account must not inherit medals');
  assert.equal(switchCloudAccount('bob', 'alice', storage), true);
  assert.equal(loadChallengeMedals(storage).awards['time-clean'], '2026-10-29T01:00:00.000Z');
});

test('account switching refuses an unreadable future ledger without changing any stored keys', () => {
  const storage = memory();
  storage.setItem(CHALLENGE_MEDALS_KEY, '{"version":2,"futureProof":"keep"}');
  storage.setItem('skyline-rush-cloud-owner', 'alice');
  const before = Object.fromEntries(storage.values);
  assert.equal(switchCloudAccount('alice', 'bob', storage), false);
  assert.deepEqual(Object.fromEntries(storage.values), before);
});

test('a quota failure on the personal ledger rolls back all local progress fields', () => {
  const storage = memory(); earn(storage); storage.setItem('skyline-rush-unlocked', '["coast","neon"]');
  const before = Object.fromEntries(storage.values);
  const desired = { ...readLocalProgress(storage), unlocked: ['coast', 'canyon'], localChallengeMedals: loadChallengeMedals(memory()) };
  let fail = true;
  const quota = { ...storage, setItem(key, value) {
    if (key === CHALLENGE_MEDALS_KEY && fail) { fail = false; throw new Error('quota'); }
    storage.setItem(key, value);
  } };
  assert.equal(saveLocalProgress(desired, quota), false);
  assert.deepEqual(Object.fromEntries(storage.values), before);
});

test('local backups restore medal data and reject a future local format before mutation', () => {
  const storage = memory(), state = earn(storage);
  const backup = JSON.stringify({ ...readLocalProgress(storage), localChallengeMedals: state });
  assert.deepEqual(parseProgressExport(backup).localChallengeMedals, state);
  assert.throws(() => parseProgressExport(JSON.stringify({ version: 2, localChallengeMedals: { version: 2 } })), /Unsupported/);
});

test('the periodic cloud payload excludes device-only personal medals', () => {
  const storage = memory(); earn(storage);
  globalThis.localStorage = storage;
  try {
    const session = loadSessionProgress(['coast']);
    assert.equal(session.challengeMedals.awards['time-clean'], '2026-10-29T01:00:00.000Z');
    assert.equal(Object.hasOwn(progressSnapshot(session), 'localChallengeMedals'), false);
    assert.equal(Object.hasOwn(progressSnapshot(session), 'challengeMedals'), false);
  } finally { delete globalThis.localStorage; }
});
