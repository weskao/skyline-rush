// Mini-boost start cue: the energy can's old pair of stretched rear streaks, played once per mini-boost.
// Rule: .claude/rules/mini-boost-streaks.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRace, startRace, stepRace, RING_RADIUS, RACE_TRACKS } from '../src/game.js';
import { createMiniBoostCue, stepMiniBoostCue, MINI_BOOST_STREAK_LIFE } from '../src/mini-boost-cue.ts';
import { createMiniBoostStreaks } from '../src/mini-boost-streaks.js';
import { createEffects } from '../src/effects.js';
import { blue, orange, purple } from '../src/effects-palette.ts';

const DT = 1 / 60;
const advance = (race, seconds, input = {}) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) stepRace(race, input, DT); };
function racing(trackId = 'coast') {
  const race = createRace(trackId);
  startRace(race);
  advance(race, 3.1);
  Object.assign(race, { traffic: [], rivals: [], pickups: [], rings: [] });
  return race;
}

test('every mini-boost source records one miniBoostEvent: drift with the tier that paid, the rest neutral', () => {
  assert.equal(createRace().player.miniBoostEvent, null);
  const drift = racing();
  Object.assign(drift.player, { speed: 80, x: 0 });
  advance(drift, 2.1, { brake: true, steer: 0.1 });
  stepRace(drift, {}, DT);
  assert.deepEqual(drift.player.miniBoostEvent, { time: drift.elapsed, tier: 3 }, 'a 2 s drift pays tier 3');
  const short = racing();
  Object.assign(short.player, { speed: 80, x: 0 });
  advance(short, 0.7, { brake: true, steer: 0.1 });
  stepRace(short, {}, DT);
  assert.equal(short.player.miniBoostEvent.tier, 1, 'a 0.6 s drift pays tier 1');

  const ring = racing();
  ring.rings = [{ distance: 100, x: 0, altitude: 0, radius: RING_RADIUS, type: 'slipstream', group: 0 }];
  Object.assign(ring.player, { distance: 99.7, x: 0, speed: 40 });
  advance(ring, 0.1);
  assert.equal(ring.player.miniBoostEvent?.tier, 0, 'slipstream ring');

  const t = RACE_TRACKS.taipei.sections.find(s => s.type === 'boost-tunnel');
  const tunnel = racing('taipei');
  Object.assign(tunnel.player, { distance: t.from + 5, speed: 52, altitude: 0, miniBoost: 0 });
  stepRace(tunnel, { throttle: true }, DT);
  assert.deepEqual(tunnel.player.miniBoostEvent, { time: tunnel.elapsed, tier: 0 }, 'boost tunnel');

  const air = racing();
  air.player.speed = 60;
  advance(air, 4, { throttle: true, fly: true, boost: true, laneAssist: false });
  for (let i = 0; i < 600 && !air.player.landing; i++) stepRace(air, { throttle: true, laneAssist: false }, DT);
  assert.equal(air.player.landing?.chain, true);
  assert.deepEqual(air.player.miniBoostEvent, { time: air.player.landing.time, tier: 0 }, 'chain landing');
});

test('the cue plays once per mini-boost: chained refreshes never restart a running play', () => {
  const cue = createMiniBoostCue(), car = { miniBoost: 0, miniBoostEvent: null, braking: false };
  const fire = (seconds, tier = 0) => { car.miniBoost = Math.max(car.miniBoost, seconds); car.miniBoostEvent = { time: 0, tier }; };
  const step = (dt = DT, armed = true) => { const started = stepMiniBoostCue(cue, car, dt, armed); car.miniBoost = Math.max(0, car.miniBoost - dt); return started; };
  assert.equal(MINI_BOOST_STREAK_LIFE, 0.8);
  assert.equal(step(), false, 'nothing without a source');
  fire(3);
  assert.equal(step(), true, '0 → above 0 starts a play');
  assert.equal(step(), false);
  for (let i = 0; i < 20; i++) step();
  fire(3);
  assert.equal(step(), false, 'a chained slipstream ring mid-play does not restart it');
  for (let i = 0; i < 40; i++) step();
  assert.ok(cue.age >= MINI_BOOST_STREAK_LIFE && car.miniBoost > 0);
  fire(1.1, 2);
  assert.equal(step(), true, 'a source after the play finished plays again, even with the boost still running');
  assert.equal(cue.tier, 2);
  for (let i = 0; i < 300; i++) step();
  car.braking = true; fire(1.2);
  assert.equal(step(), false, 'no play while braking');
  car.braking = false; car.miniBoost = 0; fire(1.2);
  assert.equal(step(DT, false), false, 'no play before the race runs');
});

function stage(options = {}) {
  const scene = new THREE.Scene(), pose = new THREE.Object3D(), camera = new THREE.PerspectiveCamera();
  scene.add(pose);
  camera.position.set(0, 3, 9);
  const streaks = createMiniBoostStreaks(scene, [blue, orange, purple]);
  const car = { miniBoost: 0, miniBoostEvent: null, braking: false };
  const frame = { active: true, enabled: true, quality: 'high', reducedMotion: false, ...options };
  const mesh = scene.getObjectByName('Mini boost streaks');
  const fire = tier => { car.miniBoost = Math.max(car.miniBoost, 1.5); car.miniBoostEvent = { time: 0, tier }; };
  const tick = (dt = .1) => streaks.update(car, pose, camera, dt, frame);
  return { scene, streaks, car, mesh, fire, tick };
}

test('the streaks start behind the rear wheels and stretch back in the car frame up to ~8.6 m', () => {
  const { mesh, fire, tick, streaks } = stage();
  assert.ok(mesh, 'the mesh exists before the first play, so shader warmup sees it');
  assert.equal(mesh.visible, false);
  fire(0);
  tick(.05);
  assert.ok(mesh.visible);
  tick(.6);
  const p = mesh.geometry.attributes.position.array, count = mesh.geometry.drawRange.count;
  const used = Array.from(p); // all eight ribbons are drawn on High
  const z = used.filter((_, i) => i % 3 === 2), y = used.filter((_, i) => i % 3 === 1);
  assert.equal(count, 8 * 32 * 6, 'High draws the can\'s eight ribbons');
  assert.ok(Math.min(...z) > 2, 'they start at the tail (+z)');
  assert.ok(Math.max(...z) > 7 && Math.max(...z) < 2.33 + 8.7, `reach ${Math.max(...z)}`);
  assert.ok(Math.min(...y) > .1 && Math.min(...y) < .6, 'rooted near the rear wheels (y ≈ 0.4)');
  tick(.2);
  assert.equal(mesh.visible, false, 'one 0.8 s play');
  streaks.dispose();
});

test('drift streaks take the tier colour; the other sources use one whitish cyan, never orange', () => {
  const { mesh, fire, tick } = stage();
  const tint = () => mesh.material.uniforms.tint.value.clone();
  fire(3); tick(.05);
  const drift = tint();
  assert.ok(drift.b > drift.g && drift.r > drift.g, 'tier 3 is purple');
  tick(1); fire(0); tick(.05);
  const neutral = tint();
  assert.ok(neutral.b >= neutral.g && neutral.g > neutral.r && neutral.r > .3, 'whitish cyan');
  const crash = new THREE.Color().setRGB(...orange);
  assert.ok(neutral.r < neutral.b && !neutral.equals(crash), 'not the crash orange');
});

test('quality and comfort: Medium 4 ribbons, Low and Reduced Motion none, hidden when effects are off', () => {
  const medium = stage({ quality: 'medium' });
  medium.fire(0); medium.tick(.2);
  assert.equal(medium.mesh.geometry.drawRange.count, 4 * 32 * 6);
  for (const options of [{ quality: 'low' }, { reducedMotion: true }, { enabled: false }]) {
    const s = stage(options);
    s.fire(0); s.tick(.2);
    assert.equal(s.mesh.visible, false, JSON.stringify(options));
  }
});

test('effects wires the cue to the player: a mini-boost source shows the streaks during the race', () => {
  globalThis.devicePixelRatio = 1;
  const scene = new THREE.Scene(), pose = new THREE.Object3D(), camera = new THREE.PerspectiveCamera();
  scene.add(pose);
  camera.position.set(0, 3, 9);
  const effects = createEffects(scene, () => 0, { camera });
  const race = createRace('coast');
  race.phase = 'racing'; race.rings = []; race.pickups = [];
  const tick = () => effects.update(race, .05, 0, false, false, [pose]);
  const mesh = scene.getObjectByName('Mini boost streaks');
  tick();
  assert.equal(mesh.visible, false);
  Object.assign(race.player, { miniBoost: 1.2, miniBoostEvent: { time: 0, tier: 0 } });
  tick();
  assert.equal(mesh.visible, true);
  effects.dispose();
});
