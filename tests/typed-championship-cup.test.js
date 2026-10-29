import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createCup, addCupResult, cupStandings, cupComplete } from '../src/championship-cup.ts';

test('typed championship cup remains immutable and avoids duplicated JavaScript source', () => {
  const cup = createCup(['coast', 'neon', 'canyon'], 'coast');
  const finish = {
    trackId: 'coast', phase: 'finished', elapsed: 20, length: 5000,
    result: { time: 20 },
    rivals: ['NOVA', 'ORBIT', 'APEX'].map((name, index) =>
      ({ name, finishTime: 21 + index, distance: 4900, speed: 60 })),
  };
  const first = addCupResult(cup, finish);
  assert.deepEqual(cup.results, []);
  assert.equal(cupStandings(first)[0].name, 'YOU');
  assert.equal(cupComplete(first), false);
  assert.equal(existsSync(new URL('../src/championship-cup.js', import.meta.url)), false);
});
