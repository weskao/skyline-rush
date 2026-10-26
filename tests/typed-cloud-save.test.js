import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('Firebase login and sync service has one typed implementation without duplicated JavaScript', () => {
  assert.equal(existsSync(new URL('../src/cloud-save.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/cloud-save.js', import.meta.url)), false);
});
test('Firebase service retains account-switch guard and transaction-first cloud progress', () => {
  const current = readFileSync(new URL('../src/cloud-save.ts', import.meta.url), 'utf8');
  assert.match(current, /auth\.currentUser\?\.uid !== expectedUid/);
  assert.match(current, /runTransaction\(db, async transaction/);
  assert.match(current, /transaction\.get\(save\)/);
  assert.match(current, /transaction\.get\(bestDocument\)/);
});
