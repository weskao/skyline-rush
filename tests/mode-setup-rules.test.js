import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { modeEligibility, ruleConflicts, DEFAULT_RULES } from '../src/mode-setup.ts';
import { settleRace } from '../src/race-results.ts';
import { loadSessionProgress } from '../src/session-progress.ts';
import { createGhostStore } from '../src/ghost-store.ts';
import { createRace, RACE_TRACKS } from '../src/game.js';
import { normalizeRaceConfig, validateRaceRequest, MODES } from '../src/race-config.ts';
import { createCheckpointRush } from '../src/checkpoint-rush.ts';
import { raceCompletion } from '../src/race-objectives.ts';
import { UI } from '../src/locales/ui.ts';

// 10A: what the setup row promises (eligibility, unsupported combinations) is what the game enforces.
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k), store };
});
afterEach(() => { delete globalThis.localStorage; });
const ctx = { unlocked: 10, cupCount: 3 };

test('every named unsupported combination is explained, in English and Traditional Chinese', () => {
  const reasons = {
    circuit: 'mode.conflict.lapsCircuitOnly', // laps only on a closed circuit, never on an open sprint
    elimination: 'mode.conflict.eliminationRivals', // Elimination always has 3 rivals to knock out
  };
  for (const [mode, reason] of Object.entries(reasons)) {
    assert.ok(ruleConflicts(mode, DEFAULT_RULES, ctx).some(c => c.reason === reason), mode);
    assert.ok(UI.en[reason] && UI['zh-TW'][reason] && UI.en[reason] !== UI['zh-TW'][reason], reason);
  }
  // Laps can't be requested for an open sprint, and Elimination can't be started with 0 AI.
  for (const mode of MODES.filter(m => m !== 'circuit')) assert.throws(() => validateRaceRequest({ mode, laps: 3 }), RangeError, mode);
  assert.throws(() => validateRaceRequest({ mode: 'elimination', rivals: 0 }), RangeError);
  assert.equal(createRace('coast', { mode: 'elimination', rivals: 0 }).rivals.length, 3);
});

test('no rule can switch flight off, so every bridge gap stays crossable', () => {
  for (const mode of MODES) {
    const config = normalizeRaceConfig({ mode, flight: false, fly: false, noFlight: true });
    assert.ok(!Object.keys(config).some(key => /fl(y|ight)/i.test(key)), `${mode}: ${JSON.stringify(config)}`);
  }
});

test('checkpoint gates are never placed in unreachable aerial spots', () => {
  // Raised gates float 3 m up (a short hop); none sits in or near a tunnel (4 m ceiling), gap, launch or shortcut.
  for (const [trackId, track] of Object.entries(RACE_TRACKS)) {
    const rush = createCheckpointRush(track);
    assert.ok(rush.gates.length > 0, trackId);
    for (const gate of rush.gates) {
      assert.ok([0, 3].includes(gate.altitude), `${trackId} gate @${gate.distance} at ${gate.altitude} m`);
      assert.ok(!track.sections.some(s => ['gap', 'launch', 'tunnel', 'boost-tunnel', 'shortcut'].includes(s.type) &&
        gate.distance >= s.from - 70 && gate.distance <= s.to + 70), `${trackId} gate @${gate.distance} near a special section`);
    }
  }
});

const settle = race => settleRace(race, { series: { sprintSeries: null, cup: null, stunt: null }, progress: loadSessionProgress(['coast']),
  ghosts: createGhostStore(), daily: null, trace: null });
const finished = (mode, extra = {}) => {
  const race = createRace('coast', mode === 'classic' ? undefined : { mode, ...extra });
  return Object.assign(race, { phase: 'finished', elapsed: 70, result: { position: 1, time: 70, score: 500, stars: 2, collisions: 0, nearMisses: 0, success: true } });
};
const written = () => [...globalThis.localStorage.store.keys()].filter(k => k.startsWith('skyline-rush-')).sort();

test('the eligibility line matches what a finished run actually saves', () => {
  settle(finished('classic'));
  assert.equal(modeEligibility('classic'), 'records');
  assert.ok(written().includes('skyline-rush-history') && written().includes('skyline-rush-best-tracks'), written().join());
  assert.ok(!written().includes('skyline-rush-mode-bests-v1'));
  for (const mode of ['custom', 'time', 'checkpoint']) {
    globalThis.localStorage.store.clear();
    settle(finished(mode));
    assert.equal(modeEligibility(mode), 'modeBests');
    assert.ok(written().includes('skyline-rush-mode-bests-v1'), `${mode}: ${written().join()}`);
    assert.ok(!written().includes('skyline-rush-history') && !written().includes('skyline-rush-unlocked'), `${mode} touched Classic progress`);
  }
  // Free Drive ends at the road end, but a practice run saves nothing.
  assert.equal(modeEligibility('free'), 'practice');
  const free = createRace('coast', { mode: 'free' });
  free.player.distance = free.length;
  assert.equal(raceCompletion(free).done, true);
  globalThis.localStorage.store.clear();
  settle(finished('free'));
  assert.deepEqual(written().filter(key => /history|best|unlocked/.test(key)), [], written().join());
});
