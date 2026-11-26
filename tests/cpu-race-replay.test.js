import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { createRaceAudioEvents } from '../src/race-audio-events.ts';
import { seededRng } from '../src/rng.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { DUNE_TEMPEST_ID } from '../src/courses/dune-tempest-race.ts';
import { SKYFALL_ARCHIPELAGO_ID } from '../src/courses/skyfall-archipelago-race.ts';

// Wave 1 / workstream 14 CPU guard: a seeded, input-scripted race replay for every runtime family. Any CPU
// optimisation of the simulation, AI, collisions, route lookups or the audio *event* layer must leave this digest
// byte-identical. The digest folds in the FULL race state every DIGEST_EVERY ticks (player, rivals, traffic, rings,
// pickups, hazards, course runtime, standings, results) plus every cue emitted by createRaceAudioEvents.
// Regenerate only for an intended behaviour change: RECORD_REPLAY=1 node --test tests/cpu-race-replay.test.js
const FIXTURE = new URL('./fixtures/cpu-race-replay.json', import.meta.url);
const RECORD = process.env.RECORD_REPLAY === '1';
const DIGEST_EVERY = 15, MAX_SECONDS = 150, HZ = 60;

// Seeded input script: each control holds for a random 0.2-1.8 s span, so steering, boost, nitro, fly, brake and lane
// assist are all exercised (falls, rail scrapes, contacts, pickups) yet reproducible per seed.
function scriptedInput(rng) {
  let left = 0, held = {};
  return () => {
    if (left-- <= 0) {
      left = Math.floor(12 + rng() * 96);
      const roll = rng();
      held = {
        throttle: roll > 0.08, brake: roll < 0.08,
        steer: rng() < 0.45 ? 0 : (rng() - 0.5) * 2 * (rng() < 0.3 ? 1.6 : 1),
        boost: rng() < 0.35, nitro: rng() < 0.25, fly: rng() < 0.3, laneAssist: rng() < 0.5,
      };
    }
    return held;
  };
}

// Cycle-safe canonical serialisation; `spec` (the immutable course description) is skipped, everything mutable is kept.
function canonical(value, seen = new WeakSet()) {
  if (typeof value === 'number') return Object.is(value, -0) ? '-0' : String(value);
  if (value === undefined) return 'u';
  if (typeof value === 'function') return 'fn';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (seen.has(value)) return '<cycle>';
  seen.add(value);
  let out;
  if (value instanceof Map) out = `M[${[...value].map(([k, v]) => `${canonical(k, seen)}=>${canonical(v, seen)}`).join(',')}]`;
  else if (value instanceof Set) out = `S[${[...value].map(v => canonical(v, seen)).join(',')}]`;
  else if (Array.isArray(value)) out = `[${value.map(v => canonical(v, seen)).join(',')}]`;
  else out = `{${Object.keys(value).sort().filter(k => k !== 'spec').map(k => `${k}:${canonical(value[k], seen)}`).join(',')}}`;
  seen.delete(value);
  return out;
}

function replay(trackId, config, seed) {
  const race = createRace(trackId, config);
  const events = createRaceAudioEvents(), hash = createHash('sha256'), cues = createHash('sha256');
  const input = scriptedInput(seededRng(seed, 'cpu-replay')), dt = 1 / HZ;
  let ticks = 0, cueCount = 0;
  startRace(race);
  const audioFrame = () => {
    const frame = events.update(race, true);
    cues.update(canonical([frame.silence, frame.active, frame.boosting, frame.sounds]));
    cueCount += frame.sounds.length;
  };
  for (let i = 0; race.phase === 'countdown' && i < HZ * 6; i++) { stepRace(race, {}, dt); audioFrame(); }
  while ((race.phase === 'racing' || race.phase === 'paused') && ticks < MAX_SECONDS * HZ) {
    stepRace(race, input(), dt); audioFrame();
    if (++ticks % DIGEST_EVERY === 0) hash.update(canonical(race));
  }
  hash.update(canonical(race));
  const { player, rivals, result } = race;
  return {
    digest: hash.digest('hex'), cueDigest: cues.digest('hex'), ticks, phase: race.phase, elapsed: Number(race.elapsed.toFixed(6)),
    result: result && { time: result.time, position: result.position, stars: result.stars, score: Math.round(result.score), success: result.success ?? null },
    cues: cueCount,
    player: { collisions: player.collisions, falls: player.falls, nearMisses: player.nearMisses, score: Math.round(player.score), distance: Number(player.distance.toFixed(4)) },
    pickupsTaken: race.pickups.filter(p => p.taken).length, ringsHit: race.rings.filter(r => r.hit).length,
    rivalFinish: rivals.map(r => r.finishTime == null ? null : Number(r.finishTime.toFixed(6))),
    rivalDistance: rivals.map(r => Number(r.distance.toFixed(3))),
    standings: race.course?.standings?.map(s => s.id) ?? null,
  };
}

const cases = [];
for (const id of Object.keys(RACE_TRACKS)) cases.push([`${id}|classic`, () => replay(id, {}, 12345)]);
cases.push([`${DUNE_TEMPEST_ID}|time`, () => replay(DUNE_TEMPEST_ID, { mode: 'time' }, 12345)]);
cases.push([`${SKYFALL_ARCHIPELAGO_ID}|time`, () => replay(SKYFALL_ARCHIPELAGO_ID, { mode: 'time' }, 12345)]);
cases.push([`${DUNE_TEMPEST_ID}|time-seed2`, () => replay(DUNE_TEMPEST_ID, { mode: 'time' }, 777)]);
cases.push([`${DUNE_TEMPEST_ID}|classic`, () => replay(DUNE_TEMPEST_ID, {}, 12345)]);
cases.push([`${SKYFALL_ARCHIPELAGO_ID}|classic`, () => replay(SKYFALL_ARCHIPELAGO_ID, {}, 12345)]);
cases.push([`coast|elimination`, () => replay('coast', { mode: 'elimination' }, 12345)]);
cases.push([`coast|checkpoint`, () => replay('coast', { mode: 'checkpoint' }, 12345)]);
cases.push([`${CIRCUIT_ID}|circuit`, () => replay(CIRCUIT_ID, { mode: 'circuit' }, 12345)]);

const fixture = !RECORD && existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {};
const recorded = {};
for (const [key, run] of cases) {
  test(`cpu replay ${key}`, () => {
    const outcome = JSON.parse(JSON.stringify(run()));
    if (RECORD) { recorded[key] = outcome; return; }
    assert.deepEqual(outcome, fixture[key], `${key} drifted from the recorded replay`);
  });
}
test('cpu replay fixture covers exactly the guarded keys', { skip: RECORD }, () => {
  assert.deepEqual(Object.keys(fixture).sort(), cases.map(([key]) => key).sort());
});
test('cpu replay is itself deterministic and exercises collisions, pickups and finishes', { skip: RECORD }, () => {
  assert.deepEqual(JSON.parse(JSON.stringify(replay('coast', {}, 12345))), fixture['coast|classic']);
  const all = Object.values(fixture);
  assert.ok(all.some(r => r.player.collisions > 0), 'some replay must hit something');
  assert.ok(all.some(r => r.pickupsTaken > 0) && all.some(r => r.ringsHit > 0), 'some replay must collect items');
  assert.ok(all.some(r => r.phase === 'finished'), 'some replay must finish');
});
if (RECORD) test('write cpu replay fixture', () => writeFileSync(FIXTURE, JSON.stringify(Object.fromEntries(Object.entries(recorded).sort()), null, 2) + '\n'));
