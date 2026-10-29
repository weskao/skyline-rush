import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('player hazard resolution lives in its own module, not game.js', async () => {
  const { stepPlayerHazards } = await import('../src/hazard-race.ts');
  assert.equal(typeof stepPlayerHazards, 'function');
  assert.doesNotMatch(readFileSync(new URL('../src/game.js', import.meta.url), 'utf8'), /a close, clean ground pass pays more/);
});
