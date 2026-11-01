import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeCar, CAR_STYLES } from '../src/car-model.js';

// Recorded from the unmerged models: merging may change how parts are drawn, never what is drawn.
const SHAPES = {
  roadster: { triangles: 1380, box: [-1.2, 0.02, -2.48, 1.2, 1.4, 2.385] },
  nova: { triangles: 966, box: [-1.25, 0.02, -2.53, 1.25, 1.36, 2.73] },
  orbit: { triangles: 1194, box: [-1.25, 0.02, -2.385, 1.25, 1.6225, 2.285] },
  apex: { triangles: 1038, box: [-1.1925, 0.02, -2.67, 1.1925, 1.73, 2.31] },
  commuter: { triangles: 978, box: [-1.25, 0.02, -2.38, 1.25, 1.6225, 2.28] },
};

const triangles = car => {
  let count = 0;
  car.traverse(o => { if (o.isMesh) count += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  return count;
};

for (const [name, style] of Object.entries(CAR_STYLES)) {
  test(`${name}: static parts sharing a material draw as one mesh`, () => {
    const car = makeCar(style);
    const { body, wing } = car.userData;
    const statics = car.children.filter(child => child.isMesh && child !== body && child !== wing);
    const materials = statics.map(mesh => mesh.material);
    assert.equal(new Set(materials).size, materials.length, 'one static mesh per material');
  });

  test(`${name}: merged model keeps every triangle, its bounds, body and moving parts`, () => {
    const car = makeCar(style, '#123456');
    car.updateMatrixWorld(true);
    assert.equal(triangles(car), SHAPES[name].triangles);
    const box = new THREE.Box3().setFromObject(car);
    [...box.min.toArray(), ...box.max.toArray()].forEach((v, i) => assert.ok(Math.abs(v - SHAPES[name].box[i]) < 1e-4, `bounds[${i}]`));
    // The afterimage outline and QA probe read the paint shell alone.
    assert.equal(car.userData.body.geometry, style.body);
    assert.equal(car.userData.body.material.color.getHexString(), '123456');
    assert.equal(car.userData.wheels.length, 4);
    assert.ok(car.userData.wheels.every(wheel => wheel.parent === car));
    assert.equal(car.userData.jets.parent, car);
    assert.equal(car.userData.wing.parent, car);
  });

  test(`${name}: cars of one style share merged geometry but keep their own materials`, () => {
    const [a, b] = [makeCar(style, '#ff0000'), makeCar(style, '#00ff00')];
    const merged = car => car.children.filter(child => child.isMesh && child.geometry.userData.mergedCarParts);
    assert.ok(merged(a).length > 0);
    assert.deepEqual(merged(a).map(mesh => mesh.geometry), merged(b).map(mesh => mesh.geometry));
    merged(a).forEach((mesh, i) => assert.notEqual(mesh.material, merged(b)[i].material));
  });
}
