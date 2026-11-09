import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('package-lock.json', root), 'utf8'));

test('Playwright stays on the exact locked version during npm install in typecheck', () => {
  const declared = pkg.devDependencies['@playwright/test'];
  assert.equal(declared, lock.packages['node_modules/@playwright/test'].version,
    'A semver range can update to a partially published Playwright release');
  assert.equal(lock.packages[''].devDependencies['@playwright/test'], declared,
    'Root package-lock declaration must match package.json');
  assert.equal(lock.packages['node_modules/playwright'].version, declared);
  assert.equal(lock.packages['node_modules/playwright-core'].version, declared);
});
