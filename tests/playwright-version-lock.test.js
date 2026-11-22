import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const lock = readFileSync(new URL('pnpm-lock.yaml', root), 'utf8');

test('Playwright stays on the exact locked version during frozen pnpm installs', () => {
  const declared = pkg.devDependencies['@playwright/test'];
  assert.match(declared, /^\\d+\\.\\d+\\.\\d+$/, 'Playwright must use an exact version');
  for (const name of ['@playwright/test', 'playwright', 'playwright-core']) {
    assert.ok(lock.includes(`${name}@${declared}`), `pnpm lock must pin ${name}@${declared}`);
  }
});
