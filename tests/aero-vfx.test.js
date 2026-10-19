import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3 } from 'three';
import { createRace } from '../src/game.js';
import { createAeroVFX, dashSamples } from '../src/aero-vfx.js';
import { vfxSettings } from '../src/vfx-settings.js';

function fixture() {
  const scene = new Scene(), vehicle = new Group();
  vehicle.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(vehicle);
  const vfx = createAeroVFX(scene, vehicle), race = createRace();
  race.phase = 'racing'; race.player.boosting = true; race.player.speed = 80;
  const options = vfxSettings({ airflow: true });
  const update = (dt = 0.05, center = 0, distance = 0) => vfx.update(race, dt, center, distance, options, false);
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
