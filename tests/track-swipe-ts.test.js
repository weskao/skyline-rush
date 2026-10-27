import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('track swipe lifecycle is a TypeScript UI controller without duplicate JS ownership', () => {
  assert.ok(existsSync(new URL('../src/track-swipe-ui.ts', import.meta.url)));
  assert.ok(!existsSync(new URL('../src/track-swipe-ui.js', import.meta.url)));
  const code = readFileSync(new URL('../src/track-swipe-ui.ts', import.meta.url), 'utf8');
  assert.match(code, /interface Swipe/);
  assert.match(code, /getWorld\(\)/);
  assert.doesNotMatch(code, /\.render\(race\s*,/, 'render must use live race state');
});
