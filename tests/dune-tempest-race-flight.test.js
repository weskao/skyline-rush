import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLE_COURSE_GRAPH as graph } from '../src/courses/dune-tempest-runtime-adapter.ts';
import { routeLength } from '../src/course-route-frame.ts';
import { AIR, SWITCHBACKS, BOT_MIN, BOT_MAX, PATHS, botRace, pathEdges, gapEnd } from './helpers/dune-tempest-race-helpers.js';

// Measured with the FLY-pulse controller (no physics change) at 60 Hz: 116.653 s winding-wadi/natural-arch-pass, 113.792 s
// winding-wadi/dry-wash-cut, 114.226 s dune-crest-cut/natural-arch-pass, 111.365 s dune-crest-cut/dry-wash-cut (30 / 120 Hz
// within 0.07 s); lowest altitude over the gap 2.38 m, landing at localS 1057–1061 on the [983.3, 1088.3] pad, tank 100 →
// ≥ 87 over the crossing. The air floor sits below the shortest measured air path and above one that skipped the
// 1,088 m flight edge (~11 s); the ground paths keep BOT_MIN.
const AIR_BOT_MIN = 100;
test('a FLY-pulse bot crosses the gap, lands on the pad and finishes: all 8 paths, rejections 0', () => {
  const landingTo = routeLength(graph, AIR);
  for (const [first, third] of PATHS) for (const second of [SWITCHBACKS, AIR]) {
    let landing = null, lowInGap = Infinity;
    const { race, edges, checkpoints } = botRace(60, [first, third], { second, trace: (r, you) => {
      const { currentEdgeId: edge, localS: s } = you.travel, p = r.player;
      if (edge !== AIR) return;
      if (s >= 60 && s < gapEnd()) lowInGap = Math.min(lowInGap, p.altitude);
      if (landing === null && p.landing && p.landing.time === r.elapsed) landing = s;
    } });
    const label = `${first}/${second}/${third}`;
    assert.equal(race.phase, 'finished', label);
    assert.deepEqual(edges, pathEdges(first, third, second), label);
    assert.deepEqual(checkpoints, [0, 1, 2, 3, 4], label);
    assert.equal(race.course.rejections, 0, label);
    assert.equal(race.player.falls, 0, label);
    if (second === AIR) {
      assert.ok(lowInGap >= 1, `${label}: lowest altitude over the gap ${lowInGap}`);
      assert.ok(landing !== null && landing >= gapEnd() && landing <= landingTo, `${label}: landed at ${landing}`);
    }
    const min = second === AIR ? AIR_BOT_MIN : BOT_MIN;
    assert.ok(race.result.time >= min && race.result.time <= BOT_MAX, `${label} finish ${race.result.time}s`);
  }
});
