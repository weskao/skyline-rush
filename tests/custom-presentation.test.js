import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';

test('cosmetic session presets change presentation without forking Custom simulation rules or Ghost identity', () => {
  const base = createRace('coast', { mode: 'custom', rivals: 0 });
  const themed = createRace('coast', { mode: 'custom', rivals: 0 }, { visualPreset: 'night', ghostEnabled: false });
  assert.deepEqual(themed.config, base.config);
  assert.equal(themed.session.rulesSignature, base.session.rulesSignature);
  assert.deepEqual(themed.traffic, base.traffic);
  assert.deepEqual(themed.rings, base.rings);
  assert.deepEqual(themed.session.presentation, { visualPreset: 'night', ghostEnabled: false });
  assert.throws(() => createRace('coast', { mode: 'custom' }, { visualPreset: 'invalid' }), /preset/i);
});
