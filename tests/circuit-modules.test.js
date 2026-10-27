import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
test('shared simulation collisions have their own module before circuit separation is added', () => {
  assert.ok(existsSync(new URL('../src/car-collisions.js', import.meta.url)));
  assert.ok(!readFileSync(new URL('../src/game.js', import.meta.url), 'utf8').includes('function bumpCars('));
});
