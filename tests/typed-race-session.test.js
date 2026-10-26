import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRaceSessionContract, VISUAL_PRESETS } from '../src/race-session.ts';

test('typed session contract preserves frozen identity and deterministic random streams', () => {
  const one = createRaceSessionContract('coast', 1001, { mode: 'classic' });
  const two = createRaceSessionContract('coast', 1001, { mode: 'classic' }, { visualPreset: 'night' });
  assert.equal(one.contractVersion, 1);
  assert.equal(one.mode, 'classic');
  assert.equal(one.objective.type, 'placement');
  assert.equal(Object.isFrozen(one), true);
  assert.equal(Object.isFrozen(one.simulation), true);
  assert.equal(Object.isFrozen(one.randomSeeds), true);
  assert.deepEqual(one.randomSeeds, two.randomSeeds);
  assert.equal(one.rulesSignature, two.rulesSignature);
  assert.notEqual(one.presentation.visualPreset, two.presentation.visualPreset);
  assert.ok(VISUAL_PRESETS.includes('night'));
  assert.equal(existsSync(new URL('../src/race-session.js', import.meta.url)), false);
});

test('typed session contract still rejects malformed identity and presentation', () => {
  assert.throws(() => createRaceSessionContract('../coast', 1001), /trackId/);
  assert.throws(() => createRaceSessionContract('coast', -1), /seed/);
  assert.throws(() => createRaceSessionContract('coast', 1001, {}, { ghostEnabled: 'no' }), /ghostEnabled/);
});
