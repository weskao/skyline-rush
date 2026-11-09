// Owner decision 2026-11-09: develop keeps its look; the whole Phase 3 visual pass is opt-in behind `?look=3d`,
// separate from (and combinable with) the `?model=roadster` car gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { phase3Look, look3d, setLook3d } from '../src/look-gate.ts';
import { plumeLook, sprayRate, thrusterGlow } from '../src/board-effects.ts';
import { coastEnvPlan } from '../src/coast-lighting.ts';
import { createContactShadow, shadowOpacity } from '../src/contact-shadow.ts';
import { createSprintVfx } from '../src/vfx-settings.ts';
import { garageModelId } from '../src/garage-model.ts';

const source = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
function shadowCanvas(t) {
  const stops = [];
  const context = { createRadialGradient: () => ({ addColorStop: (at, color) => stops.push([at, color]) }), fillRect() {}, fillStyle: null };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  t.after(() => { delete globalThis.document; });
  return stops;
}
const sprintBlur = ultra => {
  const input = { phase: 'racing', nitro: true, boost: false, speed: 110, cap: 110, dt: 0.3, enabled: true, quality: 'high', reducedMotion: false, ultra };
  const vfx = createSprintVfx(); for (let i = 0; i < 3; i++) vfx.update(input);
  return vfx.update(input).blur;
};

test('?look=3d is the only switch; it combines with ?model=roadster; a page without it (and Node) is off', () => {
  assert.equal(phase3Look('?look=3d'), true);
  assert.equal(phase3Look('?model=roadster&look=3d'), true);
  assert.equal(garageModelId('?model=roadster&look=3d'), 'roadster2', 'the car gate is unchanged');
  for (const search of ['', '?look=2d', '?look', '?model=roadster', '?look=3D']) assert.equal(phase3Look(search), false, search);
  assert.equal(look3d(), false, 'no location in Node: the develop look');
});

test('without ?look=3d every map takes the develop path on every tier', t => {
  setLook3d(false);
  for (const quality of ['medium', 'high']) {
    assert.deepEqual(plumeLook(quality), { tail: 0, stretch: 1 }, `${quality}: no magenta tail, develop plume length`);
    assert.equal(thrusterGlow(quality, true, true, 1), 0, `${quality}: unlit nozzles`);
    assert.equal(sprayRate(quality, 90), 0, `${quality}: no rain wheel spray`);
    for (const preset of ['track', 'rain', 'dusk', 'fog']) assert.deepEqual(coastEnvPlan('coast', preset, quality), { kind: 'room' }, `${quality} ${preset}: no HDRI, bloom or sun retune`);
  }
  assert.equal(sprintBlur(true), sprintBlur(false), 'a saved Ultra choice renders as High: no Ultra lens blur');
  const stops = shadowCanvas(t), { shadow } = createContactShadow(new THREE.Scene());
  assert.deepEqual([shadow.geometry.parameters.width, shadow.geometry.parameters.height], [5, 8], 'develop 5 x 8 m shadow');
  assert.deepEqual(stops, [[0, 'rgba(0,0,0,0.8)'], [1, 'rgba(0,0,0,0)']]);
  assert.equal(shadowOpacity(0), 0.6);
  assert.equal(shadowOpacity(2), 0.6 / 1.4);
  assert.equal(shadow.material.opacity, 0.6);
});

test('with ?look=3d the current branch look is on', t => {
  setLook3d(true);
  t.after(() => setLook3d(false));
  assert.deepEqual(plumeLook('high'), { tail: 1, stretch: 1.35 });
  assert.ok(thrusterGlow('high', true, true, 0) > 0);
  assert.ok(sprayRate('high', 90) > 0);
  assert.deepEqual(coastEnvPlan('coast', 'track', 'high'), { kind: 'hdri', variant: 'day' });
  assert.ok(sprintBlur(true) > sprintBlur(false), 'Ultra lens blur');
  const stops = shadowCanvas(t), { shadow } = createContactShadow(new THREE.Scene());
  assert.deepEqual([shadow.geometry.parameters.width, shadow.geometry.parameters.height], [3, 5.8]);
  assert.equal(stops.length, 3);
  assert.equal(shadowOpacity(0), 0.75);
  assert.deepEqual(plumeLook('low'), { tail: 0, stretch: 1 }, 'Low still keeps the develop look');
});

test('the Coast assets, the Ultra option and the saved Ultra value are wired through the gate', () => {
  const world = source('world.js');
  assert.match(source('coast-assets.ts'), /dataset: Deps\['dataset'\], baseUrl = [^\n]*\n  if \(!look3d\(\)\) return null;/, 'no GLB, KTX2 road or wet mirror without the gate');
  assert.match(world, /coastAssets\?\.update\(/);
  assert.match(world, /coastAssets\?\.dispose\(\)/);
  assert.match(source('App.vue'), /<option v-if="look3d\(\)" value="ultra" data-i18n="vfx\.quality\.ultra">Ultra<\/option>/);
  assert.match(source('vfx-ui.ts'), /key === 'quality' && visual\.ultra && look3d\(\) \? 'ultra'/, 'a saved Ultra shows as High without the gate');
});
