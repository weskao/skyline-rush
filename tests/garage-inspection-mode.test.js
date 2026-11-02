import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultGarageCamera, garagePreset, setGarageMode, garageFramedDistance,
  dragGarageCamera, zoomGarageCamera,
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

// Real Three.js bounds: the raised spoiler/folded wheels must remain inside narrow-phone framing.
test('Garage Studio frames the full Ground and Flight vehicle at all camera presets', async () => {
  const THREE = await import('three');
  const { createGarageStage } = await import('../src/garage-stage.ts');
  const stage = createGarageStage(new THREE.Texture());
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
