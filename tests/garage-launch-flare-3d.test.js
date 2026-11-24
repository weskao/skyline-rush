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

test('every equipped launch flare plays exactly two countdown waves, then ends naturally', () => {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  car.add(car.userData.body); scene.add(car);
  const aero = createAeroVFX(scene, car), race = createRace(), settings = vfxSettings({ enabled: true, quality: 'high' });
  const pool = scene.getObjectByName('Launch flare burst'), u = pool.material.uniforms;
  const rays = scene.getObjectByName('Launch flare rays'), rings = scene.getObjectByName('Launch flare rings');
  const glow = scene.getObjectByName('Launch flare body glow'), origin = new Vector3();
  const update = (dt = 1 / 60) => aero.update(race, dt, origin, settings, false);
  for (const [id, style] of Object.entries(LAUNCH_FLARE_STYLES)) {
    aero.reset(); aero.setSkins({ 'launch-flare': id });
    race.phase = 'ready'; race.countdown = 3; update();
    assert.equal(pool.visible, false, `${id}: no flare on Home`);
    race.phase = 'countdown'; update();
    assert.ok(pool.visible && glow.visible, `${id}: animated flare is visible on entering the race`);
    assert.equal(style.shape === 'ring' ? rings.visible : rays.visible, true);
    assert.equal(u.charging.value, 0, 'no static countdown-only pool');
    const firstAge = u.age.value;
    assert.ok(firstAge >= 0 && firstAge < 1);
    race.countdown = 2.7; update(.1);
    const pausedAge = u.age.value;
    assert.ok(pausedAge > firstAge, 'animation advances with the countdown');
    race.phase = 'paused'; update(0);
    assert.equal(u.age.value, pausedAge, 'pausing freezes the burst');
    race.phase = 'countdown'; race.countdown = 2.6; update();
    assert.ok(u.age.value > pausedAge, 'resume continues rather than restarting');
    let waves = 1, previousAge = u.age.value;
    for (let i = 1; i <= 143; i++) {
      race.countdown = 2.6 - i / 60; update();
      assert.ok(pool.visible && glow.visible, `${id}: animation continues at ${race.countdown}s remaining`);
      assert.equal(u.charging.value, 0, 'each wave is animated');
      if (u.age.value < previousAge) waves++;
      previousAge = u.age.value;
    }
    assert.equal(waves, 2, 'exactly two waves play without changing cadence');
    race.countdown = .19; update(.05);
    assert.equal(pool.visible || glow.visible, false, 'the second wave finishes naturally before GO');
    race.countdown = .1; update(.05);
    assert.equal(pool.visible, false, 'no third wave during countdown');
    race.countdown = 0; race.phase = 'racing'; update();
    assert.equal(pool.visible || glow.visible, false, 'GO does not start another wave');
    for (let i = 0; i < 60; i++) update();
    assert.equal(pool.visible, false, 'no new wave begins during racing');
    aero.reset();
    race.phase = 'countdown'; race.countdown = 3; update();
    assert.ok(pool.visible && glow.visible, 'a new race or restart plays its own burst');
  }
  aero.reset(); aero.setSkins({});
  race.phase = 'countdown'; update();
  assert.equal(pool.visible, false, 'no launch flare skin, no countdown flare');
});

test('both countdown waves match the reference branch 1.4 second motion and intensity', () => {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  car.add(car.userData.body); scene.add(car);
  const aero = createAeroVFX(scene, car), race = createRace(), origin = new Vector3();
  const settings = vfxSettings({ enabled: true, quality: 'high' });
  aero.setSkins({ 'launch-flare': 'launch-flare-gold' });
  race.phase = 'countdown';
  const pool = scene.getObjectByName('Launch flare burst'), u = pool.material.uniforms;
  const at = remaining => { race.countdown = remaining; aero.update(race, .05, origin, settings, false); };
  at(3); const power = u.power.value;
  for (const remaining of [2.3, .9]) {
    at(remaining);
    assert.ok(Math.abs(u.age.value - .5) < 1e-6, 'each reference wave reaches half age after .7 s');
    assert.equal(u.power.value, power, 'ordinary waves retain their original intensity');
  }
  at(.21);
  assert.ok(u.age.value > .99, 'the second wave is still finishing');
  at(.19);
  assert.equal(pool.visible, false, 'two full 1.4 s waves end at 2.8 s');
  at(.1);
  assert.equal(pool.visible, false, 'no third wave');
  at(.01);
  assert.equal(pool.visible, false, 'no extra flash before GO');
});

test('a skipped final countdown frame cannot start a third wave at GO', () => {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  car.add(car.userData.body); scene.add(car);
  const aero = createAeroVFX(scene, car), race = createRace(), origin = new Vector3();
  const settings = vfxSettings({ enabled: true, quality: 'high' });
  aero.setSkins({ 'launch-flare': 'launch-flare-gold' });
  race.phase = 'countdown'; race.countdown = .45; aero.update(race, .05, origin, settings, false);
  const pool = scene.getObjectByName('Launch flare burst');
  assert.ok(pool.visible);
  race.phase = 'racing'; race.countdown = 0; aero.update(race, .05, origin, settings, false);
  assert.equal(pool.visible, false, 'a skipped frame cannot resurrect the finished second wave');
  for (let i = 0; i < 20; i++) aero.update(race, .1, origin, settings, false);
  assert.equal(pool.visible, false, 'no new wave begins during racing');
});

test('direct race entry without a countdown still fires the equipped flare once', () => {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  car.add(car.userData.body); scene.add(car);
  const aero = createAeroVFX(scene, car), race = createRace(), origin = new Vector3();
  const settings = vfxSettings({ enabled: true, quality: 'high' });
  aero.setSkins({ 'launch-flare': 'launch-flare-gold' });
  race.phase = 'racing'; aero.update(race, .05, origin, settings, false);
  const pool = scene.getObjectByName('Launch flare burst');
  assert.ok(pool.visible);
  assert.ok(Math.abs(pool.material.uniforms.age.value - .05 / 1.1) < 1e-6, 'direct launch uses the reference 1.1 s burst');
  for (let i = 0; i < 10; i++) aero.update(race, .1, origin, settings, false);
  assert.ok(pool.visible, 'direct launch is still animating after 1.05 s');
  aero.update(race, .1, origin, settings, false);
  assert.equal(pool.visible, false);
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

test('flare spark samples scale across all four tiers and respect Comfort', () => {
  for (const [quality, count, detail] of [
    ['low', 24, 0], ['medium', 48, 0], ['high', 72, 0.55], ['ultra', 96, 1],
  ]) {
    const settings = vfxSettings({ quality });
    const { scene } = launched('launch-flare-gold', settings);
    const sparks = scene.getObjectByName('Launch flare sparks');
    assert.equal(sparks.geometry.drawRange.count, count);
    assert.equal(sparks.material.uniforms.sparkDetail.value, detail);
    assert.ok(sparks.visible && sparks.material.depthTest);
  }
  const { scene } = launched('launch-flare-gold', vfxSettings({ quality: 'ultra', comfortable: true }));
  assert.equal(scene.getObjectByName('Launch flare sparks').visible, false);
});
