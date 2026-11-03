import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CAR_STYLES, makeCar } from '../src/car-model.js';
import { REAR_PORTS } from '../src/aero-vfx.js';
import { addRoadsterTrim } from '../src/roadster-fidelity.js';

const rawTrim = () => {
  const group = new THREE.Group();
  addRoadsterTrim(group, {
    paint: new THREE.MeshPhysicalMaterial({ color: '#e6e9e7' }),
    black: new THREE.MeshStandardMaterial({ color: '#101923' }),
    white: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    light: new THREE.MeshBasicMaterial({ color: '#ff1616' }),
  });
  return group;
};

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
  assert.equal(named(car, 'Roadster front slit lamp').length, 2, 'the reference has two tiny lamps, not a full-width white front LED');
  assert.equal(named(car, 'Roadster front light blade').length, 0, 'remove the inaccurate full-width illuminated nose');
  assert.equal(named(car, 'Roadster triangular headlamp').length, 2, 'both tucked-away triangular corner lights');
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

test('Roadster reference front has a white wedge, tiny symmetric lamps, and a low recessed black mouth', () => {
  const car = roadster();
  const detail = rawTrim();
  const front = named(detail, 'Roadster sculpted front fascia');
  assert.equal(front.length, 1);
  assert.equal(front[0].material.color.getHexString(), 'e6e9e7', 'nose remains body-painted, not graphite');
  const lamps = named(detail, 'Roadster front slit lamp');
  assert.equal(lamps.length, 2);
  const aperture = named(detail, 'Roadster black lower intake');
  assert.equal(aperture.length, 1);
  const bounds = new THREE.Box3().setFromObject(aperture[0]);
  assert.ok(bounds.max.x - bounds.min.x >= 1.4, 'front intake is wide and low');
  assert.ok(bounds.max.y - bounds.min.y <= 0.20, 'the grille is a thin lower mouth, not a tall smiling opening');
  const body = car.userData.body.geometry.attributes.position;
  const frontRings = [];
  for (let i = 0; i < body.count; i++)
    if (body.getZ(i) < -2.42) frontRings.push(Math.abs(body.getX(i)));
  assert.ok(frontRings.length > 0);
  assert.ok(Math.max(...frontRings) < 1.0, 'the nose narrows noticeably ahead of the wheel arches');
});

test('Roadster rear reference layers an inset black lamp recess above a curved painted panel', () => {
  const car = roadster();
  const detail = rawTrim();
  assert.equal(named(detail, 'Roadster black rear light recess').length, 1);
  const fascia = named(detail, 'Roadster curved rear fascia');
  assert.equal(fascia.length, 1);
  assert.equal(fascia[0].material.color.getHexString(), 'e6e9e7', 'lower rear panel must be pearl paint');
  assert.equal(named(detail, 'Roadster curved rear valance').length, 1);
  const led = car.userData.rearLight.group;
  const black = led.getObjectByName('Rear LED black panel');
  const core = led.getObjectByName('Rear LED core');
  assert.ok(black && core);
  assert.ok(black.geometry.parameters.height >= 0.17, 'black light slot is taller than the thin LED');
  assert.ok(core.geometry.parameters.height <= 0.020, 'rear illumination stays a hairline');
  assert.ok(led.position.z >= 2.40, 'LED sits in front of the recessed black rear panel');
});

test('four recessed NITRO ports and diffuser form the lower rear without changing flight anchors', () => {
  const car = roadster();
  const nozzles = named(car, 'Roadster recessed thruster');
  assert.equal(nozzles.length, REAR_PORTS.length);
  nozzles.forEach((port, i) => {
    assert.deepEqual(port.position.toArray().slice(0, 2), REAR_PORTS[i].position.slice(0, 2));
    assert.equal(port.name, 'Roadster recessed thruster');
  });
  assert.equal(named(rawTrim(), 'Roadster deep rear diffuser').length, 1);
  assert.ok(named(car, 'Roadster diffuser vane').length >= 5);
  assert.equal(named(car, 'Roadster aerofoil').length, 1);
  assert.equal(car.userData.wing.userData.lift, 0.34);
});
