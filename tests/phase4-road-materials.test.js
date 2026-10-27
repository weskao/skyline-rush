import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyTrackSurfaceStyle } from '../src/track-palettes.ts';
import { createSkyScene } from '../src/sky-scene.js';

test('legacy road materials use theme-aware realistic finishes while Coast stays Phase 2-matte', () => {
  const quality = {};
  for (const id of ['coast','neon','canyon','aurora']) {
    const road = new THREE.MeshStandardMaterial(), buildings = new THREE.MeshStandardMaterial();
    applyTrackSurfaceStyle(id, road, buildings, '#344455');
    quality[id] = { road: road.roughness, metal: road.metalness, facade: buildings.roughness };
    assert.equal(road.color.getHexString(), '344455', id);
    road.dispose(); buildings.dispose();
  }
  assert.ok(quality.coast.road >= .9);
  assert.ok(quality.neon.road >= .28 && quality.neon.road <= .55, 'wet neon asphalt should be legible rather than mirror-metal');
  assert.ok(quality.neon.metal <= .12);
  assert.ok(quality.canyon.road >= .8 && quality.canyon.metal <= .1, 'dusty rock road is not metallic');
  assert.ok(quality.aurora.road >= .65 && quality.aurora.metal <= .1, 'frosted asphalt has diffuse grip texture');
  assert.ok(quality.canyon.facade >= .75 && quality.aurora.facade >= .7);
});

test('Sky Spiral road stays matte with its existing lane and launch geometry', () => {
  const scene = new THREE.Scene(), kit = createSkyScene(scene);
  const root = scene.getObjectByName('Sky Spiral 3D course');
  const road = root.children.find(c => c.isMesh && c.material.isMeshStandardMaterial);
  assert.ok(road, 'existing helix renderer must be reused');
  assert.ok(road.material.roughness >= .6);
  assert.ok(road.material.metalness <= .2);
  kit.dispose();
  assert.equal(scene.children.includes(root), false);
});
