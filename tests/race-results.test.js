import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { settleRace } from '../src/race-results.ts';
import { loadSessionProgress } from '../src/session-progress.ts';
import { createGhostStore } from '../src/ghost-store.ts';
import { createSprintSeries } from '../src/sprint-series.ts';
import { RACE_TRACKS, createRace, stepRace } from '../src/game.js';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { loadHistory } from '../src/history-classic.ts';
import { MODE_NAMES, mergeModeBests } from '../src/cloud-mode-bests.ts';
import { readLocalModeBests } from '../src/cloud-progress.ts';
import { validateCourse, compileCourse } from '../src/event-lab.ts';

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
});
afterEach(() => { delete globalThis.localStorage; });

const classic = (result, extra = {}) => ({ phase: 'finished', mode: 'classic', trackId: 'coast', length: 5000, elapsed: result.time, modifier: null, config: {},
  styleAttack: null, result: { position: 1, time: 61.5, score: 500, stars: 2, collisions: 0, nearMisses: 1, ...result }, ...extra });
const settle = (race, overrides = {}) => {
  const context = { series: { sprintSeries: null, cup: null, stunt: null }, progress: loadSessionProgress(['coast']), ghosts: createGhostStore(),
    daily: null, trace: null, ...overrides };
  return { context, settlement: settleRace(race, context) };
};

test('race settlement lives in race-results.ts, not inside phaseUI', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const moved of [/recordMedals\(/, /recordBest\(/, /recordModeRace\(/, /recordDaily\(/, /addCupResult\(/, /LEGACY_BEST_KEY/])
    assert.doesNotMatch(main, moved);
});

test('a podium Classic finish unlocks the next track, offers NEXT and saves the first time as a record', () => {
  const { context, settlement } = settle(classic({ position: 2, time: 61.5 }));
  assert.equal(settlement.next, 'neon');
  assert.ok(context.progress.unlocked.has('neon'));
  assert.deepEqual([settlement.best, settlement.record], [61.5, true]);
  assert.equal(context.progress.bests.coast, 61.5);
  assert.equal(context.progress.stars.coast, 2);
  assert.equal(context.progress.history.length, 1);
});

test('fourth place records the run but neither unlocks nor offers the next track', () => {
  const { context, settlement } = settle(classic({ position: 4 }));
  assert.equal(settlement.next, null);
  assert.equal(context.progress.unlocked.has('neon'), false);
  assert.equal(context.progress.history.length, 1);
});

test('a slower Classic run keeps the session best even when storage forgot it', () => {
  const progress = loadSessionProgress(['coast']);
  progress.bests.coast = 55;
  const { settlement } = settle(classic({ time: 61.5 }), { progress });
  assert.deepEqual([settlement.best, settlement.record], [55, false]);
});

test('a Classic record saves a ghost only with this race\'s own trace', () => {
  const length = RACE_TRACKS.coast.length;
  const progress = loadSessionProgress(['coast']);
  const withoutTrace = createGhostStore();
  settle(classic({ time: 70 }), { progress, ghosts: withoutTrace, trace: null });
  assert.equal(withoutTrace.classic('coast'), null, 'a record whose trace belongs to another race saves no ghost');
  const samples = Array.from({ length: 691 }, (_, i) => [i / 690 * length, 0, 0]);
  const ghosts = createGhostStore();
  settle(classic({ time: 69 }), { progress, ghosts, trace: samples });
  assert.equal(ghosts.classic('coast')?.time, 69);
});

test('a failed mode run is a retry: its time shows but is never saved as a best', () => {
  const race = classic({ success: false, time: 40 }, { mode: 'checkpoint', elapsed: 40, config: { mode: 'checkpoint' } });
  const { context, settlement } = settle(race);
  assert.deepEqual([settlement.best, settlement.record], [40, false]);
  assert.equal(context.progress.modeHistory.length, 0);
  assert.deepEqual(settlement.challengeMedals, [], 'failed attempts do not award personal medals');
});

test('a clean Time Attack awards one personal medal independently of Career medals', () => {
  const progress = loadSessionProgress(['coast']);
  const timeRace = () => classic({ success: true, collisions: 0 }, { mode: 'time', config: { mode: 'time' } });
  const first = settle(timeRace(), { progress }).settlement;
  assert.deepEqual(first.challengeMedals, ['time-clean']);
  assert.deepEqual(progress.medals, {}, 'personal medals do not change the four Career awards');
  assert.deepEqual(settle(timeRace(), { progress }).settlement.challengeMedals, [], 'an earned medal is not announced twice');
});

test('completed Stunt runs retain aerial peaks from earlier heats and award only at the end', () => {
  const progress = loadSessionProgress(['coast']);
  const stunt = { duration: 120, elapsed: 0, score: 0, heats: 0, maxCombo: 0, airTime: 0, trackId: 'coast' };
  const series = { sprintSeries: null, cup: null, stunt };
  const heat = (endReason, longestFlight, maxAerialCombo) => classic({ success: true, time: 60, score: 1000, endReason }, {
    mode: 'stunt', config: { mode: 'stunt', duration: 120 },
    styleAttack: { maxCombo: 4, airTime: longestFlight, longestFlight, maxAerialCombo },
  });
  const first = settle(heat('route', 9, 4), { progress, series }).settlement;
  assert.equal(first.intermediateStage, true);
  assert.deepEqual(first.challengeMedals, []);
  const final = settle(heat('timer', 1, 1), { progress, series }).settlement;
  assert.equal(final.intermediateStage, false);
  assert.deepEqual(final.challengeMedals, ['long-flight', 'aerial-combo']);
});

test('a Stunt timer clips the final telemetry tick to the completed heat time', () => {
  const stunt = { duration: 120, elapsed: 0, score: 0, heats: 0, maxCombo: 0, airTime: 0, trackId: 'coast' };
  const race = classic({ success: true, time: 120, score: 1000, endReason: 'timer' }, {
    mode: 'stunt', config: { mode: 'stunt', duration: 120 },
    styleAttack: { maxCombo: 0, airTime: 120.02, longestFlight: 120.02, maxAerialCombo: 0 },
  });
  const { context, settlement } = settle(race, { series: { sprintSeries: null, cup: null, stunt } });
  assert.deepEqual(settlement.challengeMedals, ['long-flight']);
  assert.equal(context.progress.challengeMedals.longestFlight, 120);
});

test('an unfinished sprint series is an intermediate stage with no individual best', () => {
  const race = classic({ time: 30 }, { mode: 'custom', config: { mode: 'custom', stages: 3 } });
  const { settlement } = settle(race, { series: { sprintSeries: createSprintSeries(3), cup: null, stunt: null } });
  assert.equal(settlement.intermediateStage, true);
  assert.deepEqual([settlement.best, settlement.record], [0, false]);
  assert.equal(settlement.series.sprintSeries.results.length, 1);
});

test('an intermediate Custom heat saves its own compatible Ghost without awarding a series best', () => {
  const race = classic({ time: 70 }, { mode: 'custom', config: { mode: 'custom', stages: 3 } });
  const ghosts = createGhostStore();
  const trace = Array.from({ length: 701 }, (_, i) => [i / 700 * 5000, 0, 0]);
  const { context, settlement } = settle(race, { ghosts, trace,
    series: { sprintSeries: createSprintSeries(3), cup: null, stunt: null } });
  assert.equal(ghosts.mode(race)?.time, 70);
  assert.equal(settlement.intermediateStage, true);
  assert.equal(settlement.record, false);
  assert.equal(context.progress.modeHistory.length, 0);
  assert.equal(context.progress.history.length, 0);
  assert.equal(context.progress.unlocked.has('neon'), false);
});

test('a stunt heat adds its time, score and air time to the running stunt total', () => {
  const stunt = { duration: 60, elapsed: 0, score: 0, heats: 0, maxCombo: 0, airTime: 0, trackId: 'coast' };
  const race = classic({ time: 20, score: 300, endReason: 'route' }, { mode: 'stunt', config: { mode: 'stunt', duration: 60 }, styleAttack: { airTime: 3, maxCombo: 4 } });
  const { settlement } = settle(race, { series: { sprintSeries: null, cup: null, stunt } });
  assert.deepEqual(settlement.series.stunt, { duration: 60, elapsed: 20, score: 300, heats: 1, maxCombo: 4, airTime: 3, trackId: 'coast' });
  assert.equal(settlement.intermediateStage, true, 'time is left, so the next heat follows');
});

test('settling the same finished race twice writes its result and rewards once', () => {
  const race = classic({ position: 1, time: 61.5, stars: 3 });
  const { context, settlement } = settle(race);
  const again = settleRace(race, context);
  assert.equal(again, settlement, 'a repeated settle returns the first settlement');
  assert.equal(context.progress.history.length, 1);
  assert.equal(loadHistory().length, 1, 'stored history holds one run');
});

test('a repeated stunt settle never counts the same heat twice', () => {
  const stunt = { duration: 60, elapsed: 0, score: 0, heats: 0, maxCombo: 0, airTime: 0, trackId: 'coast' };
  const race = classic({ time: 20, score: 300, endReason: 'route' }, { mode: 'stunt', config: { mode: 'stunt', duration: 60 }, styleAttack: { airTime: 3, maxCombo: 4 } });
  const { context } = settle(race, { series: { sprintSeries: null, cup: null, stunt } });
  settleRace(race, context);
  assert.deepEqual([stunt.heats, stunt.elapsed, stunt.score], [1, 20, 300]);
});

function drivenCircuitLap() {
  const race = createRace(CIRCUIT_ID, { mode: 'circuit', laps: 1 });
  race.phase = 'racing'; race.pickups = []; race.rings = []; race.player.x = 2.5;
  while (race.phase === 'racing' && race.elapsed < 120) stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.phase, 'finished');
  return race;
}

test('no non-Classic finish touches Classic unlocks, stars, medals, bests, history or the Daily board', () => {
  const classicState = progress => {
    const { unlocked, modeHistory, ...rest } = progress, { modeHistory: stored, ...saved } = loadSessionProgress([]);
    return JSON.stringify({ unlocked: [...unlocked], ...rest, saved: { ...saved, unlocked: null } });
  };
  for (const mode of MODE_NAMES) {
    const store = new Map();
    globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
    const progress = loadSessionProgress(['coast']);
    const before = classicState(progress);
    // Endless settles a distance on its own path (fifth collision, no stars); it must still leave Classic alone.
    const result = mode === 'endless' ? { distance: 12000, stars: 0, collisions: 5, endReason: 'collisions' } : {};
    // Circuit records validate real lap times, so it settles a lap actually driven on its own route.
    settle(mode === 'circuit' ? drivenCircuitLap() : classic({ position: 1, time: 50, stars: 3, nearMisses: 40, ...result }, { mode, config: { mode } }), { progress });
    assert.equal(classicState(progress), before, `${mode} finish left Classic progress unchanged`);
    assert.equal(progress.modeHistory.length, 1, `${mode} finish is recorded in its own mode history`);
  }
});

test('an Event Lab finish never touches Classic progress and its records stay on this device', () => {
  const access = new Set(['coast']);
  const document = validateCourse({ version: 1, label: 'Isolation', trackId: 'coast', seed: 321, modifier: 'standard',
    objects: [{ kind: 'barrier', distance: 300, lane: 2 }] }, access);
  const race = compileCourse(createRace('coast', { mode: 'custom', rivals: 0, traffic: 'off' }), document, access);
  race.phase = 'finished';
  race.elapsed = 80;
  race.result = { position: 1, time: 80, score: 20, stars: 3, collisions: 0, nearMisses: 0, success: true };
  const progress = loadSessionProgress(['coast']);
  const classicState = () => JSON.stringify({ ...progress, unlocked: [...progress.unlocked], modeHistory: null, saved: { ...loadSessionProgress([]), unlocked: null, modeHistory: null } });
  const before = classicState();
  const { settlement } = settle(race, { progress });
  assert.equal(classicState(), before, 'Classic unlocks, stars, medals, bests, history and Daily untouched');
  assert.deepEqual([settlement.best, progress.modeHistory.at(-1).mode], [80, 'eventlab'], 'recorded locally as its own course');
  // A Custom finish next to it proves the cloud payload is not empty by accident.
  settle(classic({ time: 70 }, { mode: 'custom', config: { mode: 'custom' } }), { progress });
  const modes = bests => Object.keys(bests).map(key => JSON.parse(key)[1].mode);
  assert.ok(modes(readLocalModeBests().bests).includes('eventlab'), 'the course best is kept on this device');
  const cloud = modes(mergeModeBests(readLocalModeBests()).bests);
  assert.ok(cloud.includes('custom'), 'other modes still reach the cloud payload');
  assert.ok(!cloud.includes('eventlab'), 'Event Lab bests never reach cloud mode bests');
});
