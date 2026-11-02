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

test('every app race re-rolls where its rings and pickups sit', () => {
  const layout = race => [...race.rings, ...race.pickups].map(item => `${item.distance}:${item.x}`).join();
  const seen = new Set(Array.from({ length: 5 }, () => layout(createRace('coast'))));
  assert.ok(seen.size > 1, 'five Coast races share one layout');
});

test('main.js no longer builds races itself', () => {
  assert.doesNotMatch(readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), /createBareRace|roadObstacles/);
});
