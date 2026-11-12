import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Scene } from 'three';
import { createEffects } from '../src/effects.js';
import { createPickupGeometries, createPickupMaterials, PICKUP_SIZES } from '../src/pickup-art.js';

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const exists = path => existsSync(new URL('../' + path, import.meta.url));

test('the 3D pickups need no flag: make 3d=1 only keeps the roadster preview redirect', () => {
  const makefile = file('Makefile');
  assert.match(makefile, /ifeq\s*\(\s*\$\(3d\)\s*,\s*1\s*\)/);
  assert.match(makefile, /export DEV_3D\s*:?=\s*1/);
  assert.equal(exists('src/pickup-3d-config.js'), false, 'the build-time switch module is gone');
  for (const path of ['Makefile', '.github/workflows/ci.yml', 'src/effects.js', 'src/world.js', 'src/Pickup3DPreview.vue',
    'src/CollectiblesGuide.vue', 'src/pickup-markers.js', 'src/pickup-preview-stage.ts'])
    assert.doesNotMatch(file(path), /VITE_PICKUP_3D|PICKUP_3D_ENABLED|pickup3D/, path + ' must not gate the pickups');
});

test('the race and the guide draw pickups through the one shared renderer', () => {
  const effects = file('src/effects.js'), stage = file('src/pickup-preview-stage.ts');
  const preview = file('src/Pickup3DPreview.vue'), guide = file('src/CollectiblesGuide.vue');
  for (const [name, source] of [['effects.js', effects], ['pickup-preview-stage.ts', stage]]) {
    assert.match(source, /createPickupMarkers\(/, name);
    assert.match(source, /\.place\(/, name + ' poses pickups with the shared animation');
    assert.doesNotMatch(source, /createPickupGeometr|createPickupMaterial|animatePickup|pulsePickupMaterial/,
      name + ' must not build or animate its own pickup models');
  }
  assert.match(guide, /<Pickup3DPreview[^>]+:tier="pickup.key"/);
  assert.match(preview, /mountPickupPreview\(/);
  assert.doesNotMatch(preview, /WebGLRenderer/, 'cards share one WebGL context (pickup-preview-stage.ts)');
  assert.match(stage, /IntersectionObserver/);
  assert.match(stage, /prefers-reduced-motion/);
  assert.match(stage, /forceContextLoss\(\)/, 'the shared context is released with the last card');
});

test('a default scene has four different instanced PBR pickups, their halo and the collection effects', () => {
  globalThis.devicePixelRatio = 1;
  try {
    const scene = new Scene(), effects = createEffects(scene, () => 0);
    try {
      const pool = scene.getObjectByName('Nitro pickups');
      assert.deepEqual(pool.children.map(child => child.name), ['cell', 'can', 'tank', 'overcharge']);
      assert.equal(new Set(pool.children.map(child => child.geometry.uuid)).size, 4);
      assert.ok(pool.children.every(child => child.isInstancedMesh && child.material.isMeshStandardMaterial));
      assert.ok(scene.getObjectByName('Pickup aura')?.isInstancedMesh, 'one instanced halo pool');
      assert.ok(scene.getObjectByName('Pickup collect VFX'), 'collection effects are always built before racing');
    } finally { effects.dispose(); }
  } finally { delete globalThis.devicePixelRatio; }
});

test('all tiers expose the same material and size contract to the race and guide', () => {
  const geometries = createPickupGeometries(), materials = createPickupMaterials();
  try {
    assert.deepEqual(Object.keys(geometries), ['cell', 'can', 'tank', 'overcharge']);
    assert.deepEqual(Object.keys(materials), Object.keys(geometries));
    for (const [tier, geometry] of Object.entries(geometries)) {
      assert.ok(geometry.attributes.normal && geometry.attributes.color, tier);
      assert.ok(materials[tier].isMeshPhysicalMaterial);
      assert.ok(materials[tier].metalness >= 0.1 && materials[tier].metalness <= 0.7);
      assert.ok(PICKUP_SIZES[tier] > .5 && PICKUP_SIZES[tier] < 2);
    }
  } finally {
    Object.values(geometries).forEach(geometry => geometry.dispose());
    Object.values(materials).forEach(material => material.dispose());
  }
});
