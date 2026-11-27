import test from 'node:test';
import assert from 'node:assert/strict';
import { Layers, Matrix4, Scene, Texture } from 'three';
import { createRivalFleet } from '../src/rival-fleet.js';
import { makeMotorsportRival, syncRivalWheels } from '../src/rival-car-kit.js';
import { measureAirflowProfile } from '../src/airflow-geometry.ts';
import { RACE_DRIVER_IDS } from '../src/race-grid.ts';

const camera = new Layers();
const race = { phase: 'racing', rivals: RACE_DRIVER_IDS.slice(1).map(id => ({ id, name: id })), rivalVisualSeed: 31 };
const drawn = car => { const out = []; car.traverseVisible(o => { if (o.isMesh && o.layers.test(camera)) out.push(o); }); return out; };

test('each rival draws its four tyres and four rims as two instanced draws with the car\'s own materials', () => {
  const fleet = createRivalFleet(new Scene(), new Texture());
  fleet.sync(race, 'high');
  for (const car of fleet.cars) {
    const parts = car.userData.wheels.flatMap(wheel => wheel.children.slice(0, 2));
    assert.ok(parts.every(part => !part.layers.test(camera)), 'wheel parts stay as pose sources only');
    const instanced = drawn(car).filter(o => o.isInstancedMesh && o.count === 4);
    assert.equal(instanced.length, 2);
    // Same material objects: three sorts opaque draws by material.id, so the draw order is unchanged.
    assert.deepEqual(instanced.map(o => o.material), [parts[0].material, parts[1].material]);
    assert.deepEqual(instanced.map(o => o.geometry), [parts[0].geometry, parts[1].geometry]);
  }
});

test('instances follow steering, fold-out, rim spin and the quality tier', () => {
  const fleet = createRivalFleet(new Scene(), new Texture());
  fleet.sync(race, 'high');
  const car = fleet.cars[0], m = new Matrix4(), want = new Matrix4();
  car.position.set(3, 1, -40); car.rotation.y = .4;
  car.userData.wheels.forEach((wheel, i) => { wheel.rotation.set(0, .2 * i, .3); wheel.children[1].rotateY(1.1 + i); });
  syncRivalWheels(car);
  car.updateMatrixWorld(true);
  const [tires, rims] = drawn(car).filter(o => o.isInstancedMesh);
  car.userData.wheels.forEach((wheel, i) => {
    for (const [mesh, part] of [[tires, wheel.children[0]], [rims, wheel.children[1]]]) {
      mesh.getMatrixAt(i, m);
      m.premultiply(mesh.matrixWorld);
      want.copy(part.matrixWorld);
      m.elements.forEach((v, k) => assert.ok(Math.abs(v - want.elements[k]) < 1e-6, `wheel ${i} element ${k}`));
    }
  });
  fleet.sync(race, 'low');
  assert.equal(tires.geometry, car.userData.wheels[0].children[0].geometry);
  assert.equal(rims.geometry, car.userData.wheels[0].children[1].geometry);
});

test('instancing keeps rival object ids (flame flicker phase) and the measured car shape', () => {
  const plain = makeMotorsportRival(0);
  const fleet = createRivalFleet(new Scene(), new Texture());
  const cars = fleet.cars;
  let last = 0;
  for (const car of cars) car.traverse(o => { if (!o.isInstancedMesh) last = Math.max(last, o.id); });
  for (const car of cars) car.traverse(o => { if (o.isInstancedMesh) assert.ok(o.id > last, 'proxies are made after every rival'); });
  const chassis0 = cars.find(car => car.name === plain.name);
  assert.deepEqual(measureAirflowProfile(chassis0).bounds, measureAirflowProfile(plain).bounds);
});
