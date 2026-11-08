import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createContactShadow, shadowOpacity } from '../src/contact-shadow.ts';

function withCanvas(t) {
  const stops = [];
  const context = { createRadialGradient: (...args) => ({ args, addColorStop: (at, color) => stops.push([at, color]) }), fillRect() {}, fillStyle: null };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  t.after(() => { delete globalThis.document; });
  return stops;
}

test('the car contact shadow is built in contact-shadow.ts, not in world.js', t => {
  withCanvas(t);
  const scene = new THREE.Scene(), { shadow, texture } = createContactShadow(scene);
  assert.equal(scene.children[0], shadow);
  assert.equal(shadow.material.map, texture);
  assert.equal(shadow.material.depthWrite, false);
  assert.equal(shadow.position.y, 0.03);
  assert.equal(shadow.rotation.x, -Math.PI / 2);
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /createRadialGradient\(32, 32/, 'world.js no longer paints the shadow');
  assert.doesNotMatch(world, /opacity = 0\.6 \/ \(1 \+ lift/, 'one home for the lift fade: shadowOpacity');
});

test('the shadow fades as the car lifts off', () => {
  assert.ok(shadowOpacity(0) > shadowOpacity(2));
  assert.ok(shadowOpacity(20) > 0);
});
