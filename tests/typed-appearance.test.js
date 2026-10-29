import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAINTS, ownedPaints } from '../src/appearance.ts';

test('typed Garage paint catalog preserves progression unlock order and exact colors', () => {
  assert.deepEqual(ownedPaints(0), ['pearl']);
  assert.deepEqual(ownedPaints(6), ['pearl', 'aurora', 'glacier']);
  assert.deepEqual(ownedPaints(24), ['pearl', 'aurora', 'glacier', 'coral', 'cobalt', 'obsidian']);
  assert.equal(PAINTS.cobalt.paint, '#2456c4');
  assert.deepEqual(PAINTS.obsidian.light, [2.4, 0.02, 0.05]);
});
