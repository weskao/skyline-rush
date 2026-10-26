import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS, LANES } from '../src/game.js';
import { createHazards, hazardX } from '../src/hazards.ts';

const avoided = new Set(['gap', 'launch', 'tunnel', 'boost-tunnel', 'shortcut']);

test('MODE-07 RED: each seeded hazard layout keeps ground corridors and aerial shortcuts unobstructed', () => {
  for (const [name, track] of Object.entries(RACE_TRACKS)) {
    for (const tier of ['standard', 'extreme']) {
      const hazards = createHazards(track, LANES, tier);
      assert.deepEqual(hazards, createHazards(track, LANES, tier), name + ': nondeterministic ' + tier);
      assert.ok(hazards.length > 2 && hazards.length < 100, name + ': insufficient/bursting ' + tier);
      for (let i = 0; i < hazards.length; i++) {
        const obstacle = hazards[i];
        assert.ok(obstacle.distance > 0 && obstacle.distance < track.length, name);
        if (i > 0) assert.ok(obstacle.distance - hazards[i - 1].distance >= 200, name);
        assert.ok(!track.sections.some(section => avoided.has(section.type) &&
          obstacle.distance >= section.from - 35 && obstacle.distance <= section.to + 35),
          name + ': hazard overlaps an essential launch, gap, tunnel or raised shortcut approach');
        for (const sec of [0, 1, 10, 50, 100]) {
          const x = hazardX(obstacle, sec);
          assert.ok(Number.isFinite(x) && Math.abs(x) <= 9, name);
          const clearGroundLanes = LANES.filter(lane => Math.abs(lane - x) >= 1.8);
          assert.ok(clearGroundLanes.length >= 2, name + ': no reasonable ground path');
          assert.equal(obstacle.altitude, 0, name + ': air route must remain available');
        }
      }
    }
  }
});

test('MODE-07 RED: invalid elapsed time never creates a non-finite moving collision position', () => {
  const obstacle = createHazards(RACE_TRACKS.coast, LANES)[0];
  assert.ok(obstacle.moving);
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.ok(Number.isFinite(hazardX(obstacle, bad)));
    assert.equal(hazardX(obstacle, bad), hazardX(obstacle, 0));
  }
});
