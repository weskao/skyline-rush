import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';
import { UPCOMING_ENVIRONMENTS } from '../src/upcoming-scenes/index.ts';

test('each Coming Soon concept can mount real 3D scenery and be disposed', () => {
  assert.deepEqual(Object.keys(UPCOMING_ENVIRONMENTS).sort(), Object.keys(UPCOMING_TRACKS).sort());
  for (const id of Object.keys(UPCOMING_TRACKS)) {
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
