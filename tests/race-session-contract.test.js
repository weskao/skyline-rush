import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRaceConfig, rulesSignature, validateRaceRequest } from '../src/race-config.ts';
import { createRaceSessionContract } from '../src/race-session.ts';
import { createRace, RACE_TRACKS } from '../src/game.js';
import { RACE_STREAMS, seededRng } from '../src/rng.js';

test('MODE-00: strict user config rejects unsupported combinations and malformed values', () => {
  const invalid = [
    { mode: 'classic', rivals: 0 },
    { mode: 'time', traffic: 'heavy' },
    { mode: 'free', difficulty: 'hard' },
    { mode: 'custom', rivals: 4 },
    { mode: 'custom', rivals: -1 },
    { mode: 'custom', rivals: 1.5 },
    { mode: 'custom', traffic: 'extremely-heavy' },
    { mode: 'custom', items: 'false' },
    { mode: 'custom', activeItems: true, items: false },
    { mode: 'custom', collision: 'invincible' },
    { mode: 'custom', difficulty: 'expert' },
    { mode: 'custom', stages: 4 },
    { mode: 'time', clean: 1 },
    { mode: 'stunt', duration: 123 },
    { mode: 'gauntlet', hazardTier: 'unknown' },
    { mode: 'cup', cupTracks: ['coast', 'coast', 'neon'] },
    { mode: 'cup', cupTracks: ['coast', 'neon'] },
    { mode: 'custom', unknown: true },
    { mode: 'classic', rulesVersion: 2 },
    { mode: 'elimination', duration: 120 },
    { mode: 'custom', seed: 9999 },
  ];
  for (const input of invalid) assert.throws(() => validateRaceRequest(input), undefined, JSON.stringify(input));
  assert.throws(() => validateRaceRequest(null), /object/i);
  assert.throws(() => validateRaceRequest([]), /object/i);
  assert.throws(() => validateRaceRequest({ mode: '??' }), /mode/i);
});

test('MODE-00: strict requests accept exact eligible values without affecting legacy normalization', () => {
  const cases = [
    { mode: 'classic' },
    { mode: 'custom', rivals: 0, traffic: 'off', items: false, collision: 'relaxed', stages: 5 },
    { mode: 'free', traffic: 'light', items: true, activeItems: true },
    { mode: 'time', clean: true },
    { mode: 'stunt', duration: 300 },
    { mode: 'gauntlet', hazardTier: 'extreme' },
    { mode: 'cup', cupTracks: ['coast', 'neon', 'canyon'] },
    { mode: 'checkpoint' },
    { mode: 'elimination' },
  ];
  for (const input of cases) {
    const normalized = validateRaceRequest(input);
    assert.deepEqual(normalized, normalizeRaceConfig(input));
    assert.deepEqual(JSON.parse(JSON.stringify(normalized)), normalized);
  }
  assert.equal(normalizeRaceConfig({ mode: 'custom', rivals: 99 }).rivals, 3,
    'legacy configuration normalization remains tolerant for existing saved settings');
  assert.throws(() => validateRaceRequest(
    { mode: 'cup', cupTracks: ['coast', 'neon', 'wrong-track'] },
    { availableTracks: Object.keys(RACE_TRACKS) },
  ), /track/i);
});

test('MODE-00: session contract is serializable, immutable and separates game rules from visuals', () => {
  const config = normalizeRaceConfig({ mode: 'custom', rivals: 0, traffic: 'light', stages: 3 });
  const base = createRaceSessionContract('coast', 1001, config);
  const visuals = createRaceSessionContract('coast', 1001, config, {
    ghostEnabled: false, visualPreset: 'night',
  });
  assert.equal(base.contractVersion, 1);
  assert.equal(base.trackId, 'coast');
  assert.equal(base.seed, 1001);
  assert.equal(base.mode, 'custom');
  assert.equal(base.simulation.rivalCount, 0);
  assert.equal(base.simulation.trafficDensity, 'light');
  assert.equal(base.simulation.stageCount, 3);
  assert.equal(base.objective.type, 'placement');
  assert.deepEqual(base.simulation, visuals.simulation, 'purely visual options must not change gameplay');
  assert.equal(base.rulesSignature, visuals.rulesSignature, 'ghost toggle and color theme do not split scoreboards');
  assert.equal(base.rulesSignature, rulesSignature(config));
  assert.notDeepEqual(base.presentation, visuals.presentation);
  for (const data of [base, base.simulation, base.presentation, base.objective]) {
    assert.equal(Object.isFrozen(data), true);
    assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
  }
  assert.throws(() => createRaceSessionContract('coast', NaN, config), /seed/i);
  assert.throws(() => createRaceSessionContract('coast', -1, config), /seed/i);
  assert.throws(() => createRaceSessionContract('coast', 2 ** 32, config), /seed/i);
  assert.throws(() => createRaceSessionContract('../coast', 1001, config), /track/i);
  assert.throws(() => createRaceSessionContract('coast', 1001, config, { ghostEnabled: 'no' }), /ghost/i);
  assert.throws(() => createRaceSessionContract('coast', 1001, config, { visualPreset: 'weather-engine-not-implemented' }), /preset/i);
});

test('MODE-00: frozen cup tracks cannot silently rewrite a session best/ghost rules signature', () => {
  const raw = ['coast', 'neon', 'canyon'];
  const config = validateRaceRequest({ mode: 'cup', cupTracks: raw });
  raw[0] = 'cosmic';
  assert.deepEqual(config.cupTracks, ['coast', 'neon', 'canyon']);
  assert.equal(Object.isFrozen(config.cupTracks), true);
  const before = rulesSignature(config);
  assert.throws(() => { config.cupTracks[0] = 'cosmic'; }, TypeError);
  assert.equal(rulesSignature(config), before);
});

test('MODE-00: the live ten-track simulation exposes stable session identity and finite generated entities', () => {
  for (const [trackId, track] of Object.entries(RACE_TRACKS)) {
    const race = createRace(trackId);
    const second = createRace(trackId);
    assert.equal(race.session.trackId, trackId);
    assert.equal(race.session.seed, track.seed);
    assert.equal(race.session.mode, 'classic');
    assert.deepEqual(race.session.objective, race.objective);
    assert.deepEqual(race.pickups, second.pickups);
    assert.deepEqual(race.rings, second.rings);
    assert.deepEqual(race.traffic, second.traffic);
    assert.ok(race.pickups.length < 500);
    assert.ok(race.rings.length < 100);
    assert.ok(race.traffic.length < 200);
    for (const entity of [...race.pickups, ...race.rings, ...race.traffic]) {
      assert.ok([entity.distance, entity.x, ...(entity.altitude === undefined ? [] : [entity.altitude])]
        .every(Number.isFinite), trackId);
    }
  }
});

test('MODE-00: named random streams stay stable and independent of each other', () => {
  for (const stream of ['pickups', 'rings', 'hazards']) {
    assert.equal(typeof RACE_STREAMS[stream], 'string');
    assert.ok(RACE_STREAMS[stream].length > 0);
  }
  const first = seededRng(1001, RACE_STREAMS.rings);
  const baseline = Array.from({ length: 8 }, () => first());
  const noise = seededRng(1001, RACE_STREAMS.pickups);
  for (let i = 0; i < 1000; i++) noise();
  const again = seededRng(1001, RACE_STREAMS.rings);
  assert.deepEqual(Array.from({ length: 8 }, () => again()), baseline);
  const pickup = seededRng(1001, RACE_STREAMS.pickups);
  assert.notDeepEqual(Array.from({ length: 8 }, () => pickup()), baseline);
});

test('MODE-00: direct session requests fail closed, but normalized legacy calls remain compatible', () => {
  assert.throws(() => createRaceSessionContract('coast', 1001,
    { mode: 'time', rivals: 3 }), /rivals/i);
  assert.throws(() => createRaceSessionContract('coast', 1001,
    { mode: 'custom', items: false, activeItems: true }), /activeItems/i);
  assert.throws(() => createRaceSessionContract('coast', 1001,
    { mode: 'cup', cupTracks: ['coast', 'coast', 'neon'] }), /cupTracks/i);
  const normalized = normalizeRaceConfig({ mode: 'time', rivals: 3 });
  const built = createRaceSessionContract('coast', 1001, normalized);
  assert.equal(built.simulation.rivalCount, 0);
  assert.equal(built.mode, 'time');
  const direct = createRaceSessionContract('coast', 1001, { mode: 'time', clean: true });
  assert.equal(direct.mode, 'time');
  assert.equal(direct.objective.type, 'finish-time');
});
