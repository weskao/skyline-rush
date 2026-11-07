import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyCarReflections, CAR_REFLECTION } from '../src/car-reflections.ts';
import { CAR_STYLES, makeCar } from '../src/car-model.js';
import { createGarageStage, GARAGE_LIGHTING } from '../src/garage-stage.ts';

const materialsOf = root => {
  const found = new Set();
  root.traverse(object => { for (const m of [].concat(object.material ?? [])) found.add(m); });
  return [...found];
};

test('every lit Roadster material reflects the softened car map at one intensity', () => {
  const car = makeCar(CAR_STYLES.roadster);
  const envMap = new THREE.Texture();
  applyCarReflections(car, envMap);
  const lit = materialsOf(car).filter(m => m instanceof THREE.MeshStandardMaterial);
  assert.ok(lit.length > 5, 'paint, glass, trim and nozzles are lit materials');
  // Without its own envMap a material ignores envMapIntensity; the shared room's panels then glint on the rear.
  for (const m of lit) {
    assert.equal(m.envMap, envMap, `${m.type} keeps the car map`);
    assert.equal(m.envMapIntensity, CAR_REFLECTION.intensity, 'one intensity: the rear never looks disconnected');
  }
  for (const m of materialsOf(car).filter(m => !(m instanceof THREE.MeshStandardMaterial)))
    assert.equal(m.envMap ?? null, null, 'unlit lamps and VFX shaders are untouched');
  assert.ok(CAR_REFLECTION.intensity < 0.42, 'dimmer than the race scene environment that washed the paint out');
  assert.ok(CAR_REFLECTION.blur > 0.04, 'blurrier than the shared room map whose light panels glinted');
});

test('Studio car uses the car map while the stage keeps the world environment', () => {
  const world = new THREE.Texture(), carMap = new THREE.Texture();
  const stage = createGarageStage(world, carMap);
  const car = stage.scene.children.find(object => object.userData.body);
  assert.equal(stage.scene.environment, world);
  assert.ok(stage.scene.environmentIntensity < 0.8, 'the stage no longer floods the floor and paint');
  assert.equal(car.userData.body.material.envMap, carMap, 'the Studio finish is also softened');
  assert.ok(GARAGE_LIGHTING.dim < GARAGE_LIGHTING.bright && GARAGE_LIGHTING.bright === 1, 'sun keeps the default; moon dims');
  stage.dispose();
});
