import test from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGE_MEDALS_KEY, loadChallengeMedals, parseChallengeMedals, mergeChallengeMedals, recordChallengeMedals } from '../src/history-challenge-medals.ts';
import { recordModeRace } from '../src/history-mode.ts';

const memory = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const finish = (mode, extra = {}) => ({ phase: 'finished', mode, trackId: 'coast', result: { success: true, time: 30, collisions: 0 }, ...extra });
const now = new Date('2026-10-29T01:00:00.000Z');
const award = race => {
  const storage = memory();
  return recordChallengeMedals(race, loadChallengeMedals(storage), storage, now).awarded;
};

test('a successful all-gate collision-free Checkpoint run earns its own medal', () => {
  const checkpoint = { passed: 2, missed: 0, gates: [{ passed: true, missed: false }, { passed: true, missed: false }] };
  assert.deepEqual(award(finish('checkpoint', { checkpoint })), ['checkpoint-clean']);
  for (const changed of [
    { ...checkpoint, missed: 1 },
    { ...checkpoint, gates: [{ passed: false, missed: false }, checkpoint.gates[1]] },
    { ...checkpoint, gates: [] },
  ]) assert.deepEqual(award(finish('checkpoint', { checkpoint: changed })), []);
  assert.deepEqual(award(finish('checkpoint', { checkpoint, result: { success: true, time: 30, collisions: 1 } })), []);
});

test('a themed Gauntlet medal requires every actual hazard cleared without contacts', () => {
  const hazards = [{ passed: true, hit: false }, { passed: true, hit: false }];
  assert.deepEqual(award(finish('gauntlet', { trackId: 'tokyo', hazards })), ['gauntlet-clear']);
  for (const changed of [[], [{ passed: false, hit: false }], [{ passed: true, hit: true }]])
    assert.deepEqual(award(finish('gauntlet', { hazards: changed })), []);
  assert.deepEqual(award(finish('gauntlet', { hazards, result: { success: true, time: 30, collisions: 1 } })), []);
});

test('aerial medal thresholds use one-flight peaks with finite bounded telemetry', () => {
  for (const [longestFlight, maxAerialCombo, wanted] of [
    [8, 3, ['long-flight', 'aerial-combo']], [7.99, 2, []], [8, 2, ['long-flight']], [1, 3, ['aerial-combo']],
    [31, 6, []], [NaN, Infinity, []], [-8, -3, []], [1, 3.2, []],
  ]) assert.deepEqual(award(finish('stunt', { styleAttack: { longestFlight, maxAerialCombo } })), wanted);
});

test('invalid, failed and unfinished results cannot award or mutate the local ledger', () => {
  for (const race of [
    finish('time', { phase: 'racing' }), finish('time', { trackId: 'unknown' }),
    finish('time', { result: { success: false, time: 30, collisions: 0 } }),
    finish('time', { result: { success: true, time: Infinity, collisions: 0 } }),
    finish('time', { result: { success: true, time: 0, collisions: 0 } }),
  ]) {
    const storage = memory();
    assert.deepEqual(recordChallengeMedals(race, loadChallengeMedals(storage), storage, now).awarded, []);
    assert.equal(storage.getItem(CHALLENGE_MEDALS_KEY), null);
  }
});

test('personal awards survive real challenge History trimming and are not announced twice', () => {
  const storage = memory(), first = recordChallengeMedals(finish('time'), loadChallengeMedals(storage), storage, now);
  for (let i = 0; i < 51; i++) recordModeRace({ mode: 'custom', trackId: 'coast', config: { mode: 'custom' },
    result: { success: true, time: 20 + i, position: 1 } }, storage, now);
  assert.equal(loadChallengeMedals(storage).awards['time-clean'], '2026-10-29T01:00:00.000Z');
  assert.deepEqual(recordChallengeMedals(finish('time'), first.state, storage, now).awarded, []);
});

test('blocked storage preserves a session award and its once-only announcement', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const first = recordChallengeMedals(finish('time'), loadChallengeMedals(storage), storage, now);
  assert.deepEqual(first.awarded, ['time-clean']);
  assert.deepEqual(recordChallengeMedals(finish('time'), first.state, storage, now).awarded, []);
});

test('local award parsing ignores unrecognized or invalid data and refuses a future format', () => {
  const parsed = parseChallengeMedals({ version: 1, awards: { unknown: now.toISOString(), 'time-clean': '<script>' },
    longestFlight: Infinity, maxAerialCombo: 3.2 });
  assert.deepEqual(parsed, { version: 1, awards: {}, longestFlight: 0, maxAerialCombo: 0 });
  assert.throws(() => parseChallengeMedals({ version: 2 }), /Unsupported/);
});

test('merging local awards keeps the first award date and highest valid peaks', () => {
  const merged = mergeChallengeMedals({ version: 1, awards: { 'time-clean': '2026-10-27T00:00:00.000Z' }, longestFlight: 9, maxAerialCombo: 2 },
    { version: 1, awards: { 'time-clean': now.toISOString() }, longestFlight: 8, maxAerialCombo: 4 });
  assert.equal(merged.awards['time-clean'], '2026-10-27T00:00:00.000Z');
  assert.deepEqual([merged.longestFlight, merged.maxAerialCombo], [9, 4]);
});

test('a downgraded app does not overwrite future local medal storage when granting a session award', () => {
  const storage = memory(), future = '{"version":2,"futureProof":"retain"}';
  storage.setItem(CHALLENGE_MEDALS_KEY, future);
  assert.deepEqual(recordChallengeMedals(finish('time'), loadChallengeMedals(storage), storage, now).awarded, ['time-clean']);
  assert.equal(storage.getItem(CHALLENGE_MEDALS_KEY), future);
});
