import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3 } from 'three';
import { createRace } from '../src/game.js';
import { createAeroVFX, dashSamples } from '../src/aero-vfx.js';
import { trackPoint } from '../src/track-paths.ts';
import { vfxSettings } from '../src/vfx-settings.ts';

function fixture() {
  const scene = new Scene(), vehicle = new Group();
  vehicle.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(vehicle);
  const vfx = createAeroVFX(scene, vehicle), race = createRace();
  race.phase = 'racing'; race.player.boosting = true; race.player.speed = 80;
  const options = vfxSettings({ airflow: true });
  const origin = new Vector3();
  const update = (dt = 0.05, center = 0, distance = 0, y = 0) => vfx.update(race, dt, origin.set(center, y, -distance), options, false);
  const vapor = scene.getObjectByName('World space gas wake');
  return { scene, vehicle, vfx, race, options, update, vapor };
}

test('visual settings clamp untrusted persisted values and preserve explicit zeroes', () => {
  const settings = vfxSettings({ afterimages: 99, fov: -4, vaporDensity: NaN, shake: 0, quality: 'ultra', preset: '__proto__' });
  assert.equal(settings.afterimages, 8);
  assert.equal(settings.fov, 0);
  assert.equal(settings.shake, 0);
  assert.equal(settings.vaporDensity, 0.65);
  assert.equal(settings.quality, 'high');
  assert.equal(settings.preset, 'cinematic');
  assert.equal(vfxSettings(null).enabled, true);
});

test('dash sampling covers a short fast displacement and bounds teleport work', () => {
  const from = new Vector3(), to = new Vector3(0, 0, -18), samples = [];
  dashSamples(from, to, 1, 32, t => samples.push(t * 18));
  assert.equal(samples.at(-1), 18);
  assert.ok(samples.every((s, i) => s - (samples[i - 1] || 0) <= 1.001));
  samples.length = 0;
  dashSamples(from, new Vector3(0, 0, -10000), 1, 32, t => samples.push(t * 10000));
  assert.equal(samples.length, 32);
  assert.ok(samples[0] >= 9940);
  assert.equal(samples.at(-1), 10000);
});

test('VFX is read-only to race state, follows rotated anchors and rebases historical vapor', () => {
  const { vehicle, race, update, vapor } = fixture();
  vehicle.rotation.y = Math.PI / 2;
  const before = structuredClone(race);
  update();
  assert.deepEqual(race, before);
  const { alpha, position } = vapor.geometry.attributes;
  const alive = [...alpha.array].flatMap((a, i) => a > 0 ? [i] : []);
  assert.ok(alive.length >= 4);
  for (const i of alive) assert.ok(position.array[i * 3] > 2.39, 'rearward gas rotates into +X');
  const snapshot = position.array.slice();
  vehicle.position.x -= 10;
  update(0, 10, 20);
  for (const i of alive) {
    assert.ok(Math.abs(position.array[i * 3] - snapshot[i * 3] + 10) < 0.0001);
    assert.ok(Math.abs(position.array[i * 3 + 2] - snapshot[i * 3 + 2] - 20) < 0.0001);
  }
});

test('repeated boost cycles stay bounded, release fades and restart clears every transient', () => {
  const { scene, vfx, race, update, vapor } = fixture();
  const count = scene.children.length;
  const array = vapor.geometry.attributes.position.array;
  for (let i = 0; i < 600; i++) { race.player.boosting = i % 20 < 10; update(); }
  assert.equal(scene.children.length, count);
  assert.equal(vapor.geometry.attributes.position.array, array);
  assert.ok([...array].every(Number.isFinite));
  race.player.boosting = false;
  for (let i = 0; i < 100; i++) update();
  assert.ok(vapor.geometry.attributes.alpha.array.every(a => a === 0));
  race.player.boosting = true; update();
  assert.ok(vapor.geometry.attributes.alpha.array.some(a => a > 0));
  vfx.reset();
  assert.ok(vapor.geometry.attributes.alpha.array.every(a => a === 0));
  assert.ok(scene.children.filter(child => child.isLineSegments).every(child => !child.visible));
});

test('NITRO and drift rewards ignite the existing exhaust without a held BOOST input', () => {
  for (const reserve of ['nitroTime', 'miniBoost']) {
    const { race, update, vapor, vfx } = fixture();
    race.player.boosting = false;
    race.player[reserve] = 1;
    const feedback = update();
    assert.ok(feedback.strength > 0.8, `${reserve} ignites boost feedback`);
    assert.ok(vapor.geometry.attributes.alpha.array.some(alpha => alpha > 0), `${reserve} emits exhaust`);
    race.player[reserve] = 0;
    for (let i = 0; i < 100; i++) update();
    assert.ok(vapor.geometry.attributes.alpha.array.every(alpha => alpha === 0));
    vfx.reset();
    race.phase = 'paused';
    race.player[reserve] = 1;
    assert.equal(update().strength, 0, 'paused rewards cannot ignite exhaust');
  }
});

test('collision discontinuity never interpolates exhaust through the rejected path', () => {
  const { vehicle, race, update, vapor, vfx } = fixture();
  update(); vfx.reset(); update(0);
  vehicle.position.z = -40;
  race.player.impact = { time: 1 };
  update();
  const { alpha, position } = vapor.geometry.attributes;
  assert.ok(alpha.array.some(a => a > 0));
  for (let i = 0; i < alpha.array.length; i++) if (alpha.array[i] > 0) assert.ok(position.array[i * 3 + 2] < -30);
});

function rollingTrace(speed = 80, omega = 5, quality = 'high') {
  const f = fixture();
  f.race.player.boosting = false; f.race.player.speed = speed;
  f.race.player.altitude = f.vehicle.position.y = 6;
  f.race.player.trick = { dir: Math.sign(omega), time: .3, done: false };
  f.options.airflow = false; f.options.quality = quality;
  f.update(0);
  f.vehicle.position.z = -speed * .1; f.vehicle.rotation.z = omega * .1;
  f.update(.1);
  f.ribbon = f.scene.getObjectByName('Continuous dash ribbon');
  return f;
}
const live = geometry => [...geometry.attributes.alpha.array].flatMap((a, i) => a > 0 ? [i] : []);
const point = (geometry, i) => new Vector3().fromBufferAttribute(geometry.attributes.position, i);
const angle = a => Math.atan2(Math.sin(a), Math.cos(a));

test('roll markers stay in still air while the rotating car sees opposite angular motion', () => {
  for (const dir of [-1, 1]) {
    const f = rollingTrace(80, dir * 5), g = f.vapor.geometry, indices = live(g);
    assert.ok(indices.length > 0);
    const old = indices.map(i => point(g, i));
    const local = old.map(p => p.clone().sub(f.vehicle.position).applyQuaternion(f.vehicle.quaternion.clone().invert()));
    f.options.vaporDensity = 0; f.vehicle.position.z -= 4; f.vehicle.rotation.z += dir * .2; f.update(.05);
    indices.forEach((i, j) => {
      assert.ok(point(g, i).distanceTo(old[j]) < .0001, 'ambient marker has no artificial exhaust velocity');
      const q = point(g, i).sub(f.vehicle.position).applyQuaternion(f.vehicle.quaternion.clone().invert());
      assert.ok(Math.abs(q.z - local[j].z - 4) < .0001);
      assert.ok(Math.abs(angle(Math.atan2(q.y, q.x) - Math.atan2(local[j].y, local[j].x)) + dir * .2) < .0001);
    });
  }
});

test('both wake sides use dphi/dz = -omega/U and twice the speed gives twice the pitch', () => {
  const pitches = [];
  for (const speed of [40, 80]) for (const omega of [-5, 5]) {
    const f = rollingTrace(speed, omega), g = f.vapor.geometry;
    for (const port of [0, 3]) {
      const indices = live(g).filter(i => i % 4 === port);
      assert.ok(indices.length > 1);
      const a = point(g, indices[0]).sub(f.vehicle.position), b = point(g, indices.at(-1)).sub(f.vehicle.position);
      const slope = angle(Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)) / (b.z - a.z);
      assert.ok(Math.abs(slope + omega / speed) < .0001, `${speed}/${omega}/${port}: ${slope}`);
      if (omega === 5 && port === 0) pitches.push(2 * Math.PI / Math.abs(slope));
    }
  }
  assert.ok(Math.abs(pitches[1] / pitches[0] - 2) < .0001);
});

test('real roll uses world-space streak edges without enabling attached airflow or BOOST jets', () => {
  const f = rollingTrace();
  assert.ok(live(f.ribbon.geometry).length > 0);
  assert.ok(f.ribbon.geometry.attributes.rollWake.array.some(x => x === 1));
  assert.equal(f.ribbon.parent, f.scene);
  const local = f.scene.getObjectByName('Airflow showcase');
  assert.equal(local.children.find(x => x.geometry?.attributes.flowType).visible, false);
  assert.ok(local.children.filter(x => x.name.startsWith('Cold gas')).every(x => !x.visible));
  assert.equal(f.race.player.boosting, false);
});

test('Low disables roll trails and Medium/High increase sampling without new geometry', () => {
  const counts = ['low', 'medium', 'high'].map(quality => {
    const f = rollingTrace(80, 5, quality), count = live(f.ribbon.geometry).length;
    f.vfx.reset();
    assert.equal(live(f.vapor.geometry).length, 0); assert.equal(live(f.ribbon.geometry).length, 0);
    return count;
  });
  assert.equal(counts[0], 0); assert.ok(counts[1] > 0); assert.ok(counts[2] > counts[1]);
});

test('roll history pauses, fades after trick completion or cancellation, and never mutates race', () => {
  for (const trick of [null, { dir: 1, time: .8, done: true }]) {
    const f = rollingTrace(), before = structuredClone(f.race);
    f.update(0); assert.deepEqual(f.race, before);
    const alpha = f.ribbon.geometry.attributes.alpha.array.slice();
    f.race.phase = 'paused'; f.update(0); assert.deepEqual(f.ribbon.geometry.attributes.alpha.array, alpha);
    f.race.phase = 'racing'; f.race.player.trick = trick; f.update();
    assert.ok(live(f.ribbon.geometry).length > 0);
    for (let i = 0; i < 60; i++) f.update();
    assert.equal(live(f.ribbon.geometry).length, 0); assert.equal(live(f.vapor.geometry).length, 0);
  }
});

test('disabling roll settings immediately clears emitted roll history', () => {
  for (const [key, value] of [['enabled', false], ['quality', 'low'], ['airflowDensity', 0], ['airflowOpacity', 0], ['comfortable', true], ['reducedMotion', true]]) {
    const f = rollingTrace(); assert.ok(live(f.vapor.geometry).length > 0);
    if (key !== 'reducedMotion') f.options[key] = value;
    f.vfx.update(f.race, .05, new Vector3(), f.options, key === 'reducedMotion');
    assert.equal(live(f.ribbon.geometry).length, 0, key); assert.equal(live(f.vapor.geometry).length, 0, key);
  }
});

test('historical wake survives full XYZ floating-origin shifts on elevated and curved tracks', () => {
  for (const [track, distance] of [['coast', 200], ['neon', 200], ['canyon', 200], ['aurora', 200], ['spiral', 1300], ['taipei', 200], ['tokyo', 200], ['alpine', 2008], ['coastal', 200], ['cosmic', 200], ['harbor-circuit', 200]]) {
    const f = fixture(), a = trackPoint(track, distance), b = trackPoint(track, distance + 8);
    f.vehicle.position.y = 6; f.update();
    f.options.vaporDensity = 0; f.update(.05, a.x, -a.z, a.y);
    const g = f.vapor.geometry, indices = live(g), before = indices.map(i => point(g, i).add(a));
    assert.ok(indices.length > 0, track);
    f.vehicle.position.add(a).sub(b); f.update(0, b.x, -b.z, b.y);
    indices.forEach((i, j) => assert.ok(point(g, i).add(b).distanceTo(before[j]) < .0002, track));
  }
});
