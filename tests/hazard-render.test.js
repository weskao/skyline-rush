import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');

test('ENV-06 hazard drawing lives in its own renderer module', async () => {
  const { createHazardRenderer } = await import('../src/hazard-render.ts');
  assert.equal(typeof createHazardRenderer, 'function');
  assert.doesNotMatch(world, /one distinct marker per reachable barrier/);
  assert.match(world, /createHazardRenderer\(/);
});
