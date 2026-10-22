import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raceConfig, raceRulesKey, trafficMultiplier, officialRules } from '../src/race-config.js';

test('default classic rules are stable and eligible', () => {
  const c = raceConfig('coast');
  assert.deepEqual(c, { version: 1, mode: 'classic', trackId: 'coast', rivalCount: 3, aiDifficulty: 'normal', trafficDensity: 'normal', itemsEnabled: true, collisionRule: 'normal', ghostEnabled: true, visualPreset: 'track' });
  assert.equal(officialRules(c), true);
});
test('custom rules preserve bounds and have a deterministic signature', () => {
  const c = raceConfig('neon', { mode:'custom', rivalCount:0, aiDifficulty:'hard', trafficDensity:'heavy', itemsEnabled:false, collisionRule:'relaxed' });
  assert.equal(c.rivalCount, 0);
  assert.equal(c.trafficDensity, 'heavy');
  assert.equal(trafficMultiplier(c.trafficDensity), 1.5);
  assert.equal(officialRules(c), false);
  assert.equal(raceRulesKey(c), raceRulesKey(raceConfig('neon', { mode:'custom', rivalCount:0, aiDifficulty:'hard', trafficDensity:'heavy', itemsEnabled:false, collisionRule:'relaxed' })));
  assert.notEqual(raceRulesKey(c), raceRulesKey(raceConfig('neon', {mode:'custom'})));
});
test('free and time attack are always solo; classic ignores changes', () => {
  assert.equal(raceConfig('coast', {mode:'free', rivalCount:3}).rivalCount, 0);
  assert.equal(raceConfig('coast', {mode:'time', rivalCount:1}).rivalCount, 0);
  assert.equal(raceConfig('coast', {mode:'classic', rivalCount:0, itemsEnabled:false}).rivalCount,3);
});
test('reject unsupported options rather than lose meaning of historical records', () => {
  for (const opts of [{mode:'battle'}, {mode:'custom',rivalCount:4}, {mode:'custom',rivalCount:1.3}, {mode:'custom',trafficDensity:'wild'}, {mode:'custom',itemsEnabled:'false'}, {mode:'custom',seed:999}, null]) {
    assert.throws(() => raceConfig('coast',opts));
  }
  assert.throws(() => raceConfig('coast',{mode:'custom',version:2}));
});
test('traffic options use finite bounded multipliers', () => {
  assert.deepEqual(['off','light','normal','heavy'].map(trafficMultiplier), [0,.5,1,1.5]);
});
