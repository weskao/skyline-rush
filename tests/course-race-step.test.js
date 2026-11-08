import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRace } from '../src/game.js';
import { physicalGap, CIRCUIT_ID } from '../src/circuit-track.ts';
import { seededRng } from '../src/rng.ts';
import { attachCourse, carGap, courseFinished, progressGap } from '../src/course-race-step.ts';

// Without a registry entry every hook must be the legacy expression it replaced, bit for bit.
test('legacy races: carGap / progressGap / courseFinished equal the legacy expressions', () => {
  for (const race of [createRace('coast'), createRace(CIRCUIT_ID, { mode: 'circuit' })]) {
    const random = seededRng(7, 'course-race-step');
    const cars = Array.from({ length: 1000 }, () => [{ distance: random() * race.length * 1.2 }, { distance: random() * race.length * 1.2 }]);
    cars.push([{ distance: race.length }, { distance: race.length - 1e-9 }]);
    for (const [a, b] of cars) {
      assert.equal(carGap(race, a, b), physicalGap(race.trackId, a.distance, b.distance));
      assert.equal(progressGap(race, a, b), b.distance - a.distance);
      assert.equal(courseFinished(race, a), a.distance >= race.length);
    }
  }
});

test('attachCourse leaves a legacy race without a course and otherwise untouched', () => {
  const race = createRace('coast'), before = structuredClone(race);
  attachCourse(race);
  assert.equal(race.course, undefined);
  assert.equal(Object.hasOwn(race, 'course'), false);
  assert.deepStrictEqual(race, before);
});

// game.js sits at its line ceiling: the finish/result block moved out (move-only) so the hooks fit.
test('the finish/result block lives in race-finish.js, no longer in game.js', () => {
  const finishUrl = new URL('../src/race-finish.js', import.meta.url);
  assert.ok(existsSync(finishUrl), 'src/race-finish.js exists');
  const game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
  assert.ok(!game.includes('race.result = { position, time: finishTime'));
  assert.ok(readFileSync(finishUrl, 'utf8').includes('race.result = { position, time: finishTime'));
});
