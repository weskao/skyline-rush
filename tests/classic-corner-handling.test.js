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

test('Neon corners pull a fast grounded car outward in each direction and steering can correct', () => {
  const race = () => createRace('neon', { mode: 'time' });
  assert.ok(tick(race(), 225, 88) > .005, 'the first left corner pushes right');
  assert.ok(tick(race(), 740, 88) < -.005, 'the tunnel right corner pushes left');
  const correcting = race();
  Object.assign(correcting, { phase: 'racing', traffic: [], rivals: [], rings: [], pickups: [] });
  Object.assign(correcting.player, { distance: 225, speed: 88, x: 0, steering: -1, cooldown: 1 });
  stepRace(correcting, { throttle: true, steer: -1 }, 1 / 60);
  assert.ok(correcting.player.x < 0, 'full steering retains authority');
});

test('corner load preserves the grid, slow handling, flight and tutorial steering', () => {
  const race = () => createRace('neon', { mode: 'time' });
  assert.equal(tick(race(), 40, 88), 0);
  assert.equal(tick(race(), 225, 24), 0);
  assert.equal(tick(race(), 225, 88, {}, 5), 0);
  assert.equal(tick(createInteractiveTutorial().race, 330, 88), 0);
});

test('both streaming modes carry corner load beyond the original finish', () => {
  for (const mode of ['endless', 'elimination']) {
    const race = createRace('neon', { mode });
    assert.ok(tick(race, RACE_TRACKS.neon.length + 225, 88) < -.005, mode);
  }
});

test('cornering responds consistently to 30, 60 and 120 Hz steering steps', () => {
  const positions = [30, 60, 120].map(hz => {
    const race = createRace('neon', { mode: 'time' });
    Object.assign(race, { phase: 'racing', traffic: [], rivals: [], rings: [], pickups: [] });
    Object.assign(race.player, { distance: 180, x: 0, speed: 85, cooldown: 2 });
    for (let i = 0; i < hz; i++) stepRace(race, { throttle: true }, 1 / hz);
    return race.player.x;
  });
  assert.ok(positions.every(x => x > .5));
  assert.ok(Math.max(...positions) - Math.min(...positions) < .12);
});
