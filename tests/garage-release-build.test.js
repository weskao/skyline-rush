import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectGarageReleaseBuild } from '../scripts/garage-release-build.mjs';

test('production defaults to coming-soon with a safe locked UI and runtime (not hidden trial code)', () => {
  const result = selectGarageReleaseBuild('production', undefined);
  assert.equal(result.mode, 'coming-soon');
  assert.match(result.aliases['#garage-skin-ui'], /GarageSkinComingSoon\.vue$/);
  assert.match(result.aliases['#garage-skin-runtime'], /garage-skin-runtime-locked\.ts$/);
  assert.match(result.aliases['#garage-skin-palette'], /garage-skin-palette-locked\.ts$/);
});

test('development and preview can select trial; release uses a separate strategy with no trial grants', () => {
  assert.equal(selectGarageReleaseBuild('development', undefined).mode, 'trial');
  for (const mode of ['trial', 'released']) {
    const config = selectGarageReleaseBuild('production', mode);
    assert.equal(config.mode, mode);
    assert.match(config.aliases['#garage-skin-runtime'], /garage-skin-runtime\.ts$/);
    assert.match(config.aliases['#garage-skin-ui'], /GarageSkinCatalog\.vue$/);
  }
});

test('fail closed for typos and attempts to toggle unsupported modes at build time', () => {
  for (const value of ['enabled', 'all', 'debug', '__proto__', 'TRUE', '']) {
    assert.throws(() => selectGarageReleaseBuild('production', value), /Invalid GARAGE_VFX_RELEASE_MODE/);
  }
});

test('no runtime mode switching: production source entry is resolved through distinct Vite aliases', async () => {
  const { readFileSync } = await import('node:fs');
  const vite = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/GaragePanel.vue', import.meta.url), 'utf8');
  const garage = readFileSync(new URL('../src/garage-ui.ts', import.meta.url), 'utf8');
  assert.match(vite, /selectGarageReleaseBuild/);
  assert.match(ui, /#garage-skin-ui/);
  assert.match(garage, /#garage-skin-runtime/);
  assert.doesNotMatch(ui, /import GarageSkinCatalog from '\.\/GarageSkinCatalog\.vue'/);
  assert.doesNotMatch(garage, /from '\.\/garage-skin-runtime\.ts'/);
});

test('the production build asserts that unpublished skin code and artwork are excluded', async () => {
  const { readFileSync } = await import('node:fs');
  const gate = readFileSync(new URL('../scripts/assert-production-locked.mjs', import.meta.url), 'utf8');
  assert.match(gate, /GARAGE_VFX_RELEASE_MODE/);
  assert.match(gate, /thruster-ion/);
  assert.match(gate, /feature-assets\/garage-vfx-skins/);
});
