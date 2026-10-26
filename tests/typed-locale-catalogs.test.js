import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { UI } from '../src/locales/ui.js';
import { GAME } from '../src/locales/game.js';

test('both Vue locale catalogs use canonical TypeScript without keeping duplicate JavaScript sources', () => {
  for (const name of ['ui','game']) {
    assert.equal(existsSync(new URL(`../src/locales/${name}.ts`, import.meta.url)), true, name + ' must use TypeScript');
    assert.equal(existsSync(new URL(`../src/locales/${name}.js`, import.meta.url)), false, name + ' must not be duplicated');
  }
});
test('existing English and Traditional Chinese UI and gameplay copy remain keyed identically', () => {
  for (const catalog of [UI, GAME]) {
    assert.deepEqual(Object.keys(catalog.en).sort(), Object.keys(catalog['zh-TW']).sort());
    assert.ok(Object.values(catalog.en).every(value => typeof value === 'string'));
    assert.ok(Object.values(catalog['zh-TW']).every(value => typeof value === 'string'));
  }
  assert.equal(UI.en['release.title'], "What's new");
  assert.equal(GAME.en['callout.perfect'], 'PERFECT LINE');
});
