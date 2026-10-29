import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPresentation } from '../src/presentation.ts';

test('finish coasts for 0.6 seconds, then reveals results without advancing the official race', () => {
  const race = { phase: 'racing', elapsed: 62, player: { speed: 80, distance: 5000 }, result: null };
  const presentation = createPresentation();
  presentation.update(race, 0);
  race.phase = 'finished'; race.result = { position: 1, score: 1300 };
  const official = structuredClone(race);
  assert.equal(presentation.update(race, 0).results, false);
  const midway = { ...presentation.update(race, 0.3) };
  assert.equal(midway.results, false);
  assert.ok(midway.finishDistance > 0 && midway.finishDistance < 15);
  assert.equal(presentation.update(race, 0.31).results, true);
  assert.equal(presentation.update(race, 1.2).count, 1);
  assert.deepEqual(race, official);
});

test('restart cancels the finish, and GO camera push happens only at countdown completion', () => {
  const race = { phase: 'countdown', player: { speed: 0 } };
  const presentation = createPresentation();
  assert.equal(presentation.update(race, 0.1).goPush, 0);
  race.phase = 'paused'; presentation.update(race, 1);
  race.phase = 'countdown'; presentation.update(race, 0.1);
  race.phase = 'racing';
  assert.ok(presentation.update(race, 0.1).goPush > 0);
  assert.equal(presentation.update(race, 1).goPush, 0);
  race.phase = 'finished'; presentation.update(race, 0.2);
  const next = { phase: 'countdown', player: { speed: 0 } };
  assert.equal(presentation.update(next, 0.1).finishDistance, 0);
  assert.equal(presentation.update(next, 0.1).results, false);
});

test('reduced motion and comfort show complete results immediately, even when enabled during a finish', () => {
  const presentation = createPresentation();
  const race = { phase: 'finished', player: { speed: 80 } };
  presentation.update(race, 0.2);
  const calm = presentation.update(race, 0, true);
  assert.equal(calm.results, true);
  assert.equal(calm.count, 1);
  assert.equal(calm.finishDistance, 0);
  assert.equal(calm.goPush, 0);
  assert.equal(presentation.update(race, 0.1, false).results, true);
});
