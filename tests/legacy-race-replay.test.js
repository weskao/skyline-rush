import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { MODES } from '../src/race-config.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { FROSTBITE_ID } from '../src/courses/frostbite-race.ts';

// Characterization guard: pins the exact 1D race simulation of every legacy track so graph wiring cannot change it.
// Regenerate (only for an intended legacy behaviour change): RECORD_REPLAY=1 node --test tests/legacy-race-replay.test.js
const FIXTURE = new URL('./fixtures/legacy-race-replay.json', import.meta.url);
const RECORD = process.env.RECORD_REPLAY === '1';
const SECONDS = 45;
const within = (t, ...spans) => spans.some(([a, b]) => t >= a && t < b);

// Fixed scripted timeline, a pure function of race time so every Hz sees the same inputs.
function timeline(t) {
  const cycle = t % 6;
  return {
    throttle: !within(t, [30, 31]),
    brake: within(t, [30, 31]),
    steer: within(cycle, [1, 1.5]) || within(t, [30, 31], [34, 36]) ? 1 : within(cycle, [3, 3.5]) || within(t, [33, 34]) ? -1 : 0,
    boost: within(t, [5, 8], [20, 22], [38, 40]),
    nitro: within(t, [10, 10.2], [10.6, 10.8], [25, 25.2]),
    fly: within(t, [12, 14], [26, 28]),
  };
}

const canonical = value => {
  if (typeof value === 'number') return value.toString();
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
};

function replayHash(trackId, config, hz, seconds, modifier = null) {
  const race = createRace(trackId, modifier ?? config);
  startRace(race);
  const dt = 1 / hz;
  for (let i = 0; race.phase === 'countdown' && i < hz * 5; i++) stepRace(race, {}, dt);
  for (let i = 0; i < hz * seconds; i++) stepRace(race, timeline(i / hz), dt);
  const { player, rivals, traffic, result, elapsed, phase } = race;
  return createHash('sha256').update(canonical({ player, rivals, traffic, result, elapsed, phase })).digest('hex');
}

const cases = [];
for (const id of [...Object.keys(RACE_TRACKS), FROSTBITE_ID])
  for (const hz of [30, 60, 120]) cases.push([`${id}|classic|${hz}`, () => replayHash(id, {}, hz, SECONDS)]);
// harbor-circuit is circuit-only (assertTrackMode rejects Classic there), so it is covered by the circuit run below.
for (const mode of MODES.filter(m => m !== 'classic' && m !== 'circuit'))
  cases.push([`coast|${mode}|60`, () => replayHash('coast', { mode }, 60, SECONDS)]);
cases.push([`${CIRCUIT_ID}|circuit|60`, () => replayHash(CIRCUIT_ID, { mode: 'circuit' }, 60, SECONDS)]);
for (const modifier of ['no-flight', 'double-traffic', 'gold-rings'])
  cases.push([`canyon|daily:${modifier}|60`, () => replayHash('canyon', {}, 60, SECONDS, modifier)]);

const fixture = !RECORD && existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {};
const recorded = {};
for (const [key, run] of cases) {
  test(`legacy replay ${key}`, () => {
    const hash = run();
    if (RECORD) { recorded[key] = hash; return; }
    assert.equal(hash, fixture[key], `${key} drifted from the recorded legacy replay`);
  });
}
test('replay fixture covers exactly the guarded keys', { skip: RECORD }, () => {
  assert.deepEqual(Object.keys(fixture).sort(), cases.map(([key]) => key).sort());
});
if (RECORD) test('write replay fixture', () => writeFileSync(FIXTURE, JSON.stringify(Object.fromEntries(Object.entries(recorded).sort()), null, 2) + '\n'));
