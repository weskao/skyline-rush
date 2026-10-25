import { test } from 'node:test';
import assert from 'node:assert/strict';
import { garagePresentation } from '../src/garage-ui.js';

test('garage presentation distinguishes locked, owned and equipped paint', () => {
  const paints = { silver: { stars: 0 }, blue: { stars: 2 }, gold: { stars: 5 } };
  const owned = ['silver', 'blue'];
  assert.deepEqual(garagePresentation('gold', 'silver', 3, paints, owned), { state: 'locked', owned: false, canEquip: false, need: 5 });
  assert.deepEqual(garagePresentation('blue', 'silver', 3, paints, owned), { state: 'owned', owned: true, canEquip: true, need: 2 });
  assert.deepEqual(garagePresentation('silver', 'silver', 3, paints, owned), { state: 'equipped', owned: true, canEquip: false, need: 0 });
});
