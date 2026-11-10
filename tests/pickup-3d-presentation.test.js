import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { animatePickup, createPickupGeometries, PICKUP_SIZES } from '../src/pickup-art.js';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('guide and road use the exact same transform, material factory and selected-tier model', () => {
  const preview = read('src/Pickup3DPreview.vue');
  const scene = read('src/effects.js');
  assert.match(preview, /animatePickup\(mesh,\s*item,\s*seconds,\s*!?motion\.matches\)/);
  assert.match(scene, /animatePickup\(mesh,\s*item,\s*flowTime,\s*reducedMotion\)/);
  assert.match(preview, /createPickupGeometry\(props\.tier\)/);
  assert.match(preview, /createPickupMaterial\(props\.tier\)/);
  assert.doesNotMatch(preview, /createPickupGeometries\(/, 'no wasted construction of other tiers');
  assert.match(preview, /PICKUP_SIZES\[props\.tier\]/, 'camera must frame the actual in-race size');
});

test('all four pickup silhouettes clear the road, with movement frozen for reduced motion', () => {
  const geometries = createPickupGeometries();
  try {
    for (const [tier, geometry] of Object.entries(geometries)) {
      geometry.computeBoundingBox();
      const marker = new THREE.Object3D();
      marker.position.y = .85;
      const item = { tier, distance: 0, altitude: 0 };
      animatePickup(marker, item, 3, true);
      const lowest = marker.position.y + geometry.boundingBox.min.y * PICKUP_SIZES[tier];
      assert.ok(lowest >= .30, tier + ' must clear the asphalt even at its lowest bobbing phase: ' + lowest.toFixed(2));
      const frozen = marker.position.y;
      marker.position.y = .85;
      animatePickup(marker, item, 12, true);
      assert.equal(marker.position.y, frozen, tier + ' height must be stable when motion is reduced');
    }
  } finally {
    Object.values(geometries).forEach(g => g.dispose());
  }
});

test('make build 3d=1 is a real non-deploying build target and preserves the 3D switch', () => {
  const makefile = read('Makefile');
  assert.match(makefile, /(?:^|\n)build:\s*node_modules\b/);
  assert.match(makefile, /(?:^|\n)\s+\$\(NPM\) run build/);
  assert.match(makefile, /export VITE_PICKUP_3D\s*:?=\s*1/);
});

test('3D pickup emissions pulse in the shared PBR material without changing shader programs', async () => {
  const { createPickupMaterial, pulsePickupMaterial } = await import('../src/pickup-art.js');
  for (const tier of ['cell', 'can', 'tank', 'overcharge']) {
    const material = createPickupMaterial(tier);
    try {
      const original = material.uuid, values = [];
      for (const time of [0, 1, 2]) {
        pulsePickupMaterial(material, tier, time, false);
        values.push(material.emissiveIntensity);
        assert.equal(material.uuid, original, 'avoid reconstructing GPU material each frame');
        assert.ok(material.emissiveIntensity > .2 && material.emissiveIntensity < .7);
      }
      assert.equal(new Set(values).size, 3, tier + ' uses visibly animated luminous energy');
      pulsePickupMaterial(material, tier, 100, true);
      const reduced = material.emissiveIntensity;
      pulsePickupMaterial(material, tier, 150, true);
      assert.equal(material.emissiveIntensity, reduced, 'reduced motion freezes the glow');
    } finally { material.dispose(); }
  }
});
