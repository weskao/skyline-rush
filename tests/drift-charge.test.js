import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CHARGE_LOOKS, chargeFit, chargeFrame, chargeFired } from '../src/drift-charge.ts';
import { createDriftCharge } from '../src/drift-charge-vfx.js';
import { makeCar, CAR_STYLES } from '../src/car-model.js';
import { createEffects } from '../src/effects.js';
import { createRace } from '../src/game.js';

const COLORS = [[0.15, 0.8, 2.5], [2.5, 0.85, 0.15], [1.2, 0.3, 2.5]]; // the drift sparks' tier colours (effects.js)

test('a tier fires once, the frame the drift reaches it, and a big step fires the highest tier reached', () => {
  assert.equal(chargeFired(0, 0.59), 0);
  assert.equal(chargeFired(0, 0.6), 1);
  assert.equal(chargeFired(1, 1.19), 0);
  assert.equal(chargeFired(1, 1.2), 2);
  assert.equal(chargeFired(2, 2), 3);
  assert.equal(chargeFired(3, 9), 0);
  assert.equal(chargeFired(0, 2.1), 3);
});

test('each tier has its own look: one sweep, two sweeps, then flash + shockwave + dip-and-rebound', () => {
  const out = {};
  const sample = (tier, from, to, read) => Array.from({ length: 200 }, (_, i) => read(chargeFrame(tier, from + (to - from) * i / 199, out)));
  for (const tier of [1, 2, 3]) {
    const sweeps = [0, 1].map(k => sample(tier, 0, CHARGE_LOOKS[tier].duration, f => f.fronts[k]).some(u => u > 0 && u < 1));
    assert.deepEqual(sweeps, [true, tier > 1], `tier ${tier} sweeps`);
    assert.equal(sample(tier, 0, 1, f => f.ring).some(r => r > 0), tier === 3, `tier ${tier} ring`);
    assert.equal(sample(tier, 0, 1, f => f.flash).some(v => v > 0), tier === 3, `tier ${tier} flash`);
  }
  const glowTime = tier => sample(tier, 0, 1, f => f.glow).filter(g => g > 0.5).length / 200;
  assert.ok(glowTime(2) >= 0.35 && glowTime(2) > glowTime(1), `tier 2 outline glows ~0.4 s (${glowTime(2)})`);
  const bounce1 = sample(1, 0, 1, f => f.bounce), bounce3 = sample(3, 0, 1, f => f.bounce);
  assert.ok(Math.min(...bounce1) >= 0 && Math.max(...bounce1) > 0, 'tier 1: a small hop, never below rest');
  const firstMove = bounce3.find(b => b !== 0);
  assert.ok(firstMove < 0 && Math.max(...bounce3) > 0, 'tier 3: dips first, then rebounds');
  for (const tier of [1, 2, 3]) {
    const end = chargeFrame(tier, CHARGE_LOOKS[tier].duration, out);
    assert.deepEqual([end.active, end.glow, end.flash, end.ring, end.bounce], [false, 0, 0, 0, 0], `tier ${tier} ends at rest`);
  }
  assert.equal(chargeFrame(2, 0.1, out), out, 'writes into the caller-owned frame (no per-frame allocation)');
});

test('the fit comes from the measured body, so a bigger car gets a proportionally bigger ring and hop', () => {
  const roadster = chargeFit(new THREE.Box3(new THREE.Vector3(-1.1, 0.3, -2.3), new THREE.Vector3(1.1, 1.2, 2.3)));
  const big = chargeFit(new THREE.Box3(new THREE.Vector3(-1.43, 0.39, -2.99), new THREE.Vector3(1.43, 1.56, 2.99)));
  assert.ok(Math.abs(big.ringRadius / roadster.ringRadius - 1.3) < 1e-9);
  assert.ok(Math.abs(big.hop / roadster.hop - 1.3) < 1e-9);
  const offCentre = chargeFit(new THREE.Box3(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 1, 4)));
  assert.deepEqual([offCentre.x, offCentre.z], [0, 2]);
  const empty = chargeFit(new THREE.Box3());
  assert.ok([empty.ringRadius, empty.hop, empty.x, empty.z].every(Number.isFinite), 'an empty body still gives a finite fit');
});

function rig() {
  const scene = new THREE.Scene(), car = makeCar(CAR_STYLES.roadster);
  scene.add(car);
  return { scene, car, charge: createDriftCharge(car, COLORS, scene) };
}
const drift = time => ({ time, nitro: 0, dir: 1 });

test('the glow shell rides the body (followsBody) and the ring sits on the ground, both hidden until a tier fires', () => {
  const { scene, car, charge } = rig();
  const { shell, ring } = charge.objects;
  assert.equal(shell.parent, car.userData.body);
  assert.equal(shell.geometry, car.userData.body.geometry);
  assert.equal(shell.userData.followsBody, true);
  assert.equal(ring.parent, scene, 'placed from the car matrix: a car child would be masked under a GLB');
  assert.deepEqual([shell.visible, ring.visible], [false, false]);
});

test('the player car fires each tier once and returns the tier for the rear-wheel burst', () => {
  const { charge } = rig();
  const fired = [];
  for (let t = 0; t <= 2.2; t += 1 / 60) fired.push(charge.update(drift(t), 1 / 60, true, false));
  assert.deepEqual(fired.filter(Boolean), [1, 2, 3]);
  assert.equal(charge.update(null, 1 / 60, true, false), 0);
  assert.equal(charge.update(drift(0.7), 1 / 60, false, false), 0, 'nothing fires outside racing');
});

test('the body hops on a local offset while wheels stay on the road, and everything returns to rest', () => {
  const { car, charge } = rig();
  const wheels = car.userData.wheels.map(w => w.position.y), body = car.userData.body;
  const rest = body.position.y;
  charge.update(drift(0.6), 1 / 60, true, false);
  let peak = 0;
  for (let i = 0; i < 6; i++) { charge.update(drift(0.6 + i / 60), 1 / 60, true, false); peak = Math.max(peak, body.position.y - rest); }
  assert.ok(peak > 0.005, `the body hopped (${peak})`);
  assert.deepEqual(car.userData.wheels.map(w => w.position.y), wheels, 'wheels never move');
  assert.ok(Math.abs(car.position.y) < 1e-12 && car.quaternion.equals(new THREE.Quaternion()), 'the road pose is untouched');
  for (let i = 0; i < 120; i++) charge.update(drift(0.7), 1 / 60, true, false);
  assert.ok(Math.abs(body.position.y - rest) < 1e-9, 'back at rest');
  assert.equal(charge.objects.shell.visible, false);
});

test('the race effects fire the player charge and a rear-wheel burst in the tier colour, once per tier', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new THREE.Scene(), car = makeCar(CAR_STYLES.roadster), race = createRace();
  scene.add(car);
  const effects = createEffects(scene, () => 0, { player: car });
  Object.assign(race, { phase: 'racing', pickups: [], rings: [] });
  race.player.speed = 60;
  const { alpha, color } = scene.children.find(object => object.isPoints).geometry.attributes;
  const lit = () => [...alpha.array].flatMap((a, i) => a > 0 ? [i] : []);
  // Reduced motion drops the drift smoke and sparks, so any live particle here is the burst (a timing cue it keeps).
  race.player.drift = drift(0.58);
  effects.update(race, 1 / 60, 0, false, true);
  assert.equal(lit().length, 0, 'nothing before the tier');
  race.player.drift = drift(0.6);
  effects.update(race, 1 / 60, 0, false, true);
  const burst = lit();
  assert.ok(burst.length >= 2, 'a burst at both rear wheels');
  for (const i of burst) assert.deepEqual([...color.array.slice(i * 3, i * 3 + 3)], COLORS[0].map(Math.fround), 'tier 1 blue, like its sparks');
  assert.equal(car.userData.body.getObjectByName('Drift charge shell').visible, true);
  race.player.drift = drift(0.62);
  effects.update(race, 1 / 60, 0, false, true);
  assert.ok(lit().length <= burst.length, 'fires once, not every frame of the tier');
  effects.dispose();
  assert.equal(car.userData.body.getObjectByName('Drift charge shell'), undefined, 'dispose takes the shell off the car');
});

test('reduced motion keeps the outline glow but drops the hop, sweeps and shockwave', () => {
  const { car, charge } = rig();
  const rest = car.userData.body.position.y;
  charge.update(drift(2), 1 / 60, true, true);
  charge.update(drift(2.05), 0.05, true, true);
  assert.equal(car.userData.body.position.y, rest);
  assert.equal(charge.objects.ring.visible, false);
  const { fronts, glow } = charge.objects.shell.material.uniforms;
  assert.ok(fronts.value.x < 0 && fronts.value.y < 0 && glow.value > 0);
});
