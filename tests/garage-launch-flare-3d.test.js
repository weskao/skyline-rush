import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3, Matrix4 } from 'three';
import { createAeroVFX } from '../src/aero-vfx.js';
import { createRace } from '../src/game.js';
import { vfxSettings } from '../src/vfx-settings.ts';
import { LAUNCH_FLARE_STYLES } from '../src/garage-launch-flare-styles.ts';

// A launch flare erupts from under the car and wraps its body: a light pool on the road, 3D rays rising
// around the sills, horizontal rings climbing the body. No bubble or halo floating behind the car.
function launched(id, settings = vfxSettings({ enabled: true, quality: 'high' }), reducedMotion = false) {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  car.add(car.userData.body); scene.add(car);
  const aero = createAeroVFX(scene, car), race = createRace();
  aero.setSkins({ 'launch-flare': id });
  race.phase = 'countdown'; aero.update(race, 0.05, new Vector3(), settings, reducedMotion);
  race.phase = 'racing'; aero.update(race, 0.05, new Vector3(), settings, reducedMotion);
  const get = name => scene.getObjectByName(name);
  scene.userData.aero = aero;
  return { scene, car, aero, race, settings, pool: get('Launch flare burst'), rays: get('Launch flare rays'),
    rings: get('Launch flare rings'), glow: get('Launch flare body glow') };
}
const launchedAero = scene => scene.userData.aero;
const matrixOf = (mesh, index) => { const m = new Matrix4(); mesh.getMatrixAt(index, m); return m; };
const column = (m, i) => new Vector3().setFromMatrixColumn(m, i);

test('no flare shows a bubble or halo; each lights a pool on the road under the car', () => {
  for (const id of Object.keys(LAUNCH_FLARE_STYLES)) {
    const { scene, car, pool } = launched(id);
    assert.equal(!!scene.getObjectByName('Launch flare shell'), false, `${id} has no bubble`);
    assert.ok(pool.visible, `${id} lights the road`);
    assert.equal(!!car.getObjectById(pool.id), true, 'the pool rides with the car');
    assert.equal(!!launchedAero(scene).group.getObjectById(pool.id), true, 'flare parts sit in the effects group, outside the car silhouette used for Studio framing');
    pool.updateWorldMatrix(true, false);
    const up = new Vector3(0, 0, 1).transformDirection(pool.matrixWorld);
    assert.ok(up.y > 0.99, 'pool lies flat on the road');
    const at = new Vector3().setFromMatrixPosition(pool.matrixWorld);
    assert.ok(at.y < 0.2 && Math.abs(at.x) < 0.5 && Math.abs(at.z) < 1, `pool sits under the car (${at.toArray()})`);
  }
});

test('rays rise from under the body on every side; rings climb horizontally around it', () => {
  for (const [id, style] of Object.entries(LAUNCH_FLARE_STYLES)) {
    const { rays, rings } = launched(id);
    if (style.shape === 'ring') {
      assert.equal(rays.visible, false, `${id} has no rays`);
      assert.ok(rings.visible && rings.count === 2, `${id} has two rings`);
      for (const i of [0, 1]) {
        const m = matrixOf(rings, i);
        assert.ok(column(m, 2).normalize().y > 0.99, 'ring is horizontal around the car');
        assert.ok(column(m, 0).length() >= 1.3 && column(m, 1).length() >= 2.5, 'ring encloses the 2 m × 4 m body');
      }
      assert.match(rings.material.vertexShader, /rise/, 'rings climb the body as the flare ages');
      continue;
    }
    assert.equal(rings.visible, false);
    assert.ok(rays.visible && rays.count >= style.rays, `${id} draws its ${style.rays} rays`);
    let left = 0, right = 0;
    for (let i = 0; i < rays.count; i++) {
      const m = matrixOf(rays, i), base = new Vector3().setFromMatrixPosition(m), dir = column(m, 1).normalize();
      assert.ok(base.y < 0.3, `${id} ray ${i} starts under the body`);
      assert.ok(Math.hypot(base.x / 1.1, base.z / 2.2) >= 0.95, `${id} ray ${i} starts at the body's edge, not inside it`);
      assert.ok(dir.y > 0.15, `${id} ray ${i} rises`);
      if (base.x < -0.3) left++; if (base.x > 0.3) right++;
    }
    assert.ok(left > 0 && right > 0, `${id} wraps both sides of the car`);
  }
});

test('flare parts follow quality and comfort settings and never re-upload instances per frame', () => {
  const low = launched('launch-flare-gold', vfxSettings({ enabled: true, quality: 'low' }));
  assert.ok(low.rays.visible && low.pool.visible, 'Low keeps the rays and the road pool');
  assert.equal(low.glow.visible, false, 'Low skips the full-body overdraw');
  for (const off of [launched('launch-flare-ring', vfxSettings({ enabled: false })),
    launched('launch-flare-gold', vfxSettings({ enabled: true }), true)]) {
    assert.ok(![off.pool, off.rays, off.rings, off.glow].some(mesh => mesh.visible), 'VFX Off and Reduced Motion show nothing');
  }
  const { aero, race, settings, rays } = launched('launch-flare-magenta');
  const version = rays.instanceMatrix.version, turn = rays.rotation.y;
  for (let i = 0; i < 20; i++) aero.update(race, 1 / 60, new Vector3(), settings, false);
  assert.equal(rays.instanceMatrix.version, version, 'ray matrices are written on skin change only');
  assert.notEqual(rays.rotation.y, turn, 'the magenta vortex swirls its rays around the car');
});

test('the launch flare keeps playing through the whole 3-2-1 countdown, then bursts at GO', () => {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  car.add(car.userData.body); scene.add(car);
  const aero = createAeroVFX(scene, car), race = createRace(), settings = vfxSettings({ enabled: true, quality: 'high' });
  aero.setSkins({ 'launch-flare': 'launch-flare-gold' });
  const pool = scene.getObjectByName('Launch flare burst');
  race.phase = 'countdown';
  let dark = 0;
  for (let i = 0; i < 3 * 60; i++) { aero.update(race, 1 / 60, new Vector3(), settings, false); if (!pool.visible) dark++; }
  assert.equal(dark, 0, `flare dark for ${dark} countdown frames`);
  race.phase = 'racing'; aero.update(race, 1 / 60, new Vector3(), settings, false);
  assert.equal(pool.visible, true, 'GO fires the launch burst');
  for (let i = 0; i < 3 * 60; i++) aero.update(race, 1 / 60, new Vector3(), settings, false);
  assert.equal(pool.visible, false, 'the flare ends once the race is under way');
  race.phase = 'countdown'; aero.setSkins({});
  aero.update(race, 1 / 60, new Vector3(), settings, false);
  assert.equal(pool.visible, false, 'no launch flare skin, no countdown flare');
});

test('flares other than the shock ring are slim shooting streaks with rising sparks and a ground ripple, not solid spikes', () => {
  for (const [id, style] of Object.entries(LAUNCH_FLARE_STYLES)) {
    const { scene, rays, pool } = launched(id);
    const sparks = scene.getObjectByName('Launch flare sparks');
    assert.ok(sparks?.isPoints, 'a spark cloud rides with every flare');
    if (style.shape === 'ring') { assert.equal(sparks.visible, false, 'the shock ring stays as it is'); continue; }
    assert.ok(sparks.visible && sparks.geometry.drawRange.count >= 48, `${id} throws its sparks`);
    for (let i = 0; i < rays.count; i++) {
      assert.ok(column(matrixOf(rays, i), 0).length() <= 0.05, `${id} ray ${i} is a slim streak`);
    }
  }
  const { scene, rays, pool } = launched('launch-flare-gold');
  const sparks = scene.getObjectByName('Launch flare sparks');
  assert.match(rays.material.fragmentShader, /head/, 'a bright head shoots up each streak');
  assert.match(sparks.material.vertexShader, /age/, 'sparks rise as the flare ages, on the GPU');
  assert.match(pool.material.fragmentShader, /ripple/, 'a ripple runs out across the road');
  const low = launched('launch-flare-gold', vfxSettings({ enabled: true, quality: 'low' }));
  const lowSparks = low.scene.getObjectByName('Launch flare sparks');
  assert.ok(lowSparks.visible && lowSparks.geometry.drawRange.count < sparks.geometry.drawRange.count, 'Low throws fewer sparks');
  const version = sparks.geometry.attributes.position.version;
  for (let i = 0; i < 10; i++) launchedAero(scene).update(Object.assign(createRace(), { phase: 'racing' }), 1 / 60, new Vector3(), vfxSettings({ enabled: true }), false);
  assert.equal(sparks.geometry.attributes.position.version, version, 'no per-frame spark uploads');
  for (const off of [launched('launch-flare-gold', vfxSettings({ enabled: false })), launched('launch-flare-gold', vfxSettings({ enabled: true }), true)]) {
    assert.equal(off.scene.getObjectByName('Launch flare sparks').visible, false, 'VFX Off and Reduced Motion throw no sparks');
  }
});
