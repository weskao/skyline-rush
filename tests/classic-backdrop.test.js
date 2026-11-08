import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createClassicBackdrop } from '../src/classic-backdrop.ts';

test('the classic sky dome, sun and sea live in their own module, not in world.js', () => {
  const scene = new THREE.Scene();
  const { sky, sun, sea } = createClassicBackdrop(scene);
  assert.deepEqual(scene.children, [sky, sun, sea], 'added in the original draw order');
  assert.equal(sky.material.side, THREE.BackSide);
  for (const name of ['top', 'horizon', 'warmth', 'aurora', 'cloudOpacity', 'cloudTint', 'time']) assert.ok(name in sky.material.uniforms, name);
  for (const name of ['time', 'ground', 'fogColor', 'water']) assert.ok(name in sea.material.uniforms, name);
  assert.equal(sea.position.y, -6);
  assert.equal(sun.material.fog, false);
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /float cloud=noise/, 'world.js no longer embeds the sky shader');
  assert.doesNotMatch(world, /PlaneGeometry\(7000, 7000\)/, 'world.js no longer builds the sea');
});
