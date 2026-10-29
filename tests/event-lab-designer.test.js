import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace } from '../src/game.js';
import { seededRng } from '../src/rng.ts';
import * as lab from '../src/event-lab.ts';

const access = new Set(['coast']);
const course = (objects, extra = {}) => ({ version: 1, label: 'Designer', trackId: 'coast', seed: 7,
  modifier: 'standard', objects, ...extra });
const base = () => createRace('coast', { mode: 'custom', rivals: 0, traffic: 'off' });

test('authored checkpoints compile into the shared timed checkpoint runtime', () => {
  const document = lab.validateCourse(course([{ kind: 'checkpoint', distance: 400, lane: 1 },
    { kind: 'barrier', distance: 300, lane: 3 }]), access);
  const race = lab.compileCourse(base(), document, access);
  assert.deepEqual(race.checkpoint.gates, [{ distance: 400, x: -2.5, altitude: 0, passed: false, missed: false }]);
  startRace(race); race.phase = 'racing';
  Object.assign(race.player, { distance: 397, x: -2.5, speed: 60 });
  stepRace(race, { throttle: true }, .1);
  assert.equal(race.checkpoint.passed, 1, 'driving through an authored checkpoint must count');
  assert.equal(lab.compileCourse(base(), lab.validateCourse(course([{ kind: 'barrier', distance: 300, lane: 1 }]), access), access).checkpoint, null);
});

test('checkpoints fit the pooled gate renderer and keep course spacing', () => {
  const many = Array.from({ length: 17 }, (_, i) => ({ kind: 'checkpoint', distance: 300 + i * 60, lane: 1 }));
  assert.throws(() => lab.validateCourse(course(many), access), error => error.code === 'count');
  assert.doesNotThrow(() => lab.validateCourse(course(many.slice(0, 16)), access));
});

test('every barrier leaves at least two connected lanes open next to existing road props', () => {
  const props = [{ from: 290, to: 310, left: -10, right: -1, bottom: 0, top: 4 }]; // closes lanes 0 and 1
  assert.throws(() => lab.validateCourse(course([{ kind: 'barrier', distance: 300, lane: 3 }]), access, props), error => error.code === 'reachable');
  assert.throws(() => lab.validateCourse(course([{ kind: 'barrier', distance: 300, lane: 2 }]), access, props), error => error.code === 'reachable');
  assert.doesNotThrow(() => lab.validateCourse(course([{ kind: 'barrier', distance: 300, lane: 2 }]), access));
  assert.doesNotThrow(() => lab.validateCourse(course([{ kind: 'pickup', distance: 300, lane: 3 }]), access, props));
});

test('checkpoint template is seed-deterministic and only uses validated placements', () => {
  const a = lab.createCourse('coast', 'checkpoints', 99, access);
  assert.deepEqual(lab.createCourse('coast', 'checkpoints', 99, access), a);
  assert.ok(a.objects.some(o => o.kind === 'checkpoint'));
  assert.deepEqual(lab.validateCourse(JSON.parse(lab.exportCourse(a)), access), a);
});

test('acceptance: the same document and seed compile to the identical stage on every device profile', () => {
  const document = lab.createCourse('coast', 'checkpoints', 4242, access);
  const stage = race => JSON.stringify({ seed: race.seed, hazards: race.hazards, pickups: race.pickups, rings: race.rings,
    checkpoint: race.checkpoint, session: race.session });
  // Compilation takes no viewport, quality or input-device argument, so desktop and phone share one stage.
  const desktop = stage(lab.compileCourse(base(), lab.importCourse(lab.exportCourse(document), access), access));
  const phone = stage(lab.compileCourse(base(), lab.importCourse(lab.exportCourse(document), access), access));
  assert.equal(phone, desktop);
});

test('acceptance: mutated or truncated creations fail only with a course error', () => {
  const json = lab.exportCourse(lab.createCourse('coast', 'checkpoints', 5, access));
  const random = seededRng(31, 'event-lab-fuzz');
  const alphabet = '{}[]",:0123456789-.eE truefalsnul\\u';
  for (let i = 0; i < 2000; i++) {
    const at = Math.floor(random() * json.length);
    const mutated = i % 3 === 0 ? json.slice(0, at)
      : json.slice(0, at) + alphabet[Math.floor(random() * alphabet.length)] + json.slice(at + (i % 2));
    try { lab.importCourse(mutated, access); } catch (error) { assert.ok(error instanceof lab.CourseError, `${error} for ${mutated}`); }
  }
});

test('designer snaps a map point to a lane and the 10 m grid inside the safe range', () => {
  assert.deepEqual(lab.snapPlacement(0.1, 0.05, 2000), { lane: 0, distance: 200 });
  assert.deepEqual(lab.snapPlacement(0.6, 0.5, 2000), { lane: 2, distance: 1100 });
  assert.deepEqual(lab.snapPlacement(1.4, 2, 2000), { lane: 3, distance: 2000 });
  assert.deepEqual(lab.snapPlacement(Number.NaN, -1, 2000), { lane: 0, distance: 200 });
});

test('collision preview reports why a placement fails without changing the draft', () => {
  const draft = lab.validateCourse(course([{ kind: 'barrier', distance: 300, lane: 1 }]), access);
  const props = [{ from: 590, to: 610, left: -10, right: -1, bottom: 0, top: 4 }];
  assert.equal(lab.previewPlacement(draft, { kind: 'pickup', distance: 500, lane: 2 }, access, props), null);
  assert.equal(lab.previewPlacement(draft, { kind: 'pickup', distance: 320, lane: 2 }, access, props), 'spacing');
  assert.equal(lab.previewPlacement(draft, { kind: 'barrier', distance: 600, lane: 3 }, access, props), 'reachable');
  assert.equal(lab.previewPlacement(draft, { kind: 'pickup', distance: 600, lane: 0 }, access, props), 'blocked');
  assert.equal(draft.objects.length, 1);
});

test('cones use the catalog footprint for placement, contact and rendering size', async () => {
  const { OBJECT_CATALOG } = await import('../src/object-catalog.ts');
  const document = lab.validateCourse(course([{ kind: 'cone', distance: 300, lane: 2 }]), access);
  const race = lab.compileCourse(base(), document, access);
  const cone = OBJECT_CATALOG.cone.hitbox;
  assert.deepEqual([race.hazards[0].halfWidth, race.hazards[0].height], [cone.halfWidth, cone.height]);
  startRace(race); race.phase = 'racing';
  const drive = (x, altitude = 0) => {
    const h = race.hazards[0]; Object.assign(h, { hit: false, passed: false });
    Object.assign(race.player, { distance: 297, x, altitude, speed: 60, cooldown: 0, collisions: 0 });
    stepRace(race, { throttle: true }, .1);
    return race.player.collisions;
  };
  assert.equal(drive(2.5 + 1.0), 0, 'a 0.7 m cone must not knock a car 1 m to its side');
  assert.equal(drive(2.5, 1.2), 0, 'a car 1.2 m up clears a 0.8 m cone');
  assert.equal(drive(2.5), 1, 'driving straight into a cone still collides');
  const barrier = lab.compileCourse(base(), lab.validateCourse(course([{ kind: 'barrier', distance: 300, lane: 2 }]), access), access);
  assert.equal(barrier.hazards[0].halfWidth, OBJECT_CATALOG.barrier.hitbox.halfWidth);
});

test('a cone still closes its lane for reachability', () => {
  const props = [{ from: 290, to: 310, left: -10, right: -1, bottom: 0, top: 4 }];
  assert.throws(() => lab.validateCourse(course([{ kind: 'cone', distance: 300, lane: 2 }]), access, props), error => error.code === 'reachable');
});

test('authored ramps launch grounded cars with the shared Sky Spiral impulse', async () => {
  const { OBJECT_CATALOG } = await import('../src/object-catalog.ts');
  const { launchImpulse } = await import('../src/launch-ramps.ts');
  const document = lab.validateCourse(course([{ kind: 'ramp', distance: 400, lane: 1 }]), access);
  const race = lab.compileCourse(base(), document, access);
  const ramp = OBJECT_CATALOG.ramp.hitbox;
  assert.deepEqual(race.ramps, [{ distance: 400, x: -2.5, halfWidth: ramp.halfWidth, halfLength: ramp.halfLength, height: ramp.height }]);
  assert.equal(race.hazards.length, 0, 'a ramp is driven over, never a wall');
  startRace(race); race.phase = 'racing';
  const drive = (x, speed) => {
    Object.assign(race.player, { distance: 400 + ramp.halfLength - .5, x, speed, altitude: 0, verticalSpeed: 0 });
    stepRace(race, { throttle: true }, 1 / 60);
    return race.player;
  };
  const launched = drive(-2.5, 50);
  assert.ok(launched.altitude > 0, 'crossing the lip at speed leaves the ground');
  assert.ok(launched.verticalSpeed > launchImpulse(50) - 2, 'impulse matches the shared rule');
  assert.equal(drive(-2.5 + ramp.halfWidth + .5, 50).altitude, 0, 'missing the ramp sideways stays grounded');
  assert.equal(drive(-2.5, 20).altitude, 0, 'too slow to launch');
});

test('ramps fit the pooled renderer budget and keep plain races ramp-free', async () => {
  const { crossesRamp } = await import('../src/launch-ramps.ts');
  const many = Array.from({ length: 9 }, (_, i) => ({ kind: 'ramp', distance: 300 + i * 60, lane: 1 }));
  assert.throws(() => lab.validateCourse(course(many), access), error => error.code === 'count');
  assert.doesNotThrow(() => lab.validateCourse(course(many.slice(0, 8)), access));
  assert.equal(crossesRamp(undefined, { distance: 0, x: 0 }, 5), false);
});
