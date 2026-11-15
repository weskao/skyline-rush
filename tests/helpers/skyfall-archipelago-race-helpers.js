import assert from 'node:assert/strict';
import { PLAYABLE_COURSE_GRAPH as graph } from '../../src/courses/skyfall-archipelago-runtime-adapter.ts';
import { COURSE_RUNTIMES } from '../../src/course-runtimes.ts';
import { createRace, startRace, stepRace } from '../../src/game.js';
import { chooseBranchByLateral } from '../../src/course-race.ts';

// Shared by the Skyfall race simulation test files (skyfall-archipelago-race*.test.js).
export const ID = 'skyfall-archipelago';
export const entry = () => { const e = COURSE_RUNTIMES[ID]; assert.ok(e, 'Skyfall registered in COURSE_RUNTIMES'); return e; };
export const spec = () => entry().spec;
export const AIRS = ['a-air', 'b-air', 'c-air'];
export const GROUNDS = ['a-ground', 'b-ground', 'c-ground'];
export const INCOMING = ['approach', 'midway-one', 'midway-two'];

// Bot: throttle; holds the lane that picks its branch on each incoming edge; toward a flight edge it drops BOOST on
// the incoming and flight edge and pulses FLY (vertical-speed P-controller holding ~2.5 m) until the gap ends.
export const laneFor = (incoming, edge) => [0, -5, 5].find(x => chooseBranchByLateral(graph, incoming, x, 2.5) === edge);
export const PATHS = [0, 1, 2, 3, 4, 5, 6, 7].map(bits => [0, 1, 2].map(i => (bits >> i) & 1 ? AIRS[i] : GROUNDS[i]));
export function botRace(hz, path, { pilot = true, trace = null } = {}) {
  const race = createRace(ID), dt = 1 / hz;
  startRace(race);
  while (race.phase === 'countdown') stepRace(race, {}, dt);
  const you = race.course.cars.get('YOU'), edges = [you.travel.currentEdgeId], checkpoints = [0];
  const lane = Object.fromEntries(INCOMING.map((id, i) => [id, laneFor(id, path[i])]));
  const towardAir = Object.fromEntries(INCOMING.map((id, i) => [id, AIRS.includes(path[i])]));
  for (let i = 0; race.phase === 'racing' && i < hz * 400; i++) {
    const edge = you.travel.currentEdgeId, air = AIRS.includes(edge), p = race.player;
    p.x = lane[edge] ?? 0;
    const gapEnd = air ? spec().noRoad[edge][0][1] : 0;
    const fly = pilot && air && you.travel.localS < gapEnd && p.verticalSpeed < Math.min(7, 3 * (2.5 - p.altitude));
    stepRace(race, { throttle: true, boost: !(air || towardAir[edge]), fly }, dt);
    trace?.(race, you);
    if (edges.at(-1) !== you.travel.currentEdgeId) edges.push(you.travel.currentEdgeId);
    if (checkpoints.at(-1) !== you.travel.nextCheckpoint) checkpoints.push(you.travel.nextCheckpoint);
  }
  return { race, edges, checkpoints };
}
export const expectedEdges = path => ['approach', path[0], 'midway-one', path[1], 'midway-two', path[2], 'descent'];
