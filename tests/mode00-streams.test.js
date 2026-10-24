import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRng, RACE_STREAMS, streamSeed } from '../src/rng.js';
import { createRace, RACE_TRACKS } from '../src/game.js';
import { createRaceSessionContract } from '../src/race-session.js';
import { createHazards } from '../src/hazards.js';
import { createCheckpointRush } from '../src/checkpoint-rush.js';

// RED: every gameplay subsystem has its own version-stable seed.
test('MODE-00: traffic, checkpoints, obstacles and items have independent uint32 seeds', () => {
  const required = ['pickups', 'rings', 'hazards', 'traffic', 'checkpoints', 'obstacles', 'items', 'mysteryPrefix'];
  const names = required.map(key => RACE_STREAMS[key]);
  assert.ok(names.every(name => typeof name === 'string' && name.length > 0));
  assert.equal(new Set(names).size, names.length);
  assert.equal(RACE_STREAMS.pickups, 'pickups');
  assert.equal(RACE_STREAMS.rings, 'rings');
  assert.equal(RACE_STREAMS.hazards, 'gauntlet-hazards');
  assert.equal(RACE_STREAMS.mysteryPrefix, 'mystery');
  const seeds = required.map(key => streamSeed(1001, RACE_STREAMS[key]));
  assert.equal(new Set(seeds).size, seeds.length);
  assert.ok(seeds.every(seed => Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff));
  const session = createRaceSessionContract('coast', 1001);
  for (const key of required) assert.equal(session.randomSeeds[key], streamSeed(1001, RACE_STREAMS[key]));
  assert.equal(Object.isFrozen(session.randomSeeds), true);
  assert.deepEqual(JSON.parse(JSON.stringify(session.randomSeeds)), session.randomSeeds);
});

test('MODE-00: consuming one random stream never shifts any other seeded stream', () => {
  const keys = ['traffic', 'checkpoints', 'obstacles', 'items', 'pickups', 'rings'];
  const baseline = Object.fromEntries(keys.map(key => {
    const next = seededRng(1001, RACE_STREAMS[key]);
    return [key, Array.from({length: 10}, next)];
  }));
  for (const key of keys) {
    const noise = seededRng(1001, RACE_STREAMS[key]);
    for (let n = 0; n < 500; n++) noise();
    for (const other of keys.filter(item => item !== key)) {
      const next = seededRng(1001, RACE_STREAMS[other]);
      assert.deepEqual(Array.from({length: 10}, next), baseline[other], key + ' changed ' + other);
    }
  }
});

test('MODE-00: all ten courses generate finite, bounded and replayable entities', () => {
  assert.equal(Object.keys(RACE_TRACKS).length, 10);
  const lanes = [-7.5, -2.5, 2.5, 7.5];
  for (const [trackId, track] of Object.entries(RACE_TRACKS)) {
    const one = createRace(trackId), two = createRace(trackId);
    const checkpoint = createCheckpointRush(track);
    const hazards = createHazards(track, lanes);
    assert.deepEqual(one.pickups, two.pickups, trackId);
    assert.deepEqual(one.rings, two.rings, trackId);
    assert.deepEqual(one.traffic, two.traffic, trackId);
    assert.deepEqual(checkpoint, createCheckpointRush(track), trackId);
    assert.deepEqual(hazards, createHazards(track, lanes), trackId);
    assert.ok(one.pickups.length < 500 && one.rings.length < 100 &&
      one.traffic.length < 200 && checkpoint.gates.length < 300 && hazards.length < 500, trackId);
    for (const entity of [...one.pickups, ...one.rings, ...one.traffic, ...checkpoint.gates, ...hazards]) {
      assert.ok(Number.isFinite(entity.distance) && Number.isFinite(entity.x) &&
        (entity.altitude === undefined || Number.isFinite(entity.altitude)), trackId);
    }
    assert.ok(checkpoint.gates.every(gate => gate.distance > 0 && gate.distance < track.length), trackId);
    assert.ok(hazards.every(hazard => hazard.distance > 0 && hazard.distance < track.length), trackId);
  }
});

test('MODE-00: invalid external geometry cannot create an unbounded or nonfinite course', () => {
  assert.throws(() => createCheckpointRush({ length: 150000, sections: [] }), /track|length|limit/i);
  assert.throws(() => createCheckpointRush({ length: 5000, sections: [{from: NaN, to: 900, type: 'tunnel'}] }), /section|track|finite/i);
  assert.throws(() => createHazards({seed: 1001, length: 150000, sections: []}, [-2.5, 2.5]), /track|length|limit/i);
  assert.throws(() => createHazards({seed: 1001, length: 5000, sections: []}, [NaN, 2.5]), /lane|track|finite/i);
});
