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

test('Ultra tier: saved as quality "ultra", scene consumers get high plus an ultra flag', () => {
  const ultra = vfxSettings({ quality: 'ultra' });
  assert.equal(ultra.quality, 'high');
  assert.equal(ultra.ultra, true);
  // Persisted form (what vfx-ui stores) round-trips without losing the tier.
  const reloaded = vfxSettings(JSON.parse(JSON.stringify(ultra)));
  assert.equal(reloaded.quality, 'high');
  assert.equal(reloaded.ultra, true);
  for (const quality of ['low', 'medium', 'high', undefined, 'invalid', 'ULTRA']) {
    assert.equal(vfxSettings({ quality }).ultra, false, `quality ${quality}`);
  }
  assert.equal(vfxSettings({ quality: 'medium', ultra: true }).ultra, false);
  assert.equal(vfxSettings({ quality: 'low' }).quality, 'low');
});

test('Ultra tier is never auto-selected and a saved Ultra survives device startup', () => {
  for (const device of [{}, { cores: 16, memoryGiB: 32, width: 3840, height: 2160, pixelRatio: 2 },
    { cores: 2, memoryGiB: 1 }, { cores: 4, width: 2560, height: 1440, pixelRatio: 2 }]) {
    assert.notEqual(selectDeviceQuality(device), 'ultra');
    const fresh = initialDeviceVisuals({ device });
    assert.equal(fresh.settings.ultra, false);
  }
  const saved = initialDeviceVisuals({ storedSettings: { quality: 'high', ultra: true }, device: { cores: 2 } });
  assert.equal(saved.settings.ultra, true);
  assert.equal(saved.settings.quality, 'high');
  assert.equal(saved.downgraded, false);
});

test('Ultra render resolution equals High; settings UI lists Ultra last with en + zh-TW copy', async () => {
  const { renderPixelRatioForQuality } = await import('../src/render-resolution.ts');
  const { readFileSync } = await import('node:fs');
  assert.equal(renderPixelRatioForQuality(vfxSettings({ quality: 'ultra' }).quality, 3, 1), renderPixelRatioForQuality('high', 3, 1));
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  assert.match(app, /<option value="high"[^>]*>High<\/option><option value="ultra" data-i18n="vfx\.quality\.ultra">Ultra<\/option><\/select>/);
  const copy = readFileSync(new URL('../src/locales/display-settings.ts', import.meta.url), 'utf8');
  assert.match(copy, /'vfx\.quality\.ultra': 'Ultra'/);
  assert.equal((copy.match(/'vfx\.quality\.ultra'/g) ?? []).length, 2);
});
