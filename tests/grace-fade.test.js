import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createGraceFade, graceOpacity, GRACE_PULSE_HZ } from '../src/grace-fade.ts';
import { CAR_STYLES, makeCar } from '../src/car-model.js';

const materialsOf = root => {
  const found = new Set();
  root.traverse(object => { for (const m of [].concat(object.material ?? [])) found.add(m); });
  return [...found];
};

test('the car is solid outside the post-hit grace and translucent inside it', () => {
  assert.equal(graceOpacity(0, 3, false), 1);
  assert.equal(graceOpacity(0, 3, true), 1);
  for (let t = 0; t < 1; t += 0.01) {
    const o = graceOpacity(1.2, t, false);
    assert.ok(o >= 0.3 && o <= 0.7, `pulse stays clearly see-through, got ${o} at ${t}`);
  }
  assert.equal(graceOpacity(1.2, 0.13, true), graceOpacity(1.2, 0.4, true), 'reduced motion: a steady tint, no pulse');
  assert.ok(graceOpacity(1.2, 0.4, true) < 1);
});

test('the pulse never flashes faster than 3 Hz and eases back to solid as the grace ends', () => {
  assert.ok(GRACE_PULSE_HZ <= 3, 'WCAG 2.3.1 general flash threshold');
  assert.ok(graceOpacity(0.001, 0.5, false) > 0.99, 'no pop to solid on the last frame');
  assert.ok(graceOpacity(0.001, 0.5, true) > 0.99);
});

test('the fade scales the car body opacity and restores every material exactly', () => {
  const car = makeCar(CAR_STYLES.roadster);
  const before = new Map(materialsOf(car).map(m => [m, m.opacity]));
  const fade = createGraceFade(car);
  const vfx = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6 });
  car.add(new THREE.Mesh(new THREE.BoxGeometry(), vfx)); // aero VFX attach later and keep their own opacity
  fade(0.4);
  for (const [m, base] of before) {
    if (m instanceof THREE.ShaderMaterial) continue;
    assert.ok(m.transparent, `${m.type} blends`);
    assert.ok(Math.abs(m.opacity - base * 0.4) < 1e-9, `${m.type} scaled from ${base}`);
  }
  assert.equal(vfx.opacity, 0.6);
  fade(1);
  for (const [m, base] of before) assert.equal(m.opacity, base);
});

test('materials blend from creation, so the first hit compiles no new shader mid-race', () => {
  const car = makeCar(CAR_STYLES.roadster);
  createGraceFade(car);
  for (const m of materialsOf(car)) assert.ok(m.transparent, `${m.type} is transparent before any hit`);
});

test('the race renderer drives the player fade from the grace cooldown', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(world, /createGraceFade\(player\)/);
  assert.match(world, /graceOpacity\(car\.cooldown, race\.elapsed, reducedMotion\)/);
});
