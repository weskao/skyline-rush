import test from 'node:test';
import assert from 'node:assert/strict';
import { hasSkyfallRoadContact } from '../src/courses/skyfall-archipelago.ts';
import { spec, AIRS, PATHS, botRace, expectedEdges } from './helpers/skyfall-archipelago-race-helpers.js';

// Measured at 60 Hz (no physics change): ground route 162.76 s; one flight edge 151.15-155.14 s, two 139.68-144.13 s,
// all three 132.10 s; lowest altitude over every gap 2.53 m; landings at a/b/c-air 869.9 / 630.8-632.1 / 990.4-991.4 m. The floor sits below the shortest measured path and
// above one that skipped a 2.9 km ground edge (~29 s); the ceiling catches a stall (Dune precedent).
const BOT_MIN = 120, BOT_MAX = 330;
test('all 8 path combinations finish with FLY pulses: a/b/c-merge then FINISH, landing on road only, 0 rejections', () => {
  for (const path of PATHS) {
    const landings = [], label = path.join('/');
    const { race, edges, checkpoints } = botRace(60, path, { trace: (r, you) => {
      const p = r.player;
      if (p.landing && p.landing.time === r.elapsed) landings.push([you.travel.currentEdgeId, you.travel.localS]);
    } });
    assert.equal(race.phase, 'finished', label);
    assert.deepEqual(edges, expectedEdges(path), label);
    assert.deepEqual(checkpoints, [0, 1, 2, 3], `${label}: a-merge, b-merge, c-merge in order`);
    assert.equal(race.course.rejections, 0, label);
    assert.equal(race.player.falls, 0, label);
    for (const [edge, s] of landings) assert.equal(hasSkyfallRoadContact(edge, s), true, `${label}: landed off-road on ${edge} at ${s}`);
    for (const air of path.filter(id => AIRS.includes(id))) {
      assert.ok(landings.some(([edge, s]) => edge === air && s >= spec().noRoad[air][0][1]), `${label}: landed on the ${air} pad`);
    }
    assert.ok(race.result.time >= BOT_MIN && race.result.time <= BOT_MAX, `${label} finish ${race.result.time}s`);
  }
});
