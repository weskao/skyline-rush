import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playResultFeedback } from '../src/result-audio.ts';
import { createCup, addCupResult } from '../src/championship-cup.ts';

const record = { record:true, medals:[], challengeMedals:[], unlockedTrack:false, series:{cup:null} };
const reward = { status:'completed', deltaDemoPoints:20, missionReady:true };
const play = (race, result, receipt = null) => {
  const heard = [];
  playResultFeedback((name, delay) => heard.push([name, delay]), race, result, receipt, .18);
  return heard;
};

test('Last Driver Standing victory takes precedence over other accomplishments', () => {
  assert.deepEqual(play({ mode:'elimination', result:{ success:true } }, { ...record, unlockedTrack:true }, reward),
    [['victory', .18], ['reward-mission-ready', 1.9]]);
});

test('Classic first place with rivals gets the victory stinger', () => {
  assert.deepEqual(play({ mode:'classic', rivals:[{}], result:{ success:true, position:1 } }, record), [['victory', .18]]);
  assert.deepEqual(play({ mode:'classic', rivals:[], result:{ success:true, position:1 } }, record), [['record-earned', .18]]);
});

test('championship victory plays on the last heat only', () => {
  let cup = createCup(['coast', 'spiral', 'neon'], 'coast');
  for (const trackId of cup.tracks) {
    cup = addCupResult(cup, { trackId, phase:'finished', length:5000, elapsed:60, result:{ time:60 },
      rivals:['NOVA','ORBIT','APEX'].map(name => ({name, distance:4800, speed:65})) });
    const race = { mode:'cup', result:{ success:true } };
    assert.deepEqual(play(race, { ...record, intermediateStage:cup.results.length < 3, series:{cup} }),
      cup.results.length === 3 ? [['victory', .18]] : []);
  }
});

test('a new achievement plays first and positive credit follows with the combined mission sound', () => {
  assert.deepEqual(play({ mode:'time', result:{ success:true } }, { ...record, medals:['clean'] }, reward),
    [['achievement-earned', .18], ['reward-mission-ready', 1.1]]);
});

test('failed and duplicate results never sound as a reward', () => {
  assert.deepEqual(play({ mode:'time', result:{ success:false } }, record, reward), []);
  assert.deepEqual(play({ mode:'time', result:{ success:true } }, { ...record, record:false },
    { ...reward, status:'duplicate' }), []);
});
