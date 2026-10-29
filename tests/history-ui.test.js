import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historyTrendPoints } from '../src/history-ui.ts';

test('history trend chart preserves evenly spaced points and time range', () => {
  assert.deepEqual(historyTrendPoints([{ time: 10 }, { time: 20 }, { time: 30 }]), [[10, 70], [250, 40], [490, 10]]);
});

test('flat history and a single race stay centered', () => {
  assert.deepEqual(historyTrendPoints([{ time: 15 }, { time: 15 }]), [[10, 40], [490, 40]]);
  assert.deepEqual(historyTrendPoints([{ time: 15 }]), [[250, 40]]);
  assert.deepEqual(historyTrendPoints([]), []);
});
