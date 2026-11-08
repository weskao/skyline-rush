import test from 'node:test';
import assert from 'node:assert/strict';
import { isRaining, plumeLook, racePreset, sprayRate } from '../src/board-effects.ts';
import { readFileSync } from 'node:fs';
import { BoxGeometry, Group, Mesh, Scene, Vector3 } from 'three';
import { createSprintVfx, vfxSettings } from '../src/vfx-settings.ts';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';
import { createAeroVFX } from '../src/aero-vfx.js';
import { setLook3d } from '../src/look-gate.ts';

setLook3d(true); // the Phase 3 look (`?look=3d`); tests/look-gate.test.js covers the develop look without it

test('race weather preset: custom/free races show the chosen preset, every other mode the track default', () => {
  const session = { presentation: { visualPreset: 'rain' } };
  assert.equal(racePreset({ mode: 'free', session }), 'rain');
  assert.equal(racePreset({ mode: 'custom', session }), 'rain');
  assert.equal(racePreset({ mode: 'free', session: null }), 'track');
  assert.equal(racePreset({ mode: 'championship', session }), 'track');
  assert.equal(isRaining('rain', 'coast'), true);
  assert.equal(isRaining('track', 'neon'), true, 'Neon rains by default');
  assert.equal(isRaining('track', 'coast'), false);
  assert.equal(isRaining('day', 'neon'), false);
});

test('boost plume (board panel 2): Medium+ fades to a magenta tail and stretches; Low keeps the current plume', () => {
  assert.deepEqual(plumeLook('low'), { tail: 0, stretch: 1 });
  for (const quality of ['medium', 'high']) {
    const look = plumeLook(quality);
    assert.equal(look.tail, 1);
    assert.ok(look.stretch > 1.2 && look.stretch <= 1.5, `${quality}: about a third longer`);
  }
});

test('rain wheel spray: none on Low, more on High, grows with speed and stops at a standstill', () => {
  assert.equal(sprayRate('low', 90), 0);
  assert.equal(sprayRate('high', 0), 0);
  assert.ok(sprayRate('medium', 90) > 0);
  assert.ok(sprayRate('high', 90) > sprayRate('medium', 90));
  assert.ok(sprayRate('high', 30) < sprayRate('high', 90));
  assert.equal(sprayRate('high', 200), sprayRate('high', 90), 'capped: the shared particle pool stays bounded');
  assert.ok(sprayRate('high', 200) <= 60);
});

test('Ultra only: the sprint motion blur is stronger; High and below are unchanged', () => {
  const input = { phase: 'racing', nitro: true, boost: false, speed: 110, cap: 110, dt: 0.3, enabled: true, quality: 'high', reducedMotion: false };
  const sustained = frame => { const vfx = createSprintVfx(); for (let i = 0; i < 3; i++) vfx.update(frame); return vfx.update(frame).blur; }; // dt clamps to 0.1 s: past the 0.18 s ignition
  const high = sustained(input), ultra = sustained({ ...input, ultra: true });
  assert.ok(Math.abs(high - 0.6) < 1e-9, `High blur ${high}`);
  assert.ok(ultra > high * 1.4 && ultra <= 1, `Ultra blur ${ultra}`);
  assert.equal(sustained({ ...input, ultra: true, reducedMotion: true }), 0, 'Reduced Motion still wins');
});

const liveSpray = (quality, preset) => {
  const scene = new Scene(), effects = createEffects(scene, () => 0), race = createRace('coast');
  Object.assign(race, { phase: 'racing', rivals: [], traffic: [], rings: [], pickups: [], mode: 'free' });
  race.session = { ...race.session, presentation: { visualPreset: preset } };
  race.player.speed = 90;
  for (let i = 0; i < 30; i++) effects.update(race, 1 / 60, 0, false, false, null, { quality, enabled: true });
  const alpha = scene.children.find(o => o.isPoints).geometry.getAttribute('alpha').array;
  effects.dispose();
  return alpha.filter(a => a > 0).length;
};

test('rain spray in the race: pooled particles behind the car on Medium+ in rain, none on Low or a dry road', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  assert.ok(liveSpray('high', 'rain') > liveSpray('medium', 'rain'));
  assert.ok(liveSpray('medium', 'rain') > liveSpray('medium', 'day'));
  assert.equal(liveSpray('low', 'rain'), liveSpray('low', 'day'), 'Low fallback: no spray');
});

test('boost plume in the race: Medium+ jets carry the magenta tail and a longer plume; Low keeps the current one', () => {
  const jet = quality => {
    const scene = new Scene(), vehicle = new Group(), race = createRace();
    vehicle.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
    scene.add(vehicle);
    const vfx = createAeroVFX(scene, vehicle), options = { ...vfxSettings({ airflow: true }), quality };
    race.phase = 'racing'; race.player.boosting = true; race.player.speed = 80;
    for (let i = 0; i < 10; i++) vfx.update(race, 0.05, new Vector3(), options, false);
    const nozzle = scene.getObjectByName('Cold gas nozzle 1');
    return { tail: nozzle.material.uniforms.tail?.value, length: nozzle.scale.z };
  };
  const low = jet('low'), high = jet('high');
  assert.equal(low.tail, 0);
  assert.equal(high.tail, 1);
  assert.ok(Math.abs(high.length / low.length - plumeLook('high').stretch) < 1e-9, 'stretched by the board factor');
});

test('world.js reads the race weather and the Ultra blur through the shared helpers', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /race\.mode === 'custom' \|\| race\.mode === 'free' \? race\.session/, 'one home for the preset rule: racePreset');
  assert.match(world, /racePreset\(race\)/);
  assert.match(world, /isRaining\(visualPreset, trackId\)/);
  assert.match(world, /Object\.assign\(sprintInput, \{[^}]*ultra: visual\.ultra/, 'the sprint blur sees the Ultra flag');
});
