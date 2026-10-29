import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANES, RACE_TRACKS } from '../src/game.js';
import { THEMED_TRACKS, themedPlacements } from '../src/track-themes.ts';
import { roadObstacles } from '../src/world-tour-scene.js';

// 11B World Tour themes: each road's hazards read as its own place, and together with the
// solid roadside props they never close more than two of the four lanes.
const CAR_HALF_WIDTH = 0.85;
const THEMES = {
  // Festival barricades and cone-lined boulevard closures, low enough to keep the Presidential Office in view.
  taipei: { types: ['barrier', 'cone'], closure: true, maxHeight: 2.5 },
  // Traffic-control gates, neon construction equipment and a lane of roadworks.
  tokyo: { types: ['gate', 'barrier', 'cone'], closure: true, maxHeight: 3 },
  // Snow drifts and avalanche debris on open mountain road; rail crossings wait for ENV-05.
  alpine: { types: ['debris', 'cone'], closure: true, maxHeight: 1.4 },
  // Lighthouse-side bridge works and sea-wall repairs; crosswinds wait for ENV-05.
  coastal: { types: ['barrier', 'cone'], closure: true, maxHeight: 2.5 },
  // Floating asteroid fragments and energy barriers; their motion and low-gravity sectors arrive with ENV-05.
  cosmic: { types: ['debris', 'energy-barrier'], closure: false, maxHeight: 3 },
};

for (const [trackId, theme] of Object.entries(THEMES)) test(`${trackId} has its own themed hazards`, () => {
  assert.ok(THEMED_TRACKS.includes(trackId), `${trackId} theme table`);
  const placements = themedPlacements(trackId);
  assert.ok(placements.every(p => theme.types.includes(p.type)), `${trackId} uses ${theme.types}`);
  for (const type of theme.types) assert.ok(placements.some(p => p.type === type), `${trackId} shows ${type}`);
  if (theme.closure) assert.ok(placements.filter(p => p.type === 'cone').length >= 5, `${trackId} has a cone closure`);
  if (theme.moving) assert.ok(placements.some(p => p.movementPattern.kind !== 'static'), `${trackId} has moving hazards`);
  assert.ok(placements.every(p => p.altitude + p.hitbox.height <= theme.maxHeight), `${trackId} stays low`);
  // A crosswind pushes the car off its line, so no hazard sits inside one (±35 m).
  const winds = RACE_TRACKS[trackId].sections.filter(s => s.type === 'crosswind');
  for (const p of placements) assert.ok(!winds.some(s => p.distance >= s.from - 35 && p.distance <= s.to + 35), `${p.id} clear of crosswind`);
});

for (const trackId of Object.keys(THEMES)) test(`${trackId} hazards plus roadside props keep two lanes open`, () => {
  const placements = themedPlacements(trackId), props = roadObstacles(trackId);
  for (let d = 0; d < RACE_TRACKS[trackId].length; d += 2) {
    const blocked = new Set();
    for (const p of placements) {
      if (Math.abs(p.distance - d) > p.hitbox.halfLength + 2.2) continue;
      for (const lane of LANES) if (Math.abs(lane - p.lateralOffset) < p.hitbox.halfWidth + CAR_HALF_WIDTH) blocked.add(lane);
    }
    for (const o of props) {
      if (d < o.from - 2.2 || d > o.to + 2.2 || o.bottom > 1.2) continue;
      for (const lane of LANES) if (lane + CAR_HALF_WIDTH > o.left && lane - CAR_HALF_WIDTH < o.right) blocked.add(lane);
    }
    assert.ok(blocked.size <= 2, `${trackId} @${d}: ${blocked.size} lanes blocked`);
  }
});
