import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace } from '../src/game.js';

const advance = (race, seconds, input = {throttle:true}) => {
  for (let t = 0; t < seconds; t += 0.05) stepRace(race, input, .05);
};

test('new race sessions keep classic and daily layouts unchanged', () => {
  const classic = createRace('coast');
  assert.equal(classic.config.mode, 'classic');
  assert.equal(classic.rivals.length, 3);
  assert.equal(classic.traffic.length, 36);
  assert.equal(classic.modifier, null);
  const daily = createRace('coast', 'double-traffic');
  assert.equal(daily.modifier, 'double-traffic');
  assert.equal(daily.traffic.length, 72);
});

test('custom sessions honor 0 AI, no traffic and disabled pickups', () => {
  const race = createRace('coast', {mode:'custom', rivalCount:0, trafficDensity:'off', itemsEnabled:false});
  assert.equal(race.config.mode, 'custom');
  assert.equal(race.rivals.length,0);
  assert.equal(race.traffic.length,0);
  assert.equal(race.pickups.length,0);
  assert.equal(race.rings.length,0);
  startRace(race);
  advance(race,5);
  assert.equal(race.phase,'racing');
});

test('custom hard rivals are faster than easy rivals after acceleration', () => {
  const easy = createRace('coast', {mode:'custom', aiDifficulty:'easy'});
  const hard = createRace('coast', {mode:'custom', aiDifficulty:'hard'});
  startRace(easy); startRace(hard);
  advance(easy, 16); advance(hard,16);
  assert.ok(hard.rivals[0].distance > easy.rivals[0].distance);
});

test('free drive remains non-ranking at the authored route end', () => {
  const race = createRace('coast',{mode:'free', trafficDensity:'off'});
  assert.equal(race.rivals.length,0);
  startRace(race);
  advance(race,4);
  race.player.distance = race.length-1;
  race.player.speed = 40;
  stepRace(race,{throttle:true},.05);
  assert.equal(race.player.distance,race.length);
  assert.equal(race.phase,'racing');
  assert.equal(race.result,null);
  stepRace(race,{throttle:true},.05);
  assert.equal(race.player.distance,race.length);
});

test('time attack keeps normal finish semantics but runs solo', () => {
  const race = createRace('coast',{mode:'time',trafficDensity:'off'});
  startRace(race);
  advance(race,4);
  race.player.speed=60;
  race.player.distance=race.length-1;
  stepRace(race,{throttle:true},.05);
  assert.equal(race.phase,'finished');
  assert.equal(race.result.position,1);
});
