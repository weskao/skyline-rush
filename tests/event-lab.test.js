import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { recordModeRace, loadModeHistory, loadModeBest } from '../src/history.ts';

// Dynamic loading makes the first RED an observable missing capability assertion.
let lab = {};
try { lab = await import('../src/event-lab.ts'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const course = (extra = {}) => ({ version: 1, label: 'Test course', trackId: 'coast', seed: 123,
  modifier: 'standard', objects: [{ kind: 'barrier', distance: 300, lane: 2 }], ...extra });
const access = new Set(['coast']);

test('authored courses validate and freeze a canonical document without runtime flags', () => {
  assert.equal(typeof lab.validateCourse, 'function', 'Event Lab must validate authored courses');
  const document = lab.validateCourse(course(), access);
  assert.equal(document.objects[0].lane, 2);
  assert.ok(Object.isFrozen(document.objects[0]));
  assert.throws(() => lab.validateCourse(course({ objects: [{ ...course().objects[0], hit: true }] }), access));
});

test('bounded import rejects corrupt, unknown, locked, unsafe and overlapping creations', () => {
  assert.equal(typeof lab.importCourse, 'function');
  const bad = [null, { version: 2 }, course({ trackId: 'unknown' }), course({ trackId: 'neon' }),
    course({ seed: -1 }), course({ label: '<script>alert(1)</script>' }), course({ label: 'x'.repeat(41) }),
    course({ objects: [{ kind: 'ramp', distance: 300, lane: 1 }] }),
    course({ objects: [{ kind: 'barrier', distance: 0, lane: 1 }] }),
    course({ objects: [{ kind: 'barrier', distance: 300, lane: 4 }] }),
    course({ objects: Array.from({ length: 25 }, (_, i) => ({ kind: 'pickup', distance: 300 + 80 * i, lane: 1 })) }),
    course({ objects: [{ kind: 'barrier', distance: 300, lane: 1 }, { kind: 'pickup', distance: 300, lane: 2 }] }),
    course({ objects: [{ kind: 'ring', distance: 300, lane: 1 }, { kind: 'ring', distance: 350, lane: 2 }] }),
    course({ objects: [{ kind: 'ring', distance: 300, lane: 1 }, { kind: 'ring', distance: 420, lane: 2 }] })];
  for (const value of bad) assert.throws(() => lab.importCourse(JSON.stringify(value), access), JSON.stringify(value));
  assert.throws(() => lab.importCourse('{broken', access));
  assert.throws(() => lab.importCourse(' '.repeat(16385), access));
  assert.throws(() => lab.importCourse('界'.repeat(6000), access));
  for (const [trackId, track] of Object.entries(RACE_TRACKS)) {
    const section = track.sections.find(s => ['gap', 'launch', 'tunnel', 'boost-tunnel', 'shortcut'].includes(s.type));
    if (!section) continue;
    assert.throws(() => lab.validateCourse(course({ trackId, objects: [{ kind: 'barrier', distance: Math.round(section.from / 10) * 10, lane: 1 }] }), new Set([trackId])));
  }
  assert.throws(() => lab.validateCourse(course(), access, [{ from: 298, to: 302, left: 0, right: 5, bottom: 0, top: 4 }]));
});

test('template and authoring history preserve exact snapshots across undo redo reset and blocked storage', () => {
  assert.equal(typeof lab.createCourseHistory, 'function');
  const initial = lab.createCourse('coast', 'slalom', 123, access);
  const history = lab.createCourseHistory(initial);
  const edited = lab.validateCourse({ ...initial, label: 'Edited' }, access);
  history.commit(edited);
  assert.equal(history.undo(), initial);
  assert.equal(history.redo(), edited);
  history.reset(initial);
  assert.equal(history.undo(), edited);
  for (let i = 0; i < 60; i++) history.commit(lab.validateCourse({ ...initial, label: 'Edit ' + i }, access));
  let count = 0;
  while (history.canUndo()) { history.undo(); count++; }
  assert.equal(count, 30);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(lab.saveCourse(initial, blocked), false);
  assert.equal(lab.loadCourse(access, blocked), null);
  assert.deepEqual(lab.importCourse(lab.exportCourse(initial), access), initial);
});

test('compilation creates playable sorted objects and retry resets mutable flags without changing course identity', async () => {
  assert.equal(typeof lab.compileCourse, 'function');
  const document = lab.validateCourse(course({ objects: [
    { kind: 'ring', distance: 500, lane: 2 }, { kind: 'barrier', distance: 300, lane: 2 },
    { kind: 'pickup', distance: 400, lane: 2 },
  ] }), access);
  const compile = () => lab.compileCourse(createRace('coast', { mode: 'custom', rivals: 0, traffic: 'off' }), document, access);
  const race = compile();
  assert.equal(race.mode, 'eventlab');
  assert.equal(race.seed, 123);
  assert.equal(race.hazards[0].distance, 300);
  assert.equal(race.pickups[0].distance, 400);
  assert.equal(race.rings[0].distance, 500);
  const identity = race.config.course;
  startRace(race); race.phase = 'racing';
  Object.assign(race.player, { distance: 297, x: 2.5, speed: 60 });
  stepRace(race, { throttle: true }, .1);
  assert.equal(race.player.collisions, 1, 'authored barrier must collide');
  Object.assign(race.player, { distance: 397, x: 2.5, speed: 60, fuel: 10 });
  stepRace(race, { throttle: true }, .1);
  assert.ok(race.player.fuel > 10, 'authored pickup must refill');
  const retry = compile();
  assert.equal(retry.config.course, identity);
  assert.equal(retry.hazards[0].hit, false);
  assert.equal(document.objects[1].hit, undefined);
  assert.notEqual(retry.hazards[0], race.hazards[0]);
  access.delete('coast');
  assert.throws(compile, /locked/);
  access.add('coast');
});

test('course records remain distinct from Custom and every edited authored layout', () => {
  const store = new Map();
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  const run = document => {
    const race = lab.compileCourse(createRace('coast', { mode: 'custom', rivals: 0, traffic: 'off' }), document, access);
    race.result = { time: 80, score: 20, position: 1, success: true };
    return race;
  };
  const race = run(lab.validateCourse(course(), access));
  assert.doesNotThrow(() => recordModeRace(race, storage));
  assert.equal(loadModeHistory(storage)[0].mode, 'eventlab');
  assert.equal(loadModeBest('coast', race.config, storage), 80);
  const edited = run(lab.validateCourse(course({ seed: 124 }), access));
  assert.equal(loadModeBest('coast', edited.config, storage), null);
  assert.equal(loadModeBest('coast', createRace('coast', { mode: 'custom', rivals: 0, traffic: 'off' }).config, storage), null);
});
