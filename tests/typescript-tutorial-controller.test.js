import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
test('tutorial coach step adapter is TypeScript rather than a second JS state controller', () => {
  assert.ok(existsSync(new URL('../src/tutorial-ui.ts', import.meta.url)));
  assert.equal(existsSync(new URL('../src/tutorial-ui.js', import.meta.url)), false);
});
