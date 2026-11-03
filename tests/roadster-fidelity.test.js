import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CAR_STYLES, makeCar } from '../src/car-model.js';
import { REAR_PORTS } from '../src/aero-vfx.js';

const roadster = () => makeCar(CAR_STYLES.roadster);
const named = (root, name) => {
  const matches = [];
  root.traverse(node => {
    if (node.name === name) matches.push(node);
    for (const label of node.userData.mergedPartNames ?? []) if (label === name) matches.push(node);
  });
  return matches;
};

test('Roadster 2 body has a sculpted multi-section shell and physical pearl finish', () => {
  const car = roadster();
  const body = car.userData.body;
  assert.ok(body.geometry.attributes.position.count >= 200, 'flat four-corner stations cannot reproduce the wedge or shoulders');
  assert.ok(body.material instanceof THREE.MeshPhysicalMaterial);
  assert.ok(body.material.clearcoat >= 0.7);
  assert.ok(body.material.roughness <= 0.28);
  assert.equal(body.material.color.getHexString(), 'e6e9e7');
  const positions = body.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++)
    assert.ok([positions.getX(i), positions.getY(i), positions.getZ(i)].every(Number.isFinite), 'no NaN body vertices');
  const bounds = new THREE.Box3().setFromObject(car);
  assert.ok(bounds.max.x <= 1.3 && bounds.min.x >= -1.3, 'retain existing collision envelope');
  assert.ok(bounds.max.z < 2.8 && bounds.min.z > -2.8);
  assert.ok(bounds.min.y >= 0, 'no body or wheel sinking below the road');
});

test('Roadster has tapered gold-glazed canopy, restrained hood creases and faceted side rockers', () => {
  const car = roadster();
  const canopy = car.children.find(node => node.isMesh && node.geometry === CAR_STYLES.roadster.cabin);
  assert.ok(canopy);
  assert.ok(canopy.material instanceof THREE.MeshPhysicalMaterial, 'not metallic opaque window paint');
  assert.ok(canopy.material.roughness < 0.2);
  assert.ok(canopy.geometry.attributes.position.count >= 16, 'continuous fastback glazing');
  assert.equal(named(car, 'Roadster hood crease').length, 2);
  assert.equal(named(car, 'Roadster sculpted rocker').length, 2);
  assert.equal(named(car, 'Roadster front light blade').length, 1);
  assert.equal(named(car, 'Roadster triangular headlamp').length, 2, 'both tucked-away triangular corner lights');
});

test('Roadster nose face below the light blade is dark fascia, never flat white paint', () => {
  // Reference 05/07: white hood above the blade; carbon band, black intake and splitter below it.
  const car = roadster();
  car.updateMatrixWorld(true);
  const paint = car.userData.body.material;
  const ray = new THREE.Raycaster();
  for (const x of [-.7, -.35, 0, .35, .7]) for (const y of [.42, .5, .58]) {
    ray.set(new THREE.Vector3(x, y, -4), new THREE.Vector3(0, 0, 1));
    const hit = ray.intersectObject(car, true)[0];
    assert.ok(hit, `nose face at x=${x} y=${y}`);
    assert.notEqual(hit.object.material, paint, `white paint shows on the nose face at x=${x} y=${y}`);
  }
  assert.equal(named(car, 'Roadster front splitter').length, 1);
});

test('Roadster rear fascia has a moving wide aerofoil, quad recessed thrusters and real diffuser vanes', () => {
  const car = roadster();
  const wing = car.userData.wing;
  assert.equal(named(car, 'Roadster aerofoil').length, 1);
  assert.equal(wing.userData.lift, 0.34, 'existing boost and flight animation contract');
  assert.ok(wing.parent === car);
  const ports = named(car, 'Roadster recessed thruster');
  assert.equal(ports.length, REAR_PORTS.length);
  ports.forEach((port, index) => assert.ok(Math.abs(port.position.x - REAR_PORTS[index].position[0]) < 0.001));
  assert.ok(named(car, 'Roadster diffuser vane').length >= 5);
  assert.ok(car.userData.rearLight?.group?.parent === car, 'shared animated brake light remains connected');
});

test('Roadster geometric five-spoke aero rims share meshes and retain 4 animatable wheels', () => {
  const car = roadster();
  const wheels = car.userData.wheels;
  assert.equal(wheels.length, 4);
  assert.ok(wheels.every(w => named(w, 'Roadster aero spoke assembly').length === 1));
  assert.ok(wheels.every(w => named(w, 'Roadster aero inset').length === 1));
  assert.ok(wheels.every(w => w.parent === car));
  assert.equal(car.userData.jets.parent, car, 'flight jets unchanged');
});

test('Other vehicle styles preserve their original model material and geometry contracts', () => {
  for (const name of ['nova', 'orbit', 'apex', 'commuter']) {
    const car = makeCar(CAR_STYLES[name]);
    assert.ok(car.userData.body.material instanceof THREE.MeshStandardMaterial, name);
    assert.equal(car.userData.wheels.length, 4, name);
    assert.equal(named(car, 'Roadster recessed thruster').length, 0, name);
  }
});
