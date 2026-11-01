import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rivalWantsNitro, RIVAL_NITRO_CHARGES } from '../src/rival-items.ts';

test('R2: rival NITRO timing lives in its own module, not in game.js', () => {
  const game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
  assert.doesNotMatch(game, /function rivalWantsNitro/);
  assert.equal(RIVAL_NITRO_CHARGES, 2);
  const nova = { name: 'NOVA', nitro: 2, nitroHop: -1, altitude: 0, speed: 0, distance: 0 };
  assert.equal(rivalWantsNitro({ elapsed: 7.9, length: 5000 }, nova, 0), false);
  assert.equal(rivalWantsNitro({ elapsed: 8, length: 5000 }, nova, 0), true);
});
