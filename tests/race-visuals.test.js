import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, FogExp2, Scene, ShaderMaterial } from 'three';
import { createRaceVisuals, weatherDrops } from '../src/race-visuals.ts';
import { readFileSync } from 'node:fs';

function fixture() {
  const scene = new Scene();
  scene.background = new Color('#94758a');
  scene.fog = new FogExp2('#94758a', .0013);
  const sky = new ShaderMaterial({ uniforms: {
    top: { value: new Color('#101e43') }, horizon: { value: new Color('#d98785') },
    cloudTint: { value: new Color('#4d3d60') }, cloudOpacity: { value: 1 }, warmth: { value: 1 }, aurora: { value: 0 },
  } });
  const renderer = { toneMappingExposure: 1.12 };
  return { scene, sky: sky.uniforms, renderer };
}

test('race presets recolor real scene values and restore the authored track exactly', () => {
  const target = fixture();
  const visuals = createRaceVisuals(target);
  visuals.apply('night');
  assert.equal(target.scene.background.getHexString(), '1b2e5a');
  assert.equal(target.scene.fog.density, .0016);
  assert.equal(target.renderer.toneMappingExposure, .72);
  assert.equal(target.sky.top.value.getHexString(), '050b25');
  visuals.apply('track');
  assert.equal(target.scene.background.getHexString(), '94758a');
  assert.equal(target.scene.fog.density, .0013);
  assert.equal(target.renderer.toneMappingExposure, 1.12);
  assert.equal(target.sky.top.value.getHexString(), '101e43');
  assert.equal(target.sky.horizon.value.getHexString(), 'd98785');
});

test('a new track resets visual baselines and unchanged frame updates do no color writes', () => {
  const target = fixture();
  const visuals = createRaceVisuals(target);
  visuals.apply('fog');
  let writes = 0;
  const set = target.scene.background.set.bind(target.scene.background);
  target.scene.background.set = (...args) => { writes++; return set(...args); };
  visuals.apply('fog');
  assert.equal(writes, 0);
  visuals.reset();
  target.scene.background.set('#18223f');
  visuals.apply('day');
  visuals.apply('track');
  assert.equal(target.scene.background.getHexString(), '18223f');
});

test('Photo Studio temporarily overrides the atmosphere, then restores the current race preset', () => {
  const target = fixture();
  const visuals = createRaceVisuals(target);
  visuals.apply('fog');
  visuals.photo?.('night');
  assert.equal(target.scene.fog.density, .0016);
  visuals.photo?.(null);
  assert.equal(target.scene.fog.density, .004);
  visuals.apply('track');
  assert.equal(target.scene.fog.density, .0013);
});

test('snowfall and aurora presets recolor the sky and restore the track, aurora band included', () => {
  const target = fixture();
  const visuals = createRaceVisuals(target);
  visuals.apply('aurora');
  assert.equal(target.sky.aurora.value, 1);
  assert.ok(target.renderer.toneMappingExposure < 1, 'aurora is a night sky');
  visuals.apply('snow');
  assert.equal(target.sky.aurora.value, 0);
  assert.ok(target.scene.fog.density > .0013, 'snow thickens the haze');
  visuals.apply('track');
  assert.equal(target.sky.aurora.value, 0);
  assert.equal(target.scene.background.getHexString(), '94758a');
});

test('11B Aurora: themed races drive into two warned blizzard stretches that ramp in and out smoothly', async () => {
  const { blizzardLevel, AURORA_BLIZZARDS } = await import('../src/race-visuals.ts');
  assert.ok(AURORA_BLIZZARDS.length >= 2);
  for (const { from, to } of AURORA_BLIZZARDS) {
    assert.equal(blizzardLevel('aurora', (from + to) / 2, true), 1);
    assert.equal(blizzardLevel('aurora', from - 1, true), 0);
    assert.equal(blizzardLevel('aurora', (from + to) / 2, false), 0, 'opt-in themes only');
    assert.equal(blizzardLevel('coast', (from + to) / 2, true), 0, 'Aurora only');
    for (let d = from - 10; d < to + 10; d += 1)
      assert.ok(Math.abs(blizzardLevel('aurora', d + 1, true) - blizzardLevel('aurora', d, true)) <= 1 / 100, 'no visibility jump');
  }
});

test('11B Aurora: a blizzard thickens the haze and clearing it restores the exact atmosphere', () => {
  const target = fixture();
  const visuals = createRaceVisuals(target);
  visuals.blizzard(0);
  assert.equal(target.scene.fog.density, .0013, 'no blizzard writes nothing');
  visuals.blizzard(1);
  assert.ok(target.scene.fog.density > .0013 * 2, 'visibility drops in a blizzard');
  visuals.blizzard(.5);
  visuals.blizzard(0);
  assert.equal(target.scene.fog.density, .0013);
  visuals.apply('night'); visuals.blizzard(1); visuals.blizzard(0);
  assert.equal(target.scene.fog.density, .0016, 'blizzard composes with the chosen sky');
});

test('weak hardware draws a third of the weather particles; hazard silhouettes never thin out', () => {
  assert.equal(weatherDrops('high', false), 180);
  assert.equal(weatherDrops('medium', false), 180);
  assert.equal(weatherDrops('low', false), 60);
  assert.equal(weatherDrops('high', true), 60, 'touch devices take the light overlay too');
  // Essential hazard silhouettes are drawn the same at every quality: the hazard renderer takes no quality input.
  assert.doesNotMatch(readFileSync(new URL('../src/hazard-render.ts', import.meta.url), 'utf8'), /quality/i);
});
