import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRaceConfig, rulesSignature, validateRaceRequest, MODES } from '../src/race-config.ts';
import { createRaceSessionContract } from '../src/race-session.ts';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { RACE_STREAMS, seededRng } from '../src/rng.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';

test('MODE-00: strict user config rejects unsupported combinations and malformed values', () => {
  const invalid = [
    { mode: 'classic', rivals: 0 },
    { mode: 'time', traffic: 'heavy' },
    { mode: 'free', difficulty: 'hard' },
    { mode: 'custom', rivals: 8 },
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
  assert.equal(normalizeRaceConfig({ mode: 'custom', rivals: 99 }).rivals, 7,
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

const scripted = i => ({ throttle: i % 400 < 340, brake: i % 400 >= 370, steer: Math.sin(i / 45), nitro: i % 300 < 20, fly: i % 500 > 480 });
const snapshot = race => JSON.stringify({ phase: race.phase, elapsed: race.elapsed, result: race.result,
  cars: [race.player, ...race.rivals, ...race.traffic].map(car => [car.distance, car.x, car.altitude ?? 0, car.speed, car.collisions ?? 0, car.score ?? 0]) });
const drive = (trackId, mode, steps) => {
  const race = createRace(trackId, mode === 'classic' ? undefined : { mode });
  startRace(race);
  for (let i = 0; i < steps; i++) stepRace(race, scripted(i), 1 / 60);
  return race;
};

test('9A: every mode replays bit-for-bit from the same track, rules and input sequence', () => {
  for (const trackId of Object.keys(RACE_TRACKS)) for (const mode of MODES) {
    if (mode === 'endless' && trackId !== 'coast') continue; // Coast only: see the Endless contract below
    if (mode === 'circuit') continue; // its own route only: see the Circuit contract below
    assert.equal(snapshot(drive(trackId, mode, 600)), snapshot(drive(trackId, mode, 600)), `${trackId} ${mode}`);
  }
});

test('9A: every finishing mode, Free Drive included, settles a finite result at the end of all ten courses', () => {
  for (const trackId of Object.keys(RACE_TRACKS)) for (const mode of MODES) {
    if (mode === 'endless') continue; // open road: it has no road end to finish at (contract below)
    if (mode === 'circuit') continue; // finishes on valid laps of its own route (contract below)
    const race = drive(trackId, mode, 240);
    race.rivals.forEach(rival => { rival.distance = 100; });
    Object.assign(race.player, { distance: race.length - 1, speed: 80 });
    // Elimination ends on its 10 s knockout clock, not at the road end; 40 s bounds every mode.
    for (let i = 0; i < 2400 && race.phase === 'racing'; i++) stepRace(race, { throttle: true }, 1 / 60);
    assert.equal(race.phase, 'finished', `${trackId} ${mode}`);
    assert.ok(Number.isFinite(race.result.time) && race.result.time > 0, `${trackId} ${mode} time`);
    assert.ok(race.player.distance <= race.length, `${trackId} ${mode} stays on the authored road`);
  }
});

test('9A: Endless supports each track, continues past authored finishes, and ends on collisions only', () => {
  for(const trackId of Object.keys(RACE_TRACKS)){
    const race=createRace(trackId,{mode:'endless'});
    assert.equal(race.trackId,trackId);
    assert.ok(race.endless,trackId);
    assert.equal(race.sections.length,0,trackId+' has no finite gap obstacles');
  }
  const race = drive('coast', 'endless', 240);
  Object.assign(race.player, { distance: RACE_TRACKS.coast.length - 1, speed: 80, collisions: 0 });
  race.player.effects.ghost = 10; // drive through traffic so only the road end is being tested
  for (let i = 0; i < 120; i++) stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.phase, 'racing');
  assert.ok(race.player.distance > RACE_TRACKS.coast.length, 'no finish line at the authored road end');
  race.player.effects.ghost = 0;
  Object.assign(race.player, { collisions: 4, cooldown: 0, x: 10.1, speed: 80, steering: 1 });
  stepRace(race, { throttle: true, steer: 1 }, .1);
  assert.deepEqual([race.phase, race.result.endReason, race.result.collisions], ['finished', 'collisions', 5]);
  assert.ok(Number.isFinite(race.result.distance) && race.result.distance > RACE_TRACKS.coast.length);
});

test('9A: Circuit runs only on its own route, replays bit-for-bit and finishes on valid laps, never on a teleport', () => {
  for (const trackId of Object.keys(RACE_TRACKS)) assert.throws(() => createRace(trackId, { mode: 'circuit' }), /circuit route/, trackId);
  for (const mode of MODES) if (mode !== 'circuit') assert.throws(() => createRace(CIRCUIT_ID, mode === 'classic' ? undefined : { mode }), /circuit route/, mode);
  assert.equal(snapshot(drive(CIRCUIT_ID, 'circuit', 600)), snapshot(drive(CIRCUIT_ID, 'circuit', 600)));
  const teleport = createRace(CIRCUIT_ID, { mode: 'circuit', laps: 1 });
  startRace(teleport);
  Object.assign(teleport, { phase: 'racing' });
  Object.assign(teleport.player, { distance: teleport.length - 1, speed: 88 });
  stepRace(teleport, { throttle: true }, .1);
  assert.equal(teleport.phase, 'racing', 'jumping to the line is not a lap');
  const race = createRace(CIRCUIT_ID, { mode: 'circuit', laps: 1 });
  race.phase = 'racing'; race.pickups = []; race.rings = []; race.player.x = 2.5;
  while (race.phase === 'racing' && race.elapsed < 120) stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.phase, 'finished');
  assert.equal(race.result.lapTimes.length, 1);
  assert.ok(Number.isFinite(race.result.time) && race.result.time > 0);
});
