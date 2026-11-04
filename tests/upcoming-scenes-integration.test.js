import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';
import { UPCOMING_ENVIRONMENTS } from '../src/upcoming-scenes/index.ts';

test('each Stage 1 concept can mount real 3D scenery and be disposed', () => {
  // Frostbite is a separate, unreleased stage; its cover uses the JPEG fallback.
  const stage1Ids = Object.keys(UPCOMING_TRACKS).filter(id => id !== 'frostbite-canyon');
  assert.deepEqual(Object.keys(UPCOMING_ENVIRONMENTS).sort(), stage1Ids.sort());
  assert.equal(UPCOMING_ENVIRONMENTS['frostbite-canyon'], undefined);
  for (const id of stage1Ids) {
    const scene = new THREE.Scene();
    const environment = UPCOMING_ENVIRONMENTS[id](scene);
    assert.ok(environment.group instanceof THREE.Group);
    assert.equal(environment.group.parent, scene, id + ': scene group not attached');
    let meshes = 0;
    environment.group.traverse(node => { if (node instanceof THREE.Mesh) meshes++; });
    assert.ok(meshes > 5, id + ': expected modeled scenery, not flat image');
    for (const quality of ['low', 'medium', 'high']) environment.update(1, quality, false);
    environment.update(4, 'medium', true);
    environment.dispose();
    assert.equal(environment.group.parent, null, id + ': resource group leaked');
  }
});
