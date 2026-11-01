import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skinVfxPalette, skinVfxPattern } from '../src/garage-skin-palette.ts';

test('four default category skins preserve the baseline renderer palette', () => {
  assert.deepEqual(skinVfxPalette({}), {
    thruster: [1, 1, 1], airflow: [1, 1, 1],
    'nitro-trail': [1, 1, 1], 'launch-flare': [1, 1, 1],
  });
});

test('every optional skin changes only its own visual category without affecting gameplay', () => {
  const choices = [
    ['thruster', 'thruster-ion'],
    ['airflow', 'airflow-slipstream'],
    ['nitro-trail', 'nitro-trail-cyan'],
    ['launch-flare', 'launch-flare-blue'],
  ];
  for (const [category, id] of choices) {
    const palette = skinVfxPalette({ [category]: id });
    const baseline = skinVfxPalette({});
    assert.notDeepEqual(palette[category], baseline[category]);
    for (const [other, value] of Object.entries(baseline))
      if (other !== category) assert.deepEqual(palette[other], value);
    assert.ok(Object.values(palette).flat().every(n => Number.isFinite(n) && n >= 0 && n <= 2));
  }
});

test('tampered skin IDs or category swaps fall back to default', () => {
  const baseline = skinVfxPalette({});
  assert.deepEqual(skinVfxPalette({ thruster: 'airflow-slipstream', airflow: '__proto__' }), baseline);
  assert.deepEqual(skinVfxPalette({ thruster: '../../bad.png' }), baseline);
});

// New variants must have distinct renderer pattern IDs, not just RGB tints.
test('four skins per category use independent non-colour VFX pattern modes', () => {
  const modes = skinVfxPattern({});
  assert.deepEqual(modes, { thruster: 0, airflow: 0, 'nitro-trail': 0, 'launch-flare': 0 });
  const ids = {
    thruster: ['thruster-basic', 'thruster-ion', 'thruster-plasma', 'thruster-void'],
    airflow: ['airflow-basic', 'airflow-slipstream', 'airflow-vortex', 'airflow-prism'],
    'nitro-trail': ['nitro-trail-basic', 'nitro-trail-cyan', 'nitro-trail-gold', 'nitro-trail-red'],
    'launch-flare': ['launch-flare-basic', 'launch-flare-blue', 'launch-flare-ring', 'launch-flare-pulse'],
  };
  for (const [category, choices] of Object.entries(ids)) {
    const seen = choices.map(id => skinVfxPattern({ [category]: id })[category]);
    assert.deepEqual(seen, [0, 1, 2, 3], category);
    assert.equal(skinVfxPattern({ [category]: '../../invalid' })[category], 0);
    assert.equal(skinVfxPattern({ [category]: ids.thruster[2] })[category], category === 'thruster' ? 2 : 0);
  }
});
