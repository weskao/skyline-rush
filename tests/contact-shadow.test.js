import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createContactShadow, shadowOpacity } from '../src/contact-shadow.ts';
import { setLook3d } from '../src/look-gate.ts';

setLook3d(true); // the Phase 3 look (`?look=3d`); tests/look-gate.test.js covers the develop look without it

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

test('board panel 1: a tight, dark contact under the car, not a 5 x 8 m halo', t => {
  const stops = withCanvas(t);
  const { shadow } = createContactShadow(new THREE.Scene());
  const { width, height } = shadow.geometry.parameters;
  assert.ok(width >= 2.6 && width <= 3.4, `width ${width} m hugs the ~2.3 m track`);
  assert.ok(height >= 5.2 && height <= 6.2, `length ${height} m hugs the ~4.9 m body`);
  const alpha = color => +color.match(/[\d.]+\)$/)[0].slice(0, -1);
  assert.ok(alpha(stops[0][1]) >= 0.9, 'dark core where the tyres meet the road');
  assert.ok(stops.some(([at, color]) => at > 0.3 && at < 0.8 && alpha(color) >= 0.4), 'holds density under the body before the soft edge');
  assert.ok(shadowOpacity(0) >= 0.7);
});
