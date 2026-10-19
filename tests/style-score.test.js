import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace } from '../src/game.js';

const raceAtSpeed = () => {
  const race = createRace();
  race.phase = 'racing';
  race.traffic = []; race.rivals = []; race.pickups = []; race.rings = [];
  race.player.speed = 60;
  return race;
};

test('style awards a collected ring once and a completed line separately', () => {
  const race = raceAtSpeed();
  race.rings = [{ distance: 1, x: 2.5, altitude: 0, radius: 4.8, type: 'charge', group: 0 }];
  stepRace(race, {}, 1 / 60);
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.score, 650); // 150 for the ring, 500 for PERFECT LINE
});

test('a close pass scores its combo and drifting doubles that combo', () => {
  for (const [input, want] of [[{}, 100], [{ brake: true, steer: 0.1 }, 200]]) {
    const race = raceAtSpeed();
    race.traffic = [{ distance: -4, x: 0, speed: 0 }];
    stepRace(race, input, 1 / 60);
    assert.equal(race.player.score, want);
  }
});

test('airtime pays per second only while moving; pause cannot farm points', () => {
  const race = raceAtSpeed();
  race.player.altitude = 10;
  for (let i = 0; i < 60; i++) stepRace(race, { fly: true }, 1 / 60);
  assert.ok(Math.abs(race.player.score - 10) < 1e-6);
  race.phase = 'paused';
  stepRace(race, {}, 0.1);
  assert.ok(Math.abs(race.player.score - 10) < 1e-6);
  race.phase = 'racing'; race.player.speed = 0;
  stepRace(race, {}, 0.1);
  assert.ok(Math.abs(race.player.score - 10) < 1e-6);
});

test('clean driving pays every 500 metres; contacts and gap falls reset progress', () => {
  const clean = raceAtSpeed();
  for (let i = 0; i < 600; i++) stepRace(clean, { throttle: true }, 1 / 60);
  assert.equal(clean.player.score, 100);
  const crash = raceAtSpeed();
  crash.player.cleanDistance = 499;
  crash.traffic = [{ distance: 1, x: 2.5, speed: 0 }];
  stepRace(crash, {}, 1 / 60);
  assert.equal(crash.player.score, 0);
  assert.equal(crash.player.cleanDistance, 0);
  const fall = raceAtSpeed();
  fall.sections = [{ from: 0, to: 1000, type: 'gap' }];
  fall.player.cleanDistance = 499;
  stepRace(fall, {}, 1 / 60);
  assert.equal(fall.player.score, 0);
  assert.equal(fall.player.cleanDistance, 0);
});

test('finish stars reflect style per kilometre and are independent of race position', () => {
  for (const [score, want] of [[0, 1], [1249, 1], [1249.4, 1], [1249.6, 2], [1250, 2], [2499, 2], [2499.4, 2], [2499.6, 3], [2500, 3]]) {
    const race = raceAtSpeed();
    Object.assign(race.player, { distance: 4999.5, score });
    stepRace(race, {}, 1 / 60);
    assert.equal(race.result.stars, want);
    assert.equal(race.result.score, Math.round(score));
  }
});
