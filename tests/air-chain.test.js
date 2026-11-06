import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace } from '../src/game.js';
import { earnsAirChain, CHAIN_HARD_LANDING } from '../src/air-chain.ts';

const DT = 1 / 60;
function flyToCeilingAndGlide() {
  const race = createRace('coast', { mode: 'free', traffic: 'off', items: false, collision: 'relaxed' });
  race.rings = []; race.rivals = []; race.traffic = [];
  startRace(race);
  const car = race.player;
  car.speed = 60;
  for (let i = 0; i < 240; i++) stepRace(race, { throttle: true, fly: true, boost: true, laneAssist: false }, DT);
  const peak = car.altitude;
  for (let i = 0; i < 600 && !car.landing; i++) stepRace(race, { throttle: true, laneAssist: false }, DT);
  return { peak, landing: car.landing };
}

test('an unpowered glide from the flight ceiling still lands an AIR→ROAD CHAIN', () => {
  const { peak, landing } = flyToCeilingAndGlide();
  assert.ok(peak > 11, `the climb reaches the ceiling (peak ${peak})`);
  assert.ok(landing, 'the car lands');
  assert.ok(landing.speed > 11 && landing.speed < CHAIN_HARD_LANDING, `glide touchdown ${landing.speed} m/s`);
  assert.equal(landing.chain, true, 'a released-FLY glide from 12 m counts as a smooth landing');
});

test('the chain rule still needs boosted powered flight, speed and a non-crash landing', () => {
  const base = { poweredFlightTime: .5, flightBoosted: true, verticalSpeed: -12.9, speed: 60 };
  assert.equal(earnsAirChain(base, 45), true);
  assert.equal(earnsAirChain({ ...base, flightBoosted: false }, 45), false);
  assert.equal(earnsAirChain({ ...base, poweredFlightTime: .3 }, 45), false);
  assert.equal(earnsAirChain({ ...base, speed: 40 }, 45), false);
  assert.equal(earnsAirChain({ ...base, verticalSpeed: -16 }, 45), false, 'a FLY-held fall on empty fuel is too hard');
});
