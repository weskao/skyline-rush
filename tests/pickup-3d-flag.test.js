import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Scene } from 'three';
import { createEffects } from '../src/effects.js';
import { createPickupGeometries, createPickupMaterials, PICKUP_SIZES } from '../src/pickup-art.js';

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('make 3d=1 activates the existing roadster preview AND the 3D pickup mode', () => {
  const makefile = file('Makefile');
  assert.match(makefile, /ifeq\s*\(\s*\$\(3d\)\s*,\s*1\s*\)/);
  assert.match(makefile, /export DEV_3D\s*:?=\s*1/);
  assert.match(makefile, /export VITE_PICKUP_3D\s*:?=\s*1/);
  const config = file('src/pickup-3d-config.js');
  assert.match(config, /import\.meta\.env\?\.VITE_PICKUP_3D\s*===\s*'1'/);
});

test('3D mode reuses one model and material definition for road objects and live guide previews', () => {
  const effects = file('src/effects.js');
  const guide = file('src/CollectiblesGuide.vue');
  const preview = file('src/Pickup3DPreview.vue');
  assert.match(effects, /createPickupGeometries\(/);
  assert.match(effects, /createPickupMaterials\(/);
  assert.match(guide, /PickupAnimatedPreview/);
  const animatedPreview = file('src/PickupAnimatedPreview.vue');
  assert.match(animatedPreview, /Pickup3DPreview/, 'original real-time 3D preview remains the asset fallback');
  assert.match(preview, /createPickupGeometry\(/);
  assert.match(preview, /createPickupMaterial\(/);
  assert.match(preview, /dispose\(/);
  assert.match(preview, /IntersectionObserver/);
  assert.match(preview, /prefers-reduced-motion/);
});

test('legacy mode stays a single octahedron; 3D mode has four different PBR shapes', () => {
  globalThis.devicePixelRatio = 1;
  try {
    const original = new Scene(), modern = new Scene();
    const oldEffects = createEffects(original, () => 0, { pickup3D: false });
    const nextEffects = createEffects(modern, () => 0, { pickup3D: true });
    try {
      const old = original.getObjectByName('Nitro pickups');
      const next = modern.getObjectByName('Nitro pickups');
      assert.equal(new Set(old.children.map(child => child.geometry.uuid)).size, 1);
      assert.equal(new Set(next.children.map(child => child.geometry.uuid)).size, 4);
      assert.ok(next.children.every(child => child.material.isMeshPhysicalMaterial && child.material.vertexColors));
      assert.ok(old.children.every(child => child.isInstancedMesh));
      assert.ok(next.children.every(child => child.isInstancedMesh));
    } finally { oldEffects.dispose(); nextEffects.dispose(); }
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
