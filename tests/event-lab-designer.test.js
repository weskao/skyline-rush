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
