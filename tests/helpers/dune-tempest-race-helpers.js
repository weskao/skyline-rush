import assert from 'node:assert/strict';
import { PLAYABLE_COURSE_GRAPH as graph } from '../../src/courses/dune-tempest-runtime-adapter.ts';
import { DUNE_TEMPEST_ID, DUNE_TEMPEST_RACE } from '../../src/courses/dune-tempest-race.ts';
import { createRace, startRace, stepRace } from '../../src/game.js';
import { chooseBranchByLateral } from '../../src/course-race.ts';

// Shared by the Dune race simulation test files (dune-tempest-race*.test.js).
export const AIR = 'canyon-air-crossing';
export const SWITCHBACKS = 'canyon-switchbacks';
export const BOT_MIN = 120, BOT_MAX = 330;
const PLAYER_DEADBAND = 2.5;
export const courseOf = race => { assert.ok(race.course, 'createRace attaches race.course'); return race.course; };
export const laneFor = (incoming, edge) => [0, -5, 5].find(x => chooseBranchByLateral(graph, incoming, x, PLAYER_DEADBAND) === edge);
export const pathEdges = (first, third, second = 'canyon-switchbacks') => ['sunset-start', 'dune-s-bends', first, 'rock-gate-descent',
  'canyon-approach', second, 'stone-ring-corridor', 'sandstorm-climb', third, 'stone-ring-outlet', 'finish-sprint'];
export const PATHS = [['winding-wadi', 'natural-arch-pass'], ['winding-wadi', 'dry-wash-cut'],
  ['dune-crest-cut', 'natural-arch-pass'], ['dune-crest-cut', 'dry-wash-cut']];

// Throttle + BOOST bot holding x on the side of its chosen branch before split1/split2/split3 and centred elsewhere.
// Toward the flight edge it drops BOOST on canyon-approach (the tank refills on the ground) and, on the flight edge,
// pulses FLY with a vertical-speed P-controller holding ~2.5 m until the gap ends, then glides onto the landing pad.
export const gapEnd = () => DUNE_TEMPEST_RACE.noRoad[AIR][0][1];
export function botRace(hz, [first, third], { second = 'canyon-switchbacks', pilot = true, trace = null, traffic = true } = {}) {
  const race = createRace(DUNE_TEMPEST_ID), dt = 1 / hz;
  if (!traffic) { for (const car of race.traffic) race.course.cars.delete(car.id); race.traffic = []; }
  startRace(race);
  while (race.phase === 'countdown') stepRace(race, {}, dt);
  const you = courseOf(race).cars.get('YOU'), edges = [you.travel.currentEdgeId], checkpoints = [0];
  const lane = { 'dune-s-bends': laneFor('dune-s-bends', first), 'canyon-approach': laneFor('canyon-approach', second),
    'sandstorm-climb': laneFor('sandstorm-climb', third) };
  for (let i = 0; race.phase === 'racing' && i < hz * 400; i++) {
    const edge = you.travel.currentEdgeId, air = edge === AIR, p = race.player;
    p.x = lane[edge] ?? 0;
    const fly = pilot && air && you.travel.localS < gapEnd() && p.verticalSpeed < Math.min(7, 3 * (2.5 - p.altitude));
    stepRace(race, { throttle: true, boost: !(second === AIR && (edge === 'canyon-approach' || air)), fly }, dt);
    trace?.(race, you);
    if (edges.at(-1) !== you.travel.currentEdgeId) edges.push(you.travel.currentEdgeId);
    if (checkpoints.at(-1) !== you.travel.nextCheckpoint) checkpoints.push(you.travel.nextCheckpoint);
  }
  return { race, edges, checkpoints };
}
