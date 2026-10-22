import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStuntAttack, scoreStuntAttack } from '../src/stunt-attack.js';
const car = () => ({ speed: 65, altitude: 0, collisions: 0, falls: 0, nearMisses: 0, rings: 0 });
test('new drift, near miss and ring events build bounded style multiplier', () => {
  const state = createStuntAttack(), c = car();
  c.nearMisses = 1;
  assert.equal(scoreStuntAttack(state, c, 100, .1, 1), 20);
  assert.equal(state.combo, 1);
  c.rings = 1;
  assert.equal(scoreStuntAttack(state, c, 100, .1, 2), 40);
  c.driftPayout = {time: 2.4};
  assert.equal(scoreStuntAttack(state, c, 100, .1, 2.5), 60);
  assert.equal(scoreStuntAttack(state, c, 100, .1, 2.7), 60);
  assert.equal(state.combo,3);
});
test('clean landing grants a once-only reward; hard landings do not', () => {
  const state=createStuntAttack(),c=car();
  c.trickPayout={time:1, hard:false};
  assert.equal(scoreStuntAttack(state,c,0,.1,1),200);
  assert.equal(scoreStuntAttack(state,c,0,.1,1.1),0);
  c.trickPayout={time:2, hard:true};
  assert.equal(scoreStuntAttack(state,c,0,.1,2),0);
  assert.equal(state.combo,2);
});
test('crashes reset combo and idle time decays without farming points', () => {
  const state=createStuntAttack(),c=car();
  c.nearMisses=1;scoreStuntAttack(state,c,100,.1,1);
  c.collisions++;assert.equal(scoreStuntAttack(state,c,0,.1,2),0);
  assert.equal(state.combo,0);
  c.nearMisses++;scoreStuntAttack(state,c,50,.1,3);
  assert.equal(state.combo,1);
  scoreStuntAttack(state,c,0,.1,10);
  assert.equal(state.combo,0);
});
test('air time and multiplier scale with time rather than frame count', () => {
  const a=createStuntAttack(),b=createStuntAttack(),ca=car(),cb=car();
  ca.nearMisses=cb.nearMisses=1;ca.altitude=cb.altitude=3;
  scoreStuntAttack(a,ca,100,.1,1);
  scoreStuntAttack(b,cb,50,.05,1);
  scoreStuntAttack(b,cb,50,.05,1.05);
  assert.equal(a.bonus,b.bonus);
  assert.equal(a.airTime,b.airTime);
  assert.equal(a.maxCombo,b.maxCombo);
});
