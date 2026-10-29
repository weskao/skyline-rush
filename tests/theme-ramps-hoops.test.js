import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { RISK_RING_RADIUS } from '../src/ring-layout.ts';
import { launchImpulse } from '../src/launch-ramps.ts';

const themed = (trackId, extra = {}) => createRace(trackId, { mode: 'custom', rivals: 0, traffic: 'off', themes: true, ...extra });
const ready = race => { startRace(race); race.phase = 'racing'; race.countdown = 0; return race; };
const gaps = trackId => RACE_TRACKS[trackId].sections.filter(s => s.type === 'gap');

test('themes stay opt-in: without them Canyon has no ramps and Sky Spiral keeps its rings', () => {
  for (const trackId of ['canyon', 'spiral']) {
    assert.equal(createRace(trackId).ramps, undefined);
    assert.equal(createRace(trackId, { mode: 'custom' }).ramps, undefined);
    assert.deepEqual(createRace(trackId, { mode: 'custom' }).rings, createRace(trackId, { mode: 'custom', themes: false }).rings);
    assert.ok(!('ramps' in createRace(trackId)), 'Classic race objects gain no new key');
  }
});

test('Canyon themes place launch ramps that never become road hazards', () => {
  const race = themed('canyon');
  assert.ok(race.ramps.length >= 3, 'precision ramps');
  assert.ok(race.hazards.every(h => h.type !== 'ramp'), 'ramps launch; they never block or nudge');
  for (const gap of gaps('canyon')) {
    assert.ok(race.ramps.some(r => r.distance + r.halfLength < gap.from && gap.from - (r.distance + r.halfLength) <= 40),
      `a risky ramp line leads into the broken bridge at ${gap.from} m`);
  }
});

test('the risky ramp line jumps every broken bridge without FLY at any launch speed', () => {
  for (const gap of gaps('canyon')) for (const speed of [33, 45, 60]) for (const fps of [30, 60, 120]) {
    const race = ready(themed('canyon'));
    const ramp = race.ramps.find(r => r.distance < gap.from && gap.from - r.distance < 60);
    Object.assign(race.player, { distance: ramp.distance, x: ramp.x, speed, altitude: 0, verticalSpeed: 0, falls: 0, fuel: 0 });
    let launched = 0;
    for (let i = 0; i < fps * 12 && !(race.player.distance > gap.to && race.player.altitude === 0); i++) {
      stepRace(race, { throttle: true }, 1 / fps);
      if (!launched && race.player.altitude > 0) launched = race.player.verticalSpeed;
    }
    assert.ok(launched > launchImpulse(33) - 2, `launch at ${speed} m/s`);
    assert.equal(race.player.falls, 0, `${gap.from} m at ${speed} m/s, ${fps} FPS: lands past the bridge`);
    assert.ok(race.player.distance > gap.to);
  }
});

test('Sky Spiral themes add a bounded set of spinning precision hoops scored as risk rings', () => {
  const race = ready(themed('spiral'));
  const hoops = race.rings.filter(r => r.spin);
  assert.ok(hoops.length >= 4 && hoops.length <= 6, 'bounded airborne targets');
  for (const hoop of hoops) {
    assert.equal(hoop.type, 'risk');
    assert.equal(hoop.radius, RISK_RING_RADIUS);
    assert.ok(hoop.altitude >= 5, 'airborne');
  }
  assert.ok(hoops.some(h => h.distance >= 1100 && h.distance <= 2200), 'one is on the helix');
  assert.ok(race.hazards.every(h => h.type !== 'ring'));
  const hoop = hoops[0];
  Object.assign(race.player, { distance: hoop.distance - 1, x: hoop.x, altitude: hoop.altitude, speed: 30, score: 0 });
  stepRace(race, { throttle: true, fly: true }, .1);
  assert.equal(race.player.score >= 150 + race.risk.ringScore, true, 'pays the risk-ring score');
  const after = race.player.score;
  Object.assign(race.player, { distance: hoop.distance - 1, x: hoop.x, altitude: hoop.altitude });
  stepRace(race, { throttle: true, fly: true }, .1);
  assert.ok(race.player.score - after < 150, 'each hoop pays once');
});

test('switching risk lines off removes the themed hoops too', () => {
  assert.equal(themed('spiral', { riskLines: 'off' }).rings.filter(r => r.spin).length, 0);
});

test('passing under a Spiral hoop neither collects it nor pays the risk bonus', () => {
  const race = ready(themed('spiral'));
  const hoop = race.rings.find(r => r.spin);
  Object.assign(race.player, { distance: hoop.distance - 1, x: hoop.x, altitude: 0, speed: 30, score: 0 });
  stepRace(race, { throttle: true }, .1);
  assert.ok(!hoop.hit, 'a hoop 6 m up is out of reach from the road');
  assert.ok(race.player.score < race.risk.ringScore);
});

test('rivals drive over Canyon ramps exactly as they drive the road without them', () => {
  // AI never launches: its run through a ramp lane is identical with and without the ramp.
  const run = withRamps => {
    const race = ready(themed('canyon', { rivals: 1 }));
    if (!withRamps) race.ramps = [];
    const rival = race.rivals[0], ramp = themed('canyon').ramps[0];
    Object.assign(rival, { distance: ramp.distance - 30, x: ramp.x, altitude: 0 });
    for (let i = 0; i < 600; i++) stepRace(race, { throttle: true }, 1 / 60);
    return { distance: rival.distance, x: rival.x, altitude: rival.altitude || 0, falls: rival.falls ?? 0 };
  };
  assert.deepEqual(run(true), run(false));
});
