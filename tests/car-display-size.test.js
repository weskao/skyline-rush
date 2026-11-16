import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CAR_STYLES, makeCar } from '../src/car-model.js';
import { createGarageModel } from '../src/garage-model.ts';
import { createAeroVFX } from '../src/aero-vfx.js';
import { CLEARANCE, measureAirflowProfile } from '../src/airflow-geometry.ts';
import { CARS } from '../src/car-catalog.ts';

// Owner, 2026-11-13: every car shows at the Roadster's size on Home, race, Garage and Coming Soon, with no
// per-car constant. A GLB of any authored size is measured when dressed and its instance scaled to the procedural
// Roadster: x matches the width; y and z share one factor (wheels spin round) balancing roof height and length.
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0)); };
const extent = ({ min, max }) => ({ width: max.x - min.x, roof: max.y, length: max.z - min.z });
const reference = extent(measureAirflowProfile(makeCar(CAR_STYLES.roadster)).bounds);

/** A stand-in GLB: body + cabin + four wheels resting on y = 0, authored at an arbitrary size. */
function glb([w, h, l]) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h * .45, l));
  body.name = 'body';
  body.position.y = h * .45;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * .6, h * .35, l * .35));
  cabin.position.y = h * .825;
  root.add(body, cabin);
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(h * .22, h * .22, w * .12));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x * w * .42, h * .22, z * l * .33);
    root.add(wheel);
  }
  return root;
}

async function dressed(id, size, hostName) {
  const car = makeCar(CAR_STYLES.roadster), scene = new THREE.Scene();
  scene.add(car);
  const aero = createAeroVFX(scene, car), original = glb(size);
  const cache = { async load(key) { return { kind: 'model', id: key, instance: () => original.clone(true), release() {} }; } };
  const model = createGarageModel({ id, cache, dataset: {}, compile: async () => {} });
  model.sync(true, 'high', { name: hostName, car, keep: aero.group, scene, fitAirflow: aero.fitAirflow }, hostName === 'home' ? 'drive' : 'garage');
  await settle();
  const instance = car.children.find(child => child.userData.garageModel === id);
  assert.ok(instance, `${id} dressed on ${hostName}`);
  return { car, instance, original, aero, shown: measureAirflowProfile(instance, new THREE.Group()).bounds };
}

test('no car carries a hand-tuned display scale', () => {
  for (const [id, car] of Object.entries(CARS)) assert.equal('scale' in car, false, `${id}: scale is measured, not authored`);
});

const SIZES = { 'a small, short GLB': [1.6, .8, 3.1], 'a wide, tall, long GLB': [3.4, 2.1, 7.4], 'a GT-proportioned GLB': [2.364, 1.084, 4.348] };
for (const id of ['crimson-gt', 'roadster2']) {
  for (const [label, size] of Object.entries(SIZES)) {
    test(`${id} as ${label} shows at the Roadster's size on every screen`, async () => {
      for (const hostName of ['home', 'studio', 'showcase']) {
        const { car, instance, original, aero, shown } = await dressed(id, size, hostName);
        const got = extent(shown);
        assert.deepEqual(car.userData.visualBounds, shown, `${hostName} car effects see the dressed model's neutral bounds`);
        assert.equal(instance.scale.y, instance.scale.z, 'y and z share one factor: wheels stay round');
        assert.deepEqual(original.scale.toArray(), [1, 1, 1], 'the cached original GLB is untouched');
        assert.ok(Math.abs(got.width / reference.width - 1) < .01, `${hostName} width ${got.width.toFixed(3)} vs ${reference.width.toFixed(3)}`);
        const balance = Math.sqrt(got.roof / reference.roof * got.length / reference.length);
        assert.ok(Math.abs(balance - 1) < .01, `${hostName} roof ${got.roof.toFixed(3)} / length ${got.length.toFixed(3)} balance ${balance.toFixed(3)}`);
        assert.ok(shown.min.y > -.01, 'tyres stay on the ground');
        // the airflow fit measures the shown (scaled) shell
        const [flow] = aero.group.children;
        flow.geometry.computeBoundingBox();
        const roof = flow.geometry.boundingBox.max.y;
        assert.ok(roof > got.roof + CLEARANCE * .5 && roof < got.roof + CLEARANCE + .1, `${hostName} airflow roof ${roof.toFixed(3)} hugs ${got.roof.toFixed(3)}`);
      }
    });
  }
}

test('the pipeline probe is not a player car and keeps its authored size', async () => {
  const { instance } = await dressed('pipeline-probe', [3.4, 2.1, 7.4], 'studio');
  assert.deepEqual(instance.scale.toArray(), [1, 1, 1]);
});
