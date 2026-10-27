import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRng } from '../src/rng.ts';

const draw = (rng, n = 5) => Array.from({ length: n }, rng);

test('the same seed and stream name replay the same sequence in [0, 1)', () => {
  const first = draw(seededRng(42, 'rings'), 50);
  assert.deepEqual(draw(seededRng(42, 'rings'), 50), first);
  assert.ok(first.every(value => value >= 0 && value < 1));
});

test('streams are independent of each other and of the seed', () => {
  const rings = seededRng(42, 'rings');
  const reference = draw(seededRng(42, 'rings'));
  draw(seededRng(42, 'pickups'), 100); // consuming another stream must not shift this one
  assert.deepEqual(draw(rings), reference);
  assert.notDeepEqual(draw(seededRng(42, 'pickups')), reference);
  assert.notDeepEqual(draw(seededRng(43, 'rings')), reference);
});
