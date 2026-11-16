import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bonusStyles, gold, pickupColors, ringColors, spectrum } from '../src/effects-palette.ts';

test('the effect colour tables live in effects-palette.ts, not inside effects.js', () => {
  assert.deepEqual(gold, [2.5, 1.8, 0.15]);
  assert.equal(spectrum.length, 6);
  assert.equal(pickupColors.overcharge, spectrum);
  assert.equal(ringColors.nitro, gold);
  assert.equal(bonusStyles.emp, 'mystery');
  const effects = readFileSync(new URL('../src/effects.js', import.meta.url), 'utf8');
  assert.doesNotMatch(effects, /const (orange|ringColors|pickupColors|bonusStyles) =/);
});
