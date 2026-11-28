import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { createInteractiveTutorial } from '../src/interactive-tutorial.ts';

function tick(race, distance, speed, input = {}, altitude = 0) {
  Object.assign(race, { phase: 'racing', traffic: [], rivals: [], rings: [], pickups: [] });
  Object.assign(race.player, { distance, speed, altitude, x: 0, steering: 0, cooldown: 1 });
  stepRace(race, { throttle: true, ...input }, 1 / 60);
  return race.player.x;
}

// A bend first turns the road away from the car's nose (owner, 2026-11-25); the slide follows from that heading.
function nose(race, distance, speed, altitude = 0) {
  tick(race, distance, speed, {}, altitude);
  return race.player.heading;
}

test('Neon corners pull a fast grounded car outward in each direction and steering can correct', () => {
  const race = () => createRace('neon', { mode: 'time' });
  // 10 km lap (2026-11-15): the same bends at their new lap metres, underpass corner 663-942 and market left bend 1685-1932.
  assert.ok(nose(race(), 1878, 88) > 1e-3, 'the night-market left bend pushes right');
  assert.ok(nose(race(), 800, 88) < -1e-3, 'the underpass right corner pushes left');
  const correcting = race();
  Object.assign(correcting, { phase: 'racing', traffic: [], rivals: [], rings: [], pickups: [] });
  Object.assign(correcting.player, { distance: 1878, speed: 88, x: 0, steering: -1, cooldown: 1 });
  stepRace(correcting, { throttle: true, steer: -1 }, 1 / 60);
  assert.ok(correcting.player.x < 0, 'full steering retains authority');
});

// Kart handling (owner, 2026-11-28): no speed gate, so a slow car meets the bend too, in proportion to its speed.
test('corner load preserves the grid and tutorial steering, and turns a slow nose in proportion', () => {
  const race = () => createRace('neon', { mode: 'time' });
  assert.equal(tick(race(), 40, 88), 0);
  assert.equal(tick(createInteractiveTutorial().race, 330, 88), 0);
  const slow = nose(race(), 800, 24), fast = nose(race(), 800, 88);
  // Throttle adds more speed to the slow car within the step, so the ratio is a little over 24/88.
  assert.ok(slow < -1e-3 && slow > fast && slow / fast < .3, `at 24 m/s ${slow}, at 88 m/s ${fast}`);
});

// Owner, 2026-11-25: taking off must not skip a corner's difficulty. Kart handling (2026-11-28): the nose keeps its
// direction in the air too, so the road turns away from it at the full rate.
test('a flying car meets the whole corner a grounded car does', () => {
  const race = () => createRace('neon', { mode: 'time' });
  const ground = nose(race(), 800, 88), air = nose(race(), 800, 88, 5);
  assert.ok(ground < -1e-3, `the underpass corner turns the nose: ${ground}`);
  assert.equal(air, ground, `in the air ${air}, on the ground ${ground}`);
});

test('both streaming modes carry corner load beyond the original finish', () => {
  for (const mode of ['endless', 'elimination']) {
    const race = createRace('neon', { mode });
    // Neon is a closed lap (layout 7): the second lap bends the same way as the first.
    assert.ok(nose(race, RACE_TRACKS.neon.length + 800, 88) < -1e-3, mode);
  }
});

test('cornering responds consistently to 30, 60 and 120 Hz steering steps', () => {
  const positions = [30, 60, 120].map(hz => {
    const race = createRace('neon', { mode: 'time' });
    Object.assign(race, { phase: 'racing', traffic: [], rivals: [], rings: [], pickups: [] });
    Object.assign(race.player, { distance: 1778, x: 0, speed: 85, cooldown: 2 });
    for (let i = 0; i < hz; i++) stepRace(race, { throttle: true }, 1 / hz);
    return race.player.x;
  });
  assert.ok(positions.every(x => x > .5));
  assert.ok(Math.max(...positions) - Math.min(...positions) < .12);
});
