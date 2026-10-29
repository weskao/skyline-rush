import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRaceSessionContract, VISUAL_PRESETS, presetsForTrack } from '../src/race-session.ts';
import { RACE_PRESENTATION_COPY } from '../src/locales/race-presentation.ts';

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

test('snowfall and aurora are offered only where they suit the track; every track keeps the base six', () => {
  const base = ['track', 'day', 'dusk', 'night', 'rain', 'fog'];
  for (const id of ['coast', 'neon', 'canyon', 'aurora', 'spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic', 'future-track'])
    for (const preset of base) assert.ok(presetsForTrack(id).includes(preset), id + ' ' + preset);
  assert.ok(presetsForTrack('alpine').includes('snow') && presetsForTrack('alpine').includes('aurora'));
  assert.ok(presetsForTrack('aurora').includes('snow'));
  assert.ok(!presetsForTrack('cosmic').includes('snow') && !presetsForTrack('tokyo').includes('aurora'));
  assert.throws(() => createRaceSessionContract('cosmic', 1, {}, { visualPreset: 'snow' }), RangeError);
  assert.equal(createRaceSessionContract('alpine', 1, {}, { visualPreset: 'snow' }).presentation.visualPreset, 'snow');
  for (const locale of ['en', 'zh-TW']) for (const preset of VISUAL_PRESETS)
    assert.ok(RACE_PRESENTATION_COPY[locale]['mode.visual.' + preset], locale + ' ' + preset);
});
