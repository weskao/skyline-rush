import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createGraceFade, graceOpacity } from '../src/grace-fade.ts';
import { CAR_STYLES, makeCar } from '../src/car-model.js';

const materialsOf = root => {
  const found = new Set();
  root.traverse(object => { for (const m of [].concat(object.material ?? [])) found.add(m); });
  return [...found];
};

test('recovery leaves the car solid while Ghost Phase uses a steady translucent body', () => {
  assert.equal(graceOpacity({ cooldown: 1.5, effects: { ghost: 0 } }, false), 1);
  const steady = graceOpacity({ cooldown: 0, effects: { ghost: 2 } }, false);
  assert.ok(steady > 0.3 && steady < 0.8);
  assert.equal(graceOpacity({ cooldown: 1, effects: { ghost: 1 } }, true), steady);
  assert.ok(graceOpacity({ effects: { ghost: 0.001 } }, false) > 0.99);
});

test('the fade scales the car body opacity and restores every material exactly', () => {
  const car = makeCar(CAR_STYLES.roadster);
  const before = new Map(materialsOf(car).map(m => [m, m.opacity]));
  const fade = createGraceFade(car);
  const vfx = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6 });
  car.add(new THREE.Mesh(new THREE.BoxGeometry(), vfx)); // aero VFX attach later and keep their own opacity
  fade(0.4);
  for (const [m, base] of before) {
    if (m instanceof THREE.ShaderMaterial || m === car.getObjectByName('Rear LED core').material) continue;
    assert.ok(m.transparent, `${m.type} blends`);
    assert.ok(Math.abs(m.opacity - base * 0.4) < 1e-9, `${m.type} scaled from ${base}`);
  }
  assert.equal(car.getObjectByName('Rear LED core').material.opacity, 1);
  assert.equal(vfx.opacity, 0.6);
  fade(1);
  for (const [m, base] of before) assert.equal(m.opacity, base);
});

test('materials blend from creation, so the first hit compiles no new shader mid-race', () => {
  const car = makeCar(CAR_STYLES.roadster);
  createGraceFade(car);
  for (const m of materialsOf(car)) assert.ok(m.transparent, `${m.type} is transparent before any hit`);
});

test('the race renderer drives the player phase effect from live race state', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(world, /createGhostPhase\(player\)/);
  assert.match(world, /ghostPhase\.update\(car, [^;]+reducedMotion\)/);
});
