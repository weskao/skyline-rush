import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { COURSE_TRACKS, isModeTrack } from '../src/race-tracks.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { placeCourseCar } from '../src/course-race.ts';
import { groundAt } from '../src/course-items.ts';
import { DRIFT_LATERAL } from '../src/drive-rules.ts';

// Drift handling is global (.claude/rules/vehicle-road-stability.md): every registered track, and Endless on each,
// slides at DRIFT_LATERAL of the steering rate and keeps a drift through a steer flip. A new track is covered on registration.
const COURSES = [
  ...Object.keys(RACE_TRACKS).map(id => [id, 'time']),
  ...Object.keys(COURSE_TRACKS).map(id => [id, 'time']),
  [CIRCUIT_ID, 'circuit'],
  ...Object.keys(RACE_TRACKS).filter(id => isModeTrack(id, 'endless')).map(id => [id, 'endless']),
];
const SPEED = 80;

function racing([id, mode], distance, hz) {
  const race = createRace(id, { mode }); startRace(race);
  while (race.phase !== 'racing') stepRace(race, {}, 1 / hz);
  Object.assign(race, { traffic: [], rivals: [], pickups: [], rings: [] });
  if (race.hazards) race.hazards = [];
  Object.assign(race.player, { distance, speed: SPEED, x: 0, steering: 0, drift: null, railContactSide: 0, cooldown: 1 });
  if (race.course) { // a per-car graph runtime rejects a teleported odometer: seat the car on its ground route instead
    const { edgeId, localS } = groundAt(race.course.spec.graph, distance);
    placeCourseCar(race.course, 'YOU', edgeId, localS, { distance, x: 0, altitude: 0 });
  }
  return race;
}
const spots = ([id]) => {
  const length = (COURSE_TRACKS[id] ?? RACE_TRACKS[id])?.length ?? 4000;
  return Array.from({ length: Math.floor((length - 600) / 250) }, (_, i) => 300 + i * 250);
};

test('every course: a drift slides at exactly DRIFT_LATERAL x the steering rate, corners included', () => {
  for (const course of COURSES) for (const distance of spots(course)) for (const dir of [1, -1]) {
    const race = racing(course, distance, 60);
    race.player.steering = dir; // full lock already, so the ramp does not blur the rate
    stepRace(race, { brake: true, steer: dir }, 1 / 60);
    const car = race.player;
    if (!car.drift || car.altitude !== 0 || car.section === 'crosswind') continue; // gaps, launches, crosswind hazard
    const expected = dir * Math.min(9, car.speed * 0.22) * DRIFT_LATERAL / 60;
    assert.ok(Math.abs(car.x - expected) < 1e-9, `${course.join('/')} @${distance} dir ${dir}: dx ${car.x.toFixed(4)} vs ${expected.toFixed(4)}`);
  }
});

// Keyboard, touch and pad all pass through neutral steer for a frame or more when flipping sides.
function flip(course, distance, hz, neutral, gapSteer = 0) {
  const race = racing(course, distance, hz), dt = 1 / hz, car = race.player;
  const plan = [[1, 0.5], [gapSteer, neutral], [-1, 0.3]];
  for (const [steer, seconds] of plan) for (let i = 0; i < Math.round(seconds * hz); i++) {
    stepRace(race, { brake: true, steer }, dt);
    if (!car.drift) return null;
  }
  return car.drift;
}

test('every course: a 2-frame or 100 ms neutral steer flip keeps the drift and turns it, at 30/60/120 FPS', () => {
  for (const course of COURSES) {
    let checked = 0;
    for (const distance of spots(course)) for (const [hz, neutral] of [[60, 2 / 60], [30, 0.1], [60, 0.1], [120, 0.1]]) {
      if (!flip(course, distance, hz, neutral, 1)) continue; // a gap, launch or crosswind here ends any drift, flip or not
      checked++;
      {
        const drift = flip(course, distance, hz, neutral);
        assert.ok(drift, `${course.join('/')} @${distance} ${hz} FPS, ${neutral * 1000 | 0} ms neutral: drift ended`);
        assert.equal(drift.dir, -1);
        assert.ok(Math.abs(drift.time - 0.8) < 0.02, `grace earns no drift time: ${drift.time}`);
      }
    }
    assert.ok(checked > 0, `${course.join('/')}: no spot can hold a drift`);
  }
});
