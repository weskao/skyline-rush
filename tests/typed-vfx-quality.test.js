import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { vfxSettings, VFX_RANGES } from '../src/vfx-settings.ts';
import { selectDeviceQuality, initialDeviceVisuals } from '../src/device-quality.ts';

test('typed VFX settings retain defaults, finite clamps and a single preset catalog', () => {
  const defaults = vfxSettings();
  assert.equal(defaults.preset, 'cinematic');
  assert.equal(defaults.quality, 'high');
  assert.equal(defaults.airflowDensity, VFX_RANGES.airflowDensity[4]);
  const extreme = vfxSettings({ preset: 'extreme', afterimages: 200, bloom: -20, fov: Number.NaN });
  assert.equal(extreme.afterimages, 8);
  assert.equal(extreme.bloom, 0);
  assert.equal(extreme.fov, 11);
  assert.equal(vfxSettings({ preset: 'invalid', view: 'invalid', quality: 'invalid' }).view, 'drive');
  assert.equal(existsSync(new URL('../src/vfx-settings.js', import.meta.url)), false);
});

test('typed device-quality profile still respects saved high fidelity and missing device hints', () => {
  assert.equal(selectDeviceQuality({ cores: 2, memoryGiB: 2, width: 390, height: 844, pixelRatio: 3 }), 'low');
  assert.equal(selectDeviceQuality({}), 'high');
  const saved = initialDeviceVisuals({ storedSettings: { quality: 'high', preset: 'extreme' }, device: { cores: 2 } });
  assert.equal(saved.settings.quality, 'high');
  assert.equal(saved.automatic, false);
  assert.equal(existsSync(new URL('../src/device-quality.js', import.meta.url)), false);
});
