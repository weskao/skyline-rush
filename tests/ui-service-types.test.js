import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('audio preferences and update notifications are strict TypeScript app services', () => {
  for (const name of ['audio-settings', 'update-check']) {
    assert.ok(existsSync(new URL(`../src/${name}.ts`, import.meta.url)), `${name}.ts must exist`);
    assert.ok(!existsSync(new URL(`../src/${name}.js`, import.meta.url)), `${name}.js must not shadow typed implementation`);
  }
  assert.match(readFileSync(new URL('../src/audio-settings.ts', import.meta.url), 'utf8'), /interface AudioStorage/);
  assert.match(readFileSync(new URL('../src/update-check.ts', import.meta.url), 'utf8'), /interface ReloadStorage/);
});
