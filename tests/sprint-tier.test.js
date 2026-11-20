import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRINT_TIERS, sprintTier } from '../src/sprint-tier.ts';

test('sprint tier: NITRO outranks BOOST and the two together are their own tier', () => {
  assert.equal(sprintTier(false, false), 'idle');
  assert.equal(sprintTier(false, true), 'boost');
  assert.equal(sprintTier(true, false), 'nitro');
  assert.equal(sprintTier(true, true), 'nitro-boost');
});

test('sprint tier: the ladder never goes down as the tier goes up', () => {
  const rows = Object.values(SPRINT_TIERS).sort((a, b) => a.level - b.level);
  assert.deepEqual(rows.map(row => row.level), [0, 1, 2, 3]);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].share >= rows[i - 1].share, `level ${i} is weaker than level ${i - 1}`);
  assert.ok(SPRINT_TIERS.boost.share < SPRINT_TIERS.nitro.share, 'BOOST must read weaker than NITRO');
  for (const row of rows) assert.ok(row.share >= 0 && row.share <= 1, 'share stays 0..1: the chain lift is applied after it');
});
