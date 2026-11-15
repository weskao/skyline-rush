import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { takePickups, MAGNET_RANGE } from '../src/pickup-take.ts';
import { MAGNET_RANGE as GAME_MAGNET_RANGE } from '../src/game.js';

const game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');

test('the player pickup take lives in its own module, not in game.js', () => {
  assert.equal(typeof takePickups, 'function');
  assert.equal(GAME_MAGNET_RANGE, MAGNET_RANGE, 'game.js re-exports the one magnet range');
  assert.doesNotMatch(game, /for \(const pickup of race\.pickups\)/);
  assert.match(game, /takePickups\(race, car, previousDistance, addNitro\)/);
});
