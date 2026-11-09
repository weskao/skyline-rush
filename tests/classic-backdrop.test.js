import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createClassicBackdrop } from '../src/classic-backdrop.ts';

test('the classic sky dome, sun and sea live in their own module, not in world.js', () => {
  const scene = new THREE.Scene(), box = new THREE.BoxGeometry(1, 1, 1), puts = [];
  const put = (mesh, index, x, y, z, sx, sy, sz, angle = 0) => {
    puts.push([mesh, index]);
    mesh.setMatrixAt(index, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, angle), new THREE.Vector3(sx, sy, sz)));
  };
  const { sky, sun, sea, seaLines, mountains } = createClassicBackdrop(scene, box, put);
  assert.deepEqual(scene.children, [sky, sun, sea, seaLines, mountains], 'added in the original draw order');
  assert.equal(seaLines.geometry, box, 'sea lines share the world box geometry');
  assert.equal(seaLines.count, 110);
  assert.equal(mountains.count, 30);
  assert.equal(puts.length, 140);
  assert.equal(sky.material.side, THREE.BackSide);
  for (const name of ['top', 'horizon', 'warmth', 'aurora', 'cloudOpacity', 'cloudTint', 'time']) assert.ok(name in sky.material.uniforms, name);
  for (const name of ['time', 'ground', 'fogColor', 'water']) assert.ok(name in sea.material.uniforms, name);
  assert.equal(sea.position.y, -6);
  assert.equal(sun.material.fog, false);
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /float cloud=noise/, 'world.js no longer embeds the sky shader');
  assert.doesNotMatch(world, /PlaneGeometry\(7000, 7000\)/, 'world.js no longer builds the sea');
  assert.doesNotMatch(world, /Math\.sin\(i \* 9\.3\) \* 1100/, 'world.js no longer lays out the sea lines');
  assert.doesNotMatch(world, /-1400 - Math\.cos\(i \* 2\) \* 300/, 'world.js no longer lays out the mountains');
});
