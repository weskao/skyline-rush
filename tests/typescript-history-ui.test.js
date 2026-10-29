import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('history and challenge presentation controllers are typed with no untyped duplicate', () => {
  assert.ok(existsSync(new URL('../src/history-ui.ts', import.meta.url)));
  assert.equal(existsSync(new URL('../src/history-ui.js', import.meta.url)), false);
});
