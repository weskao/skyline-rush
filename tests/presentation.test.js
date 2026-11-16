import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPresentation } from '../src/presentation.ts';
import { createRace, RACE_TRACKS } from '../src/game.js';
import { COURSE_TRACKS } from '../src/race-tracks.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { groundAt } from '../src/course-items.ts';
import { placeCourseCar } from '../src/course-race.ts';

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

test('a finite race presents halfway just once even after recovery back across it', () => {
  const presentation = createPresentation();
  const race = { phase: 'racing', length: 2000, player: { speed: 60, distance: 999 } };
  assert.equal(presentation.update(race, 0).halfway, null);
  race.player.distance = 1001;
  let state = presentation.update(race, .02);
  assert.equal(state.halfway.remainingMetres, 999);
  assert.equal(state.halfwayStarted, true);
  race.player.distance = 960;
  state = presentation.update(race, .05);
  assert.equal(state.halfway.remainingMetres, 999);
  assert.equal(state.halfwayStarted, false);
  race.player.distance = 1010;
  assert.equal(presentation.update(race, 3).halfway, null);
  assert.equal(presentation.update(race, .05).halfwayStarted, false);
});

test('pause hides halfway, resume leaves it dismissed, and retry earns a new cue', () => {
  const presentation = createPresentation();
  const race = { phase: 'countdown', length: 2000, player: { speed: 60, distance: 999 } };
  presentation.update(race, 0);
  race.phase = 'racing';
  race.player.distance = 1001;
  assert.equal(presentation.update(race, .05).halfwayStarted, true);
  race.phase = 'paused';
  assert.equal(presentation.update(race, .05).halfway, null);
  race.phase = 'racing';
  assert.equal(presentation.update(race, .05).halfway, null);
  const retry = { ...race, player: { ...race.player, distance: 999 } };
  presentation.update(retry, 0);
  retry.player.distance = 1001;
  assert.equal(presentation.update(retry, .05).halfwayStarted, true);
});

test('endless, invalid circuits and already-running saves beyond halfway do not show a stale milestone', () => {
  for (const flags of [{ endless: {} }, { circuit: { player: { valid: false } } }]) {
    const race = { phase: 'racing', length: 2000, player: { speed: 60, distance: 999 }, ...flags };
    const presentation = createPresentation();
    presentation.update(race, 0);
    race.player.distance = 1001;
    assert.equal(presentation.update(race, .05).halfway, null);
  }
  const resume = { phase: 'racing', length: 2000, player: { speed: 60, distance: 1200 } };
  assert.equal(createPresentation().update(resume, 0).halfway, null);
});

for (const track of [...Object.keys(RACE_TRACKS), ...Object.keys(COURSE_TRACKS), CIRCUIT_ID]) {
  test(`${track} announces midway through the whole race with distance remaining`, () => {
    const race = createRace(track, track === CIRCUIT_ID ? { mode: 'circuit', laps: 3 } : null);
    const presentation = createPresentation();
    race.phase = 'racing';
    function nearHalfway(offset) {
      const car = race.player;
      car.distance = race.length / 2 + offset;
      if (race.course) {
        const { edgeId, localS } = groundAt(race.course.spec.graph, car.distance);
        placeCourseCar(race.course, 'YOU', edgeId, localS, car);
      }
      return presentation.update(race, .05);
    }
    assert.equal(nearHalfway(-2).halfway, null);
    const state = nearHalfway(2);
    assert.equal(state.halfwayStarted, true);
    assert.ok(state.halfway.remainingMetres > 0 && state.halfway.remainingMetres < race.length);
    assert.equal(nearHalfway(3).halfwayStarted, false);
  });
}

test('Dune halfway uses position on the short air branch instead of its shorter odometer', () => {
  const race = createRace('dune-tempest'), presentation = createPresentation();
  race.phase = 'racing';
  function cross(localS) {
    race.player.distance = 5000 + localS;
    placeCourseCar(race.course, 'YOU', 'canyon-air-crossing', localS, race.player);
    return presentation.update(race, .05);
  }
  assert.equal(cross(550).halfway, null);
  const state = cross(650);
  assert.equal(state.halfwayStarted, true);
  // ~450 m left on the air branch plus the shortest 5,064 m onward.
  assert.equal(Math.round(state.halfway.remainingMetres), 5514);
});

test('halfway reading time uses elapsed frame time when rendering is slow', () => {
  const presentation = createPresentation();
  const race = { phase: 'racing', length: 2000, player: { speed: 60, distance: 999 } };
  presentation.update(race, 0);
  race.player.distance = 1001;
  assert.equal(presentation.update(race, .05, false, .6).halfwayStarted, true);
  assert.ok(presentation.update(race, .05, false, 1.5).halfway);
  assert.equal(presentation.update(race, .05, false, .8).halfway, null);
});
