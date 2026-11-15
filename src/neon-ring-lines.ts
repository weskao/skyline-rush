import type { RingSpot } from './game-types.ts';

// Owner brief, 2026-11-15: one highlight per Neon Downtown sector past the boulevard, designed as one 10 km lap (the
// lap plan is in docs/designs/3d-pipeline/phases/task-5b-neon-downtown.md, steps 10 and 11). Authored design:
// .claude/rules/ring-layout.md. x is metres right of the centre line: the inside of a right-hander.
const ROAD = 2.5, LOW = 1.5; // ring altitudes: taken from the road / under the 4 m underpass roof

export const NEON_RING_LINES: readonly (readonly RingSpot[])[] = [
  // Rail underpass (tunnel 690-910): earn. The roof forbids FLY, so the inside line refills it; NITRO at the exit.
  [[720, 2.5, LOW, 'charge'], [780, 7.5, LOW, 'charge'], [840, 7.5, LOW, 'charge'], [900, 2.5, LOW, 'charge'], [940, -2.5, ROAD, 'nitro']],
  // Night market: kerb, centre, kerb. Each swing crosses two traffic lanes; NITRO waits at the kerbs. The swings go
  // with the S-bends (left-hander to 1454, then a right-hander): a fast car runs wide at up to 2.8 m/s, and steering
  // against that at NITRO speed cannot make the next ring. 70 m apart: 60 m is too short to reverse the steering.
  [[1294, -7.5, ROAD, 'nitro'], [1364, 0, ROAD, 'charge'], [1434, 7.5, ROAD, 'nitro'], [1504, 0, ROAD, 'charge'], [1574, -7.5, ROAD, 'nitro']],
  // Expressway: spend. A NITRO ring pays 1.25 s, 147 m at NITRO speed; one every 125 m keeps the burn lit. The burn
  // lane is the inside lane of the sweep, the lane the shortcut corridor (2200-2700, x 7.5, 6 m up) lets out into,
  // and starts 300 m past it, so a car gliding out is low enough. A charge ring ends it: FLY fuel for later. Not
  // a full-width row: with two authored rows a race, rows outnumber trains across the game (tests/ring-rows.test.js).
  [[3000, 7.5, ROAD, 'nitro'], [3125, 7.5, ROAD, 'nitro'], [3250, 7.5, ROAD, 'charge'], [3375, 7.5, ROAD, 'nitro'], [3500, 7.5, ROAD, 'charge']],
  // Harbour (provisional sector; crosswind 4500-5300 toward +x): spend most. The windward lane, so the wind pushes a
  // car that stops steering off the line, never onto it. The first ring is 60 m into the wind: the approach rings
  // (ring-layout.ts) bring the car to the lane before it starts. One ring a second, a charge for the bridge at the end.
  [[4560, -7.5, ROAD, 'nitro'], [4685, -7.5, ROAD, 'nitro'], [4810, -7.5, ROAD, 'nitro'], [4935, -7.5, ROAD, 'nitro'], [5060, -7.5, ROAD, 'nitro'],
    [5185, -7.5, ROAD, 'nitro'], [5310, -7.5, ROAD, 'charge']],
  // Canal bridge (deck 6433.5-6566.5, clear opening 27 m wide and 14 m high): FLY over the crown at 6500. The first
  // ring is 6.5 m up and the far side comes down gently: a gliding car sinks slowly and would overfly a lower ring.
  [[6380, 0, 6.5, 'charge'], [6440, 0, 8, 'nitro'], [6500, 0, 9.5, 'risk'], [6560, 0, 8.5, 'nitro'], [6620, 0, 7.5, 'charge']],
  // Oldtown (provisional sector; S-bends left 7338, right 7498, left 7813, right 8128-8288): earn. One lane over per
  // ring, always to the outside of the bend it sits in; NITRO where a swing ends at the kerb. The 170 m gap clears the
  // swinging gate at 7813. The last ring points at the rooftop corridor (8290, over the left lane).
  [[7350, -2.5, ROAD, 'charge'], [7420, 2.5, ROAD, 'charge'], [7490, 7.5, ROAD, 'nitro'], [7570, 2.5, ROAD, 'charge'], [7650, -2.5, ROAD, 'charge'],
    [7730, -7.5, ROAD, 'nitro'], [7900, -2.5, ROAD, 'charge'], [7980, 2.5, ROAD, 'charge'], [8060, 7.5, ROAD, 'nitro'], [8140, 2.5, ROAD, 'charge'],
    [8210, -2.5, ROAD, 'slipstream']],
  // Violet Plaza: bow out along the sculpture court (9340-9460, left of the road), clip the inside of the last corner,
  // gate before the line.
  [[9220, 2.5, ROAD, 'charge'], [9280, -2.5, ROAD, 'slipstream'], [9340, -7.5, ROAD, 'charge'], [9400, -7.5, ROAD, 'nitro'], [9460, -7.5, ROAD, 'charge'],
    [9520, -2.5, ROAD, 'slipstream'], [9580, 2.5, ROAD, 'charge'], [9650, 2.5, ROAD, 'slipstream'], [9720, 7.5, ROAD, 'nitro'], [9820, 2.5, ROAD, 'slipstream'],
    [9920, 'row', ROAD, 'slipstream']],
];
