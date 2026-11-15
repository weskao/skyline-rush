import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultGarageCamera, garagePreset, setGarageMode, garageFramedDistance,
  dragGarageCamera, zoomGarageCamera, GARAGE_MAX_ZOOM, GARAGE_EXHAUST_REACH,
} from '../src/garage-camera.ts';

test('ground and flight switch without resetting orbit, and angle/zoom preserve the pose', () => {
  const ground = defaultGarageCamera();
  assert.equal(ground.mode, 'ground');
  const flight = setGarageMode(ground, 'flight');
  assert.equal(flight.mode, 'flight');
  assert.equal(flight.zoom, ground.zoom);
  assert.equal(zoomGarageCamera(dragGarageCamera(flight, 20, 5), .85).mode, 'flight');
  assert.equal(garagePreset('side').yaw, Math.PI / 2);
  assert.equal(setGarageMode(flight, 'ground').mode, 'ground');
});

test('projection fit keeps the entire car visible at every angle, aspect and safe zoom', () => {
  const half = { x: 1.3, y: .95, z: 2.6 };
  const tanV = Math.tan(49 * Math.PI / 360);
  for (const aspect of [.45, .6, 1, 1.8, 2.5])
    for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI])
      for (const pitch of [.08, .2, 1.18])
        for (const zoom of [.75, 1, 1.6]) {
          const d = garageFramedDistance(aspect, zoom, half, yaw, pitch);
          const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
          const width = Math.abs(cy) * half.x + Math.abs(sy) * half.z;
          const height = Math.abs(sy * sp) * half.x + Math.abs(cp) * half.y + Math.abs(cy * sp) * half.z;
          const depth = Math.abs(sy * cp) * half.x + Math.abs(sp) * half.y + Math.abs(cy * cp) * half.z;
          assert.ok(d - depth >= width / (tanV * aspect) * 1.1 - 1e-9);
          assert.ok(d - depth >= height / tanV * 1.1 - 1e-9);
        }
  assert.ok(garageFramedDistance(.5, 1.6, half, Math.PI/2, .2) >
    garageFramedDistance(.5, .75, half, Math.PI/2, .2));
});

test('max zoom-out frames the full exhaust trail with one limit for front and rear views', () => {
  const half = { x: 1.3, y: .95, z: 2.6 };
  const tanV = Math.tan(49 * Math.PI / 360);
  const max = zoomGarageCamera(defaultGarageCamera(), 100).zoom;
  assert.equal(max, GARAGE_MAX_ZOOM);
  // The trail runs GARAGE_EXHAUST_REACH metres past the rear; the camera stays on the car centre.
  const tail = half.z + GARAGE_EXHAUST_REACH;
  for (const aspect of [.45, .6, 1, 1.8, 2.5])
    for (const yaw of [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4])
      for (const pitch of [.08, .2, .27, 1.18]) {
        const d = garageFramedDistance(aspect, max, half, yaw, pitch);
        // Front and rear (and every mirrored angle) share the same pull-back limit.
        assert.ok(Math.abs(d - garageFramedDistance(aspect, max, half, yaw + Math.PI, pitch)) < 1e-9);
        const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
        const width = Math.abs(cy) * half.x + Math.abs(sy) * tail;
        const height = Math.abs(sy * sp) * half.x + Math.abs(cp) * half.y + Math.abs(cy * sp) * tail;
        const depth = Math.abs(sy * cp) * half.x + Math.abs(sp) * half.y + Math.abs(cy * cp) * tail;
        assert.ok(d - depth >= width / (tanV * aspect) - 1e-9, `tail clipped: aspect ${aspect} yaw ${yaw} pitch ${pitch}`);
        assert.ok(d - depth >= height / tanV - 1e-9, `tail clipped: aspect ${aspect} yaw ${yaw} pitch ${pitch}`);
      }
  // Zooming in is unchanged: default and nearest views never pay for the trail.
  assert.equal(garageFramedDistance(1.8, 1, half, .7, .27), garageFramedDistanceBefore(1.8, 1, half, .7, .27));
  assert.equal(garageFramedDistance(1.8, .75, half, .7, .27), garageFramedDistanceBefore(1.8, .75, half, .7, .27));
});

// Pre-change formula, so zoom <= 1 framing provably stays identical.
function garageFramedDistanceBefore(aspect, zoom, half, yaw, pitch) {
  const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
  const width = Math.abs(cy) * half.x + Math.abs(sy) * half.z;
  const height = Math.abs(sy * sp) * half.x + Math.abs(cp) * half.y + Math.abs(cy * sp) * half.z;
  const depth = Math.abs(sy * cp) * half.x + Math.abs(sp) * half.y + Math.abs(cy * cp) * half.z;
  const vTan = Math.tan(49 * Math.PI / 360);
  const fit = Math.max(width / (vTan * aspect), height / vTan);
  return Math.max(4, depth + fit * (1.12 + (zoom - .75) * .45));
}

// Real Three.js bounds: the raised spoiler/folded wheels must remain inside narrow-phone framing.
test('Garage Studio frames the full Ground and Flight vehicle at all camera presets', async () => {
  const THREE = await import('three');
  const { createGarageStage } = await import('../src/garage-stage.ts');
  const stage = createGarageStage(new THREE.Texture(), new THREE.Texture());
  try {
    for (const aspect of [.45, .65, 1, 2.2])
      for (const mode of ['ground', 'flight'])
        for (const angle of ['front', 'rear', 'side', 'top', 'cinematic']) {
          const camera = new THREE.PerspectiveCamera(49, aspect, .1, 100);
          stage.update(camera, { ...garagePreset(angle), mode }, 0, true);
          const bounds = stage.inspectBounds(camera);
          assert.equal(bounds.inFrame, true,
            `${mode} ${angle} aspect=${aspect} projected=${JSON.stringify(bounds)}`);
        }
  } finally { stage.dispose(); }
});

test('Studio orbit starts at the selected angle, advances smoothly and resumes from the adjusted view', async () => {
  const THREE = await import('three');
  const { createGarageStage } = await import('../src/garage-stage.ts');
  const stage = createGarageStage(new THREE.Texture(), new THREE.Texture());
  const camera = new THREE.PerspectiveCamera(49, 1, .1, 100);
  const orbit = { ...garagePreset('side'), autoRotate: true };
  const direction = new THREE.Vector3();
  const bearing = () => {
    camera.getWorldDirection(direction);
    return Math.atan2(-direction.x, -direction.z);
  };
  try {
    stage.update(camera, orbit, 60, false);
    const initial = bearing();
    stage.update(camera, orbit, 60.05, false);
    assert.ok(Math.abs(bearing() - initial - .0065) < .001);
    stage.update(camera, zoomGarageCamera(orbit, .85), 60.10, false);
    assert.ok(Math.abs(bearing() - initial - .013) < .001);
    const fixed = dragGarageCamera(garagePreset('side'), 20, 0);
    stage.update(camera, fixed, 60.15, false);
    const adjusted = bearing();
    stage.update(camera, { ...fixed, autoRotate: true }, 60.20, false);
    assert.ok(Math.abs(bearing() - adjusted) < .001);
    assert.ok(Math.abs(initial - Math.PI / 2) < .001);
  } finally { stage.dispose(); }
});
