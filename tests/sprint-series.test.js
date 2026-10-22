import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSprintSeries, addSprintStage, sprintTotal } from '../src/sprint-series.js';
import { normalizeRaceConfig, rulesSignature } from '../src/race-config.js';

test('supported sprint heat counts 1, 2, 3 and 5', () => {
  for (const count of [1,2,3,5]) assert.deepEqual(createSprintSeries(count),{count, results:[]});
  for (const count of [0,-1,4,2.5,'3']) assert.throws(() => createSprintSeries(count));
});
test('stage completion records totals only when finished, never counts duplicate stages', () => {
  const series=createSprintSeries(2);
  assert.throws(() => addSprintStage(series,{phase:'racing', result:{time:14,position:1}}));
  const first=addSprintStage(series,{phase:'finished',result:{time:30,position:2,score:200}});
  assert.equal(first.results.length,1);
  assert.equal(series.results.length,0);
  assert.equal(sprintTotal(first),30);
  const final=addSprintStage(first,{phase:'finished',result:{time:29,position:1,score:100}});
  assert.equal(sprintTotal(final),59);
  assert.equal(final.results.reduce((v,x)=>v+x.score,0),300);
  assert.throws(()=>addSprintStage(final,{phase:'finished',result:{time:14,position:1}}));
});
test('invalid stage results do not update the series', () => {
  for (const result of [{time:-1,position:1},{time:NaN,position:1},{time:10,position:5},{time:10,position:1,score:Infinity}]) {
    assert.throws(()=>addSprintStage(createSprintSeries(2),{phase:'finished',result}));
  }
});
test('custom multi-stage settings are separate from legacy single sprint signatures', () => {
  assert.equal(normalizeRaceConfig({mode:'custom',stages:3}).stages, 3);
  assert.equal(normalizeRaceConfig({mode:'custom',stages:4}).stages, undefined);
  assert.equal(normalizeRaceConfig({mode:'classic',stages:3}).stages, undefined);
  assert.equal(normalizeRaceConfig({mode:'custom',stages:1}).stages, undefined);
  assert.notEqual(rulesSignature({mode:'custom',stages:3}),rulesSignature({mode:'custom'}));
  assert.equal(rulesSignature({mode:'custom',stages:1}),rulesSignature({mode:'custom'}));
});
