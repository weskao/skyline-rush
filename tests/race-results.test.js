import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { settleRace } from '../src/race-results.ts';
import { loadSessionProgress } from '../src/session-progress.ts';
import { createGhostStore } from '../src/ghost-store.ts';
import { createSprintSeries } from '../src/sprint-series.ts';
import { RACE_TRACKS } from '../src/game.js';

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
