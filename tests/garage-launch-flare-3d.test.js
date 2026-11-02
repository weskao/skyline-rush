import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3, Matrix4 } from 'three';
import { createAeroVFX } from '../src/aero-vfx.js';
import { createRace } from '../src/game.js';
import { vfxSettings } from '../src/vfx-settings.ts';
import { LAUNCH_FLARE_STYLES } from '../src/garage-launch-flare-styles.ts';

// A launch flare is a volume around the tail, not a camera-facing sticker: rays, rings and the shock shell
// are real 3D meshes that keep their depth from every camera angle.
function launched(id, settings = vfxSettings({ enabled: true, quality: 'high' }), reducedMotion = false) {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  car.add(car.userData.body); scene.add(car);
  const aero = createAeroVFX(scene, car), race = createRace();
  aero.setSkins({ 'launch-flare': id });
  race.phase = 'countdown'; aero.update(race, 0.05, new Vector3(), settings, reducedMotion);
  race.phase = 'racing'; aero.update(race, 0.05, new Vector3(), settings, reducedMotion);
  const get = name => scene.getObjectByName(name);
  return { scene, aero, race, settings, burst: get('Launch flare burst'), rays: get('Launch flare rays'),
    rings: get('Launch flare rings'), shell: get('Launch flare shell') };
}
const axisOf = (mesh, index) => {
  const m = new Matrix4(); mesh.getMatrixAt(index, m);
  return new Vector3().setFromMatrixColumn(m, 1).normalize();
};

test('every premium flare launches a 3D shock shell; rayed flares spread real rays in depth', () => {
  for (const [id, style] of Object.entries(LAUNCH_FLARE_STYLES)) {
    const { burst, rays, rings, shell } = launched(id);
    assert.ok(shell?.visible, `${id} expands a 3D shell`);
    assert.equal(shell.geometry.type, 'SphereGeometry');
    assert.doesNotMatch(burst.material.fragmentShader, /\brays\b/, 'the camera-facing glow no longer paints flat rays');
    if (style.shape === 'ring') {
      assert.equal(rays.visible, false, `${id} has no rays`);
      assert.ok(rings.visible && rings.count === 2, `${id} spins two 3D rings`);
      assert.ok(Math.abs(axisOf(rings, 0).dot(axisOf(rings, 1))) < 0.95, 'the rings are tilted apart, like a gyroscope');
      continue;
    }
    assert.equal(rings.visible, false, `${id} has no rings`);
    assert.ok(rays.visible, `${id} rays visible`);
    assert.ok(rays.count >= style.rays, `${id} draws at least its ${style.rays} rays (${rays.count})`);
    const depth = Array.from({ length: rays.count }, (_, i) => Math.abs(axisOf(rays, i).z));
    assert.ok(Math.max(...depth) > 0.3, `${id} rays reach toward and away from the camera, not one flat plane`);
    if (style.shape === 'fan') {
      const up = Array.from({ length: rays.count }, (_, i) => axisOf(rays, i).y);
      assert.ok(up.every(y => y > -0.05), `${id} fans upward from the tail`);
    }
  }
});

test('3D flare parts follow quality and comfort settings and never re-upload instances per frame', () => {
  const low = launched('launch-flare-gold', vfxSettings({ enabled: true, quality: 'low' }));
  assert.ok(low.rays.visible && low.burst.visible, 'Low keeps the rays and the glow');
  assert.equal(low.shell.visible, false, 'Low skips the large shell overdraw, like the body glow');
  for (const off of [launched('launch-flare-ring', vfxSettings({ enabled: false })),
    launched('launch-flare-gold', vfxSettings({ enabled: true }), true)]) {
    assert.ok(![off.burst, off.rays, off.rings, off.shell].some(mesh => mesh.visible), 'VFX Off and Reduced Motion show nothing');
  }
  const { aero, race, settings, rays } = launched('launch-flare-magenta');
  const version = rays.instanceMatrix.version, turn = rays.rotation.z;
  for (let i = 0; i < 20; i++) aero.update(race, 1 / 60, new Vector3(), settings, false);
  assert.equal(rays.instanceMatrix.version, version, 'ray matrices are written on skin change only');
  assert.notEqual(rays.rotation.z, turn, 'the magenta vortex turns its rays');
});
