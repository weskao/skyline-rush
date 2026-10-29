import test from 'node:test';
import assert from 'node:assert/strict';
import { LANES } from '../src/game.js';
import { themedHazards } from '../src/track-themes.ts';
import { hazardReach } from '../src/hazard-race.ts';
import { WORLD_THEMES } from '../src/world-tour-scene.js';

const CAR_HALF_WIDTH = 0.85;
const blockingLanes = (hazards, d) => {
  const blocked = new Set();
  for (const h of hazards) {
    const reach = hazardReach(h);
    if (!reach || Math.abs(h.distance - d) > h.halfLength + 2.2) continue;
    for (const lane of LANES) if (Math.abs(lane - h.x) < reach + CAR_HALF_WIDTH) blocked.add(lane);
  }
  return blocked.size;
};

test('11B Coast: themed hazards stay low so the coastline stays in view, leaving lanes for clean overtakes', () => {
  const hazards = themedHazards('coast');
  for (const h of hazards.filter(h => hazardReach(h))) assert.ok(h.height <= 1.5, `${h.id} rises ${h.height} m over the sea view`);
  for (let d = 0; d < 6000; d += 2) assert.ok(blockingLanes(hazards, d) <= 1, `Coast @${d}: keep three lanes for overtaking`);
});

test('11B World Tour: themed hazards on a landmark approach stay below the landmark sightline', () => {
  for (const [id, theme] of Object.entries(WORLD_THEMES)) for (const l of theme.landmarks.filter(l => l.plaza)) {
    for (const h of themedHazards(id).filter(h => h.distance >= l.at - l.plaza && h.distance <= l.at + 60))
      assert.ok(h.altitude + h.height <= 3.1, `${id} ${h.id} would block ${l.kind ?? 'landmark'}`);
  }
});
