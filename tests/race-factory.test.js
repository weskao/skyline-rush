import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace } from '../src/race-factory.ts';
import { roadObstacles } from '../src/world-tour-scene.js';

test('the app race factory makes World Tour scenery solid', () => {
  const race = createRace('taipei');
  assert.ok(race.props.length > 0);
  assert.deepEqual(race.props, roadObstacles('taipei'));
});

test('the app race factory streams solid scenery along Endless', () => {
  const race = createRace('taipei', { mode: 'endless' });
  assert.equal(typeof race.streamProps, 'function');
});

test('main.js no longer builds races itself', () => {
  assert.doesNotMatch(readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), /createBareRace|roadObstacles/);
});
