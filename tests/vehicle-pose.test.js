import test from 'node:test';
import assert from 'node:assert/strict';
import { Object3D, Vector3 } from 'three';
import { RACE_TRACKS } from '../src/game.js';
import { trackFrame } from '../src/track-paths.ts';
import { orientCarOnRoad } from '../src/vehicle-pose.ts';

const dot = (a, b) => new Vector3(...a).dot(b);
const localUp = new Vector3(0, 1, 0);
const localForward = new Vector3(0, 0, -1);

test('every elevated or curved course aligns the wheels and chassis with the road normal', () => {
  for (const id of ['spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic']) {
    const car = new Object3D();
    const length = RACE_TRACKS[id].length;
    for (let distance = 1; distance < length - 1; distance += 23) {
      const frame = trackFrame(id, distance);
      orientCarOnRoad(car, frame);
      assert.ok(dot(frame.up, localUp.clone().applyQuaternion(car.quaternion)) > 0.999999,
        `${id} must retain slope and banking @ ${distance}`);
      assert.ok(dot(frame.forward, localForward.clone().applyQuaternion(car.quaternion)) > 0.999999,
        `${id} must follow the road tangent @ ${distance}`);
    }
  }
});

test('Sky Spiral orientation stays continuous through both quarter turns and the helix seams', () => {
  const car = new Object3D();
  const previous = car.quaternion.clone();
  for (let distance = 1080; distance <= 2220; distance += 1) {
    orientCarOnRoad(car, trackFrame('spiral', distance));
    if (distance > 1080) assert.ok(previous.angleTo(car.quaternion) < 0.04,
      `unexpected rotation snap at ${distance} m`);
    previous.copy(car.quaternion);
  }
});

test('steering lean and flight pitch are local offsets, not replacements for road alignment', () => {
  const car = new Object3D();
  for (const id of ['spiral', 'alpine', 'cosmic']) {
    const frame = trackFrame(id, id === 'spiral' ? 1450 : 3200);
    orientCarOnRoad(car, frame, 0.04, 0.08, -0.06);
    const normal = localUp.clone().applyQuaternion(car.quaternion);
    const forward = localForward.clone().applyQuaternion(car.quaternion);
    assert.ok(dot(frame.up, normal) > 0.98, id);
    assert.ok(dot(frame.forward, forward) > 0.98, id);
  }
});

test('the ground shadow lies on the banked, sloped road under the car, along its heading', async () => {
  const { placeGroundShadow } = await import('../src/vehicle-pose.ts');
  const { trackLocalPosition } = await import('../src/track-paths.ts');
  const planeNormal = new Vector3(0, 0, 1), planeLength = new Vector3(0, 1, 0); // PlaneGeometry(5, 8): 8 m along local y
  for (const id of ['spiral', 'taipei', 'alpine', 'cosmic']) for (const distance of [900, 1260, 1650, 2100]) for (const x of [-7.5, -2.5, 2.5]) for (const altitude of [0, 3]) {
    const frame = trackFrame(id, distance), origin = distance - 20, shadow = new Object3D();
    const car = new Vector3(...trackLocalPosition(id, distance, x, altitude, origin));
    placeGroundShadow(shadow, frame, car, altitude);
    const road = new Vector3(...trackLocalPosition(id, distance, x, 0.03, origin));
    assert.ok(shadow.position.distanceTo(road) < 1e-6, `${id} @${distance} x ${x} alt ${altitude}: shadow ${shadow.position.distanceTo(road)} m off the road`);
    assert.ok(dot(frame.up, planeNormal.clone().applyQuaternion(shadow.quaternion)) > 0.999999, `${id} @${distance}: shadow tilts with the road`);
    assert.ok(Math.abs(dot(frame.forward, planeLength.clone().applyQuaternion(shadow.quaternion))) > 0.999999, `${id} @${distance}: shadow follows the heading`);
  }
});
