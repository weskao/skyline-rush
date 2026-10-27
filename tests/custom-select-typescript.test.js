import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('custom select is a typed controller and can be imported without browser globals', async () => {
  const module = await import('../src/custom-select.ts');
  assert.equal(typeof module.customSelect, 'function');
  assert.equal(typeof module.refreshCustomSelects, 'function');
  assert.equal(existsSync(new URL('../src/custom-select.js', import.meta.url)), false, 'no duplicate legacy JS implementation');
});
