import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { COAST_ENV_VARIANTS, coastEnvVariant, coastEnvPlan, PMREM_CUBE_SIZE } from '../src/coast-lighting.ts';
import { createLensPass } from '../src/lens-pass.ts';
import { setLook3d } from '../src/look-gate.ts';

setLook3d(true); // the Phase 3 look (`?look=3d`); tests/look-gate.test.js covers the develop look without it

test('Coast presets map to the four CC0 sky environments (spec v2 Phase 3 mapping)', () => {
  assert.equal(coastEnvVariant('track'), 'day');
  assert.equal(coastEnvVariant('day'), 'day');
  assert.equal(coastEnvVariant('dusk'), 'dusk');
  assert.equal(coastEnvVariant('rain'), 'rain');
  assert.equal(coastEnvVariant('fog'), 'fog');
  for (const other of ['night', 'snow', 'aurora']) assert.equal(coastEnvVariant(other), null, other);
});

test('every variant names a shipped HDRI, with a sane grade and exposure', () => {
  for (const [name, v] of Object.entries(COAST_ENV_VARIANTS)) {
    assert.match(v.file, /_1k\.hdr$/, name);
    assert.ok(existsSync(new URL('../public/environments/' + v.file, import.meta.url)), v.file + ' must be in public/environments');
    assert.equal(v.credit.license, 'CC0-1.0', name);
    assert.ok(v.credit.creator.length > 3, name + ' creator');
    assert.equal(v.credit.sourceUrl, 'https://polyhaven.com/a/' + v.file.replace(/_1k\.hdr$/, ''), name + ' source URL names the asset');
    assert.ok(v.intensity > 0 && v.intensity <= 2, name + ' intensity');
    assert.ok(v.exposure >= 0.8 && v.exposure <= 1.4, name + ' exposure');
    assert.ok(v.grade.saturation >= 0.8 && v.grade.saturation <= 1.3, name + ' saturation');
    assert.ok(v.grade.contrast >= 0.9 && v.grade.contrast <= 1.3, name + ' contrast');
  }
});

test('PMREM cube stays 256 like RoomEnvironment, so swapping scene.environment never recompiles', () => {
  assert.equal(PMREM_CUBE_SIZE, 256);
});

test('Low keeps RoomEnvironment; Medium+ loads the HDRI; non-Coast and unsupported presets never do', () => {
  assert.deepEqual(coastEnvPlan('coast', 'track', 'low'), { kind: 'room' });
  assert.deepEqual(coastEnvPlan('coast', 'rain', 'medium'), { kind: 'hdri', variant: 'rain' });
  assert.deepEqual(coastEnvPlan('coast', 'track', 'high'), { kind: 'hdri', variant: 'day' });
  assert.deepEqual(coastEnvPlan('coast', 'night', 'high'), { kind: 'room' });
  assert.deepEqual(coastEnvPlan('neon', 'track', 'high'), { kind: 'room' });
});

test('the lens pass carries the colour-grade uniforms at identity by default (no recompile on change)', () => {
  const lens = createLensPass();
  assert.equal(lens.uniforms.saturation.value, 1);
  assert.equal(lens.uniforms.contrast.value, 1);
  assert.deepEqual(lens.uniforms.tint.value.toArray(), [1, 1, 1]);
  lens.dispose();
});

test('bloom per variant lights the blades without blooming the sky; sun intensity follows the time of day', () => {
  for (const [name, v] of Object.entries(COAST_ENV_VARIANTS)) {
    assert.ok(v.bloom.threshold >= 0.85 && v.bloom.threshold <= 1.3, `${name}: HDR lights bloom, the sky does not`);
    assert.ok(v.bloom.strength > 0.2 && v.bloom.strength <= 0.8, `${name}: bloom strength`);
    assert.match(v.sun.color, /^#[0-9a-f]{6}$/);
  }
  assert.ok(COAST_ENV_VARIANTS.dusk.bloom.strength > COAST_ENV_VARIANTS.day.bloom.strength, 'light blades read stronger at sunset than at noon');
  assert.ok(COAST_ENV_VARIANTS.day.sun.intensity > COAST_ENV_VARIANTS.rain.sun.intensity, 'rain dims the sun');
});
