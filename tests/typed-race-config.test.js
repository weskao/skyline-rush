import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { normalizeRaceConfig, validateRaceRequest, rulesSignature, trafficMultiplier } from '../src/race-config.js';

test('custom race rules have one strict TypeScript implementation without a duplicate JS runtime', () => {
  assert.equal(existsSync(new URL('../src/race-config.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/race-config.js', import.meta.url)), false);
});

test('typed rules preserve classic/default equivalence and deny unexpected player options', () => {
  assert.equal(rulesSignature({mode:'classic'}), rulesSignature({}));
  assert.equal(trafficMultiplier('heavy'), 1.5);
  assert.equal(trafficMultiplier('nonsense'), 1);
  assert.equal(normalizeRaceConfig({mode:'free',items:false,activeItems:true}).activeItems, undefined);
  assert.throws(() => validateRaceRequest({mode:'free',items:false,activeItems:true}), /Invalid/);
  const cup = validateRaceRequest({mode:'cup',cupTracks:['coast','neon','canyon']}, { availableTracks:['coast','neon','canyon']});
  assert.deepEqual(cup.cupTracks, ['coast','neon','canyon']);
  assert.throws(() => validateRaceRequest({mode:'cup',cupTracks:['coast','neon','canyon']}, { availableTracks:['coast'] }),/unknown/);
});
