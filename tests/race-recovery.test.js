import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { ACTION_KEYS, DEFAULT_KEY_MAP, rebind, validateKeyMap } from '../src/key-map.ts';
import * as game from '../src/game.js';
import { placeCourseCar } from '../src/course-race.ts';
import { SKY_JUMPS } from '../src/sky-track.ts';
import { SKY_GAP_RECOVERY_RUNUP } from '../src/launch-ramps.ts';

function racing(track, config) {
  const race = createRace(track, config);
  race.phase = 'racing';
  return race;
}

const tick = (race, seconds = 1 / 60, input = {}) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) stepRace(race, input, 1 / 60);
};
const finishRecovery = race => {
  for (let i = 0; i < 120 && race.player.recovery; i++) tick(race);
  assert.ok(!race.player.recovery, 'control is handed back within two seconds');
};

for (const track of ['canyon', 'spiral']) test(`${track}: gravity precedes a rewind onto the approach road`, () => {
  const race = racing(track), car = race.player;
  const gap = RACE_TRACKS[track].sections.find(section => section.type === 'gap');
  Object.assign(car, { distance: gap.from - 0.1, x: 2.5, speed: 15 });
  tick(race);
  assert.equal(car.falls, 1);
  assert.ok(car.distance >= gap.from && car.distance < gap.to, 'still at the gap when the fall starts');
  tick(race, 0.2, { throttle: true, fly: true });
  const early = car.altitude;
  tick(race, 0.2, { throttle: true, fly: true });
  assert.ok(early < 0 && car.altitude - early < early, 'downward travel accelerates under gravity');
  assert.equal(car.thrusting, false);
  assert.equal(car.score, 0);
  assert.ok(race.rivals.some(rival => rival.distance > 0), 'the race continues around the recovering player');
  finishRecovery(race);
  if (track === 'spiral') assert.equal(car.distance, SKY_JUMPS[0].rampFrom - SKY_GAP_RECOVERY_RUNUP);
  else assert.ok(car.distance < gap.from - 20 && car.distance >= gap.from - 110);
  assert.deepEqual([car.altitude, car.verticalSpeed, car.x, car.falls], [0, 0, 0, 1]);
  tick(race, 0.2, { throttle: true });
  assert.ok(car.distance > car.fall.distance, 'throttle resumes from the approach');
});

test('manual recovery stays in the same race, pauses cleanly and never sweeps rewards', () => {
  const race = racing('coast', { mode: 'time' }), car = race.player;
  Object.assign(car, { distance: 350, x: 4, speed: 65, fuel: 28, nitro: 1 });
  const rewards = [car.score, car.rings, car.nitro, car.fuel];
  assert.equal(game.requestRaceReset?.(race), true);
  assert.equal(game.requestRaceReset?.(race), false, 'a second reset cannot restart recovery');
  race.phase = 'paused';
  tick(race, 1);
  assert.equal(car.distance, 350);
  assert.equal(race.elapsed, 0);
  race.phase = 'racing';
  finishRecovery(race);
  assert.ok(car.distance >= 310 && car.distance < 350);
  assert.deepEqual([car.x, car.altitude, car.falls, car.fall], [0, 0, 0, null]);
  assert.deepEqual([car.score, car.rings, car.nitro, car.fuel], rewards);
  assert.ok(race.elapsed > 0 && race.elapsed < 1);
  for (const phase of ['ready', 'countdown', 'paused', 'finished']) {
    race.phase = phase;
    assert.equal(game.requestRaceReset(race), false, phase);
  }
});

test('reset on a graph ground road retains the validated checkpoint and nearby edge', () => {
  const race = racing('skyfall-archipelago'), car = race.player, runtime = race.course;
  const edgeId = runtime.spec.graph.groundRoute[2];
  Object.assign(car, { distance: 1900, speed: 55, x: 3 });
  placeCourseCar(runtime, 'YOU', edgeId, 130, car);
  const checkpoint = runtime.cars.get('YOU').travel.nextCheckpoint;
  assert.equal(game.requestRaceReset?.(race), true);
  finishRecovery(race);
  const travel = runtime.cars.get('YOU').travel;
  assert.deepEqual([travel.currentEdgeId, travel.nextCheckpoint], [edgeId, checkpoint]);
  assert.ok(travel.localS < 130 && travel.localS > 90);
});

test('R is a fixed recovery shortcut and an older R binding preserves other custom keys', () => {
  assert.equal(ACTION_KEYS.KeyR, 'reset');
  assert.equal(rebind(DEFAULT_KEY_MAP, 'fly', 'KeyR').error, 'reserved');
  const migrated = validateKeyMap({ ...DEFAULT_KEY_MAP, throttle: ['KeyT'], fly: ['KeyR'] });
  assert.deepEqual(migrated.throttle, ['KeyT']);
  assert.deepEqual(migrated.fly, ['Space']);
});

test('a Canyon recovery leaves enough road to use FLY and clear the same gap', () => {
  const race = racing('canyon'), car = race.player;
  race.rivals = race.traffic = [];
  const { from, to } = RACE_TRACKS.canyon.sections.find(section => section.type === 'gap');
  Object.assign(car, { distance: from + .1, speed: 65, fuel: 75 });
  tick(race);
  finishRecovery(race);
  for (let i = 0; i < 480 && car.distance < to + 5; i++) {
    tick(race, 1 / 60, { throttle: true, fly: car.distance >= from - 53 && car.distance < to });
  }
  assert.equal(car.falls, 1);
  assert.ok(car.distance >= to + 5);
});

test('a reset across a circuit sector keeps its split and allows the next sweep', () => {
  const race = racing('harbor-circuit', { mode: 'circuit', laps: 1 });
  race.rivals = race.traffic = [];
  const driver = race.circuit.player;
  for (let i = 0; i < 3600 && driver.nextSector === 1; i++) tick(race, 1 / 60, { throttle: true });
  assert.equal(driver.nextSector, 2);
  const firstSplit = driver.splits[0], crossed = race.player.distance;
  assert.equal(game.requestRaceReset(race), true);
  finishRecovery(race);
  assert.ok(race.player.distance < crossed);
  assert.deepEqual(driver.splits, [firstSplit]);
  for (let i = 0; i < 7200 && race.phase === 'racing'; i++) tick(race, 1 / 60, { throttle: true });
  assert.equal(driver.valid, true);
  assert.equal(race.phase, 'finished');
  assert.equal(race.result.lapTimes[0].splits[0], firstSplit);
});
