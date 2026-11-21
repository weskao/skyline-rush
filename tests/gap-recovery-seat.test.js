import test from 'node:test';
import assert from 'node:assert/strict';
import { planGapRecovery, clearGapFallStreak, GAP_FALL_ASSIST_AFTER, GAP_RECOVERY_EXIT_BUFFER } from '../src/gap-recovery-seat.ts';

const gaps = [
  { from: 4720, to: 4880, approach: 4470 },
  { from: 5625, to: 5790, approach: 5370 },
  { from: 6430, to: 6600, approach: 6170 },
  { from: 3672, to: 3832, approach: 3600 },
];
const plan = (gap, at, last = null, finish = 10000) => planGapRecovery(gap, at, gap.approach, finish, last);

test('at midpoint and earlier: return to approach on first and second fall', () => {
  for (const gap of gaps) {
    const mid = (gap.from + gap.to) / 2;
    const first = plan(gap, mid);
    assert.equal(first.distance, gap.approach);
    assert.equal(first.streak.count, 1);
    assert.equal(first.forward, false);
    assert.equal(plan(gap, mid - 0.01, first.streak).distance, gap.approach);
  }
});

test('after midpoint: first fall can respawn beyond the end of the same gap', () => {
  for (const gap of gaps) {
    const result = plan(gap, (gap.from + gap.to) / 2 + .01);
    assert.equal(result.distance, gap.to + GAP_RECOVERY_EXIT_BUFFER);
    assert.equal(result.streak.count, 1);
    assert.equal(result.forward, true);
    assert.equal(result.assisted, false);
  }
});

test('third consecutive fall in the same gap activates rescue regardless of progress', () => {
  assert.equal(GAP_FALL_ASSIST_AFTER, 3);
  for (const gap of gaps) {
    const first = plan(gap, gap.from + 1);
    const second = plan(gap, gap.from + 1, first.streak);
    const third = plan(gap, gap.from + 1, second.streak);
    assert.equal(second.distance, gap.approach);
    assert.equal(third.distance, gap.to + GAP_RECOVERY_EXIT_BUFFER);
    assert.equal(third.streak.count, 3);
    assert.equal(third.assisted, true);
  }
});

test('falling at a different gap starts a new streak, and crossing the gap clears it', () => {
  let last = plan(gaps[0], gaps[0].from + 1).streak;
  last = plan(gaps[0], gaps[0].from + 1, last).streak;
  assert.equal(plan(gaps[1], gaps[1].from + 1, last).streak.count, 1);
  assert.deepEqual(clearGapFallStreak(last, gaps[0].to - .01), last);
  assert.equal(clearGapFallStreak(last, gaps[0].to), null);
  assert.equal(plan(gaps[0], gaps[0].from + 1, null).streak.count, 1);
});

test('far-side spawn must remain on valid road before finish; otherwise fall back', () => {
  const gap = gaps[0];
  const beyondMiddle = (gap.from + gap.to) / 2 + 1;
  const restrictedFinish = gap.to + GAP_RECOVERY_EXIT_BUFFER;
  const result = plan(gap, beyondMiddle, null, restrictedFinish);
  assert.equal(result.distance, gap.approach);
  assert.equal(result.forward, false);
  assert.equal(result.assisted, false);
});
