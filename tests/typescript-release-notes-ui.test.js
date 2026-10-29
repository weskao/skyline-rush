import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('release notes dialog controller uses TypeScript without duplicate JavaScript implementation', () => {
  assert.equal(existsSync(new URL('../src/release-notes-ui.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/release-notes-ui.js', import.meta.url)), false);
});
