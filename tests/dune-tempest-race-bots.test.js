import test from 'node:test';
import assert from 'node:assert/strict';
import { PATHS, BOT_MIN, BOT_MAX, botRace, pathEdges } from './helpers/dune-tempest-race-helpers.js';

// Measured at 60 Hz on the shared engine (no physics change), throttle + BOOST held: 139.16 s winding-wadi/natural-arch-pass
// (the ground route, 13,930 m), 136.30 s winding-wadi/dry-wash-cut, 136.35 s dune-crest-cut/natural-arch-pass, 133.48 s
// dune-crest-cut/dry-wash-cut; rivals finish in 159-200 s. The planned 150 s floor was an unmeasured hypothesis (Frostbite
// precedent): the floor sits below the shortest measured path and above a skipped branch (canyon-switchbacks alone is
// 3,672 m ≈ 37 s), the ceiling catches a stall.
test('a throttle+BOOST bot finishes START → FINISH on all four ground-only paths at 60 Hz', () => {
  for (const [first, third] of PATHS) {
    const { race, edges, checkpoints } = botRace(60, [first, third]), label = `${first}/${third}`;
    assert.equal(race.phase, 'finished', label);
    assert.deepEqual(edges, pathEdges(first, third), label);
    assert.deepEqual(checkpoints, [0, 1, 2, 3, 4], `${label}: cp1..cp4 in order`);
    assert.equal(race.course.rejections, 0, label);
    const { position, time } = race.result;
    assert.ok(Number.isInteger(position) && position >= 1 && position <= 8, `${label} position ${position}`);
    assert.equal(position, 1 + race.rivals.filter(r => r.finishTime !== null && r.finishTime < time).length, label);
    assert.ok(time >= BOT_MIN && time <= BOT_MAX, `${label} finish ${time}s`);
  }
});

// Measured on the ground route: 139.276 / 139.159 / 139.102 s at 30 / 60 / 120 Hz (spread 0.17 s; ≤ 0.17 s on all
// four paths). The finish is interpolated at the gate; the spread is the engine's own per-Hz integration. Traffic is
// left out: car contacts are frame-discrete in the shared engine (2026-11-09: 1.1 s spread with traffic, 0.02 s without;
// rings and pickups change nothing), so they would measure collisions, not the graph integration.
const HZ_TOLERANCE = 0.5; // s
test('the bot finish time agrees at 30, 60 and 120 Hz', () => {
  const times = [30, 60, 120].map(hz => {
    const { race } = botRace(hz, PATHS[0], { traffic: false });
    assert.equal(race.phase, 'finished', `${hz} Hz`);
    assert.equal(race.course.rejections, 0, `${hz} Hz`);
    return race.result.time;
  });
  for (const time of times) assert.ok(Math.abs(time - times[1]) <= HZ_TOLERANCE, `30/60/120 Hz: ${times.join(' / ')} s`);
});
