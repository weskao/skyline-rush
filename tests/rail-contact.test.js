import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS, ROAD_LIMIT, createRace, stepRace } from '../src/game.js';

test('all tracks treat a sustained rail press as one contact until the car leaves the rail', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    const race = createRace(id);
    race.phase = 'racing';
    race.traffic = [];
    race.rivals = [];
    Object.assign(race.player, { distance: id === 'spiral' ? 1500 : 800, x: ROAD_LIMIT, speed: 75, steering: 1 });
    stepRace(race, { throttle: true, steer: 1 }, 1 / 60);
    assert.equal(race.player.collisions, 1, `${id} initial impact`);
    for (let frame = 0; frame < 180; frame++) {
      stepRace(race, { throttle: true, steer: 1 }, 1 / 60);
      assert.ok(Math.abs(race.player.x) <= ROAD_LIMIT, `${id} bounded lateral position`);
    }
    assert.equal(race.player.collisions, 1, `${id} sustained input should not hammer the same rail`);
    for (let frame = 0; frame < 60; frame++) stepRace(race, { throttle: true, steer: -1 }, 1 / 60);
    assert.ok(race.player.x < ROAD_LIMIT - 1.2, `${id} backs away from the rail`);
    assert.equal(race.player.railContactSide, 0, `${id} can hit again after separating`);
  }
});
