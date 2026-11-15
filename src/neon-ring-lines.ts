import type { RingSpot } from './game-types.ts';

// Owner brief, 2026-11-15: one highlight per Neon Downtown sector, designed as one lap (the lap plan is in
// docs/designs/3d-pipeline/phases/task-5b-neon-downtown.md, step 10). Authored design: .claude/rules/ring-layout.md.
// x is metres right of the centre line; every corner of the lap turns right, so +x is the inside.
const ROAD = 2.5, LOW = 1.5; // ring altitudes: taken from the road / under the 4 m underpass roof

export const NEON_RING_LINES: readonly (readonly RingSpot[])[] = [
  // Rail underpass (tunnel 470-690): earn. The roof forbids FLY, so the inside line refills it; NITRO at the exit.
  [[500, 2.5, LOW, 'charge'], [560, 7.5, LOW, 'charge'], [620, 7.5, LOW, 'charge'], [680, 2.5, LOW, 'charge'], [720, -2.5, ROAD, 'nitro']],
  // Night market: kerb, centre, kerb. Each swing crosses two traffic lanes; NITRO waits at the kerbs. The swings go
  // with the S-bends (left-hander to 950, then a right-hander): a fast car runs wide at up to 2.8 m/s, and steering
  // against that at NITRO speed cannot make the next ring. 70 m apart: 60 m is too short to reverse the steering.
  [[790, -7.5, ROAD, 'nitro'], [860, 0, ROAD, 'charge'], [930, 7.5, ROAD, 'nitro'], [1000, 0, ROAD, 'charge'], [1070, -7.5, ROAD, 'nitro']],
  // Expressway: spend. A NITRO ring pays 1.25 s, 147 m at NITRO speed; one every 125 m keeps the burn lit. The burn
  // lane is the inside lane of the sweep, the lane the shortcut corridor (1150-1650, x 7.5, 6 m up) lets out into,
  // and starts 150 m past it, so a car gliding out is low enough. A charge ring ends it: FLY fuel for the bridge. Not
  // a full-width row: with two authored rows a race, rows outnumber trains across the game (tests/ring-rows.test.js).
  [[1800, 7.5, ROAD, 'nitro'], [1925, 7.5, ROAD, 'nitro'], [2050, 7.5, ROAD, 'charge'], [2175, 7.5, ROAD, 'nitro'], [2300, 7.5, ROAD, 'charge']],
  // Canal bridge (deck 2591.5-2724.5, clear opening 27 m wide and 14 m high): FLY over the crown at 2658. The first
  // ring is 6.5 m up and the far side comes down gently: a gliding car sinks slowly and would overfly a lower ring.
  [[2538, 0, 6.5, 'charge'], [2598, 0, 8, 'nitro'], [2658, 0, 9.5, 'risk'], [2718, 0, 8.5, 'nitro'], [2778, 0, 7.5, 'charge']],
  // Violet Plaza: bow out along the sculpture court (3340-3460, left of the road), clip the inside of the last corner,
  // gate before the line.
  [[3220, 2.5, ROAD, 'charge'], [3280, -2.5, ROAD, 'slipstream'], [3340, -7.5, ROAD, 'charge'], [3400, -7.5, ROAD, 'nitro'], [3460, -7.5, ROAD, 'charge'],
    [3520, -2.5, ROAD, 'slipstream'], [3580, 2.5, ROAD, 'charge'], [3650, 2.5, ROAD, 'slipstream'], [3720, 7.5, ROAD, 'nitro'], [3820, 2.5, ROAD, 'slipstream'],
    [3920, 'row', ROAD, 'slipstream']],
];
