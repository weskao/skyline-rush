import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANES, RACE_TRACKS } from '../src/game.js';
import { THEMED_TRACKS, themedPlacements, themedHazards } from '../src/track-themes.ts';
import { hazardReach } from '../src/hazard-race.ts';
import { roadObstacles } from '../src/world-tour-scene.js';

// 11B World Tour themes: each road's hazards read as its own place, and together with the
// solid roadside props they never close more than two of the four lanes.
const CAR_HALF_WIDTH = 0.85;
const THEMES = {
  // Festival barricades and cone-lined boulevard closures, low enough to keep the Presidential Office in view.
  taipei: { types: ['barrier', 'cone'], closure: true, maxHeight: 2.5 },
  // Timed traffic-control gates, neon construction equipment and a lane of roadworks.
  tokyo: { types: ['gate', 'barrier', 'cone'], closure: true, maxHeight: 3, moving: 'pulse' },
  // Snow drifts and falling avalanche debris. No rail crossing: it would close all four lanes.
  alpine: { types: ['debris', 'cone'], closure: true, maxHeight: 1.4, moving: 'fall' },
  // Lighthouse-side bridge works, sea-wall repairs and wave-spray gusts on the open stretches.
  coastal: { types: ['barrier', 'cone', 'gust'], closure: true, maxHeight: 8 },
  // Floating asteroid fragments, sweeping energy barriers and aerial gate hoops (collected, never solid).
  cosmic: { types: ['debris', 'energy-barrier', 'ring'], closure: false, maxHeight: 3, moving: 'sweep' },
};

for (const [trackId, theme] of Object.entries(THEMES)) test(`${trackId} has its own themed hazards`, () => {
  assert.ok(THEMED_TRACKS.includes(trackId), `${trackId} theme table`);
  const placements = themedPlacements(trackId);
  assert.ok(placements.every(p => theme.types.includes(p.type)), `${trackId} uses ${theme.types}`);
  for (const type of theme.types) assert.ok(placements.some(p => p.type === type), `${trackId} shows ${type}`);
  if (theme.closure) assert.ok(placements.filter(p => p.type === 'cone').length >= 5, `${trackId} has a cone closure`);
  if (theme.moving) assert.ok(placements.some(p => p.movementPattern.kind === theme.moving), `${trackId} has ${theme.moving} hazards`);
  // Measured at rest: falling debris ends on the road. Hoops hang overhead on purpose.
  assert.ok(placements.filter(p => p.type !== 'ring').every(p => (p.movementPattern.kind === 'fall' ? 0 : p.altitude) + p.hitbox.height <= theme.maxHeight), `${trackId} stays low`);
  // A crosswind pushes the car off its line, so no hazard sits inside one (±35 m); a gust there would stack two shoves.
  const winds = RACE_TRACKS[trackId].sections.filter(s => s.type === 'crosswind');
  for (const p of placements) assert.ok(!winds.some(s => p.distance >= s.from - 35 && p.distance <= s.to + 35), `${p.id} clear of crosswind`);
});

for (const trackId of Object.keys(THEMES)) test(`${trackId} hazards plus roadside props keep two lanes open`, () => {
  const hazards = themedHazards(trackId), props = roadObstacles(trackId);
  for (let d = 0; d < RACE_TRACKS[trackId].length; d += 2) {
    const blocked = new Set();
    // Only blocking hazards close a lane (a gust pushes, it does not block); a sweep covers its whole reach.
    for (const h of hazards) {
      const reach = hazardReach(h);
      if (!reach || Math.abs(h.distance - d) > h.halfLength + 2.2) continue;
      for (const lane of LANES) if (Math.abs(lane - h.x) < reach + CAR_HALF_WIDTH) blocked.add(lane);
    }
    for (const o of props) {
      if (d < o.from - 2.2 || d > o.to + 2.2 || o.bottom > 1.2) continue;
      for (const lane of LANES) if (lane + CAR_HALF_WIDTH > o.left && lane - CAR_HALF_WIDTH < o.right) blocked.add(lane);
    }
    assert.ok(blocked.size <= 2, `${trackId} @${d}: ${blocked.size} lanes blocked`);
  }
});
