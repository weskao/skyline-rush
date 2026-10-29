// 11B themed hazard data for the classic tracks (Coast, Neon, Canyon, Aurora, Sky Spiral).
import { place, closure, sweep, pulse, fall, hoop } from './themed-placement.ts';

export const CLASSIC_THEMED_PLACEMENTS: Readonly<Record<string, readonly unknown[]>> = {
  // Coast: cargo spilled from delivery trucks, warned sea gusts and temporary shoulder closures along the seafront.
  coast: [
    place('coast', 'coast-cargo-1', 'debris', 980, -2.5),
    place('coast', 'coast-cargo-2', 'debris', 1420, 7.5),
    place('coast', 'coast-gust-1', 'gust', 1200, 0, { seed: 1, warningLeadSeconds: 2 }),
    ...closure('coast', 'coast-shoulder-east', 1760, 7.5),
    place('coast', 'coast-cargo-3', 'debris', 3080, 2.5),
    ...closure('coast', 'coast-shoulder-west', 3500, -7.5),
    place('coast', 'coast-gust-2', 'gust', 3900, 0, { seed: 2, warningLeadSeconds: 2 }),
    place('coast', 'coast-cargo-4', 'debris', 4150, -7.5),
  ],
  // Neon Downtown: roadworks barriers sliding between two lanes on a slow 6 s cycle, a coned-off lane, a diversion
  // and neon gates that swing on a quicker 4 s beat, opening one lane while closing the other.
  neon: [
    place('neon', 'neon-works-1', 'barrier', 500, 4.6, sweep(6)),
    ...closure('neon', 'neon-lane-closure', 2380, -7.5),
    place('neon', 'neon-works-2', 'barrier', 2520, -4.6, sweep(6, Math.PI)),
    place('neon', 'neon-gate-1', 'gate', 2700, 4.6, sweep(4)),
    ...closure('neon', 'neon-diversion', 3480, 7.5),
    place('neon', 'neon-works-3', 'barrier', 3600, -4.6, sweep(6)),
    place('neon', 'neon-gate-2', 'gate', 3720, -4.6, sweep(4, Math.PI)),
  ],
  // Canyon Skyway: warned rockfall and cliff-side debris, kept clear of the broken-bridge gaps. A precision
  // launch ramp 36 m before each broken bridge is the risky line: hit it fast and the car jumps the gap without FLY.
  canyon: [
    place('canyon', 'canyon-ramp-1', 'ramp', 1464, -2.5),
    place('canyon', 'canyon-ramp-2', 'ramp', 2964, 2.5),
    place('canyon', 'canyon-ramp-3', 'ramp', 4364, -2.5),
    place('canyon', 'canyon-rock-1', 'debris', 900, -2.5, fall(10, 8)),
    place('canyon', 'canyon-rock-2', 'debris', 1250, 7.5),
    place('canyon', 'canyon-debris-1', 'debris', 2700, -7.5),
    place('canyon', 'canyon-rock-3', 'debris', 3500, 2.5, fall(10, 8, Math.PI)),
    place('canyon', 'canyon-debris-2', 'debris', 4000, -7.5),
    place('canyon', 'canyon-rock-4', 'debris', 5100, 2.5),
  ],
  // Aurora Pass: snowbanks and low-grip ice patches on alternating lanes, so a safer line is always open.
  aurora: [
    place('aurora', 'aurora-snowbank-1', 'debris', 700, 7.5),
    place('aurora', 'aurora-snowbank-2', 'debris', 1200, -7.5),
    place('aurora', 'aurora-ice-1', 'terrain', 1350, 2.5),
    place('aurora', 'aurora-snowbank-3', 'debris', 2100, 2.5),
    place('aurora', 'aurora-snowbank-4', 'debris', 3000, -2.5),
    place('aurora', 'aurora-ice-2', 'terrain', 3200, 7.5),
    place('aurora', 'aurora-ice-3', 'terrain', 4450, -2.5),
    place('aurora', 'aurora-snowbank-5', 'debris', 3900, 7.5),
    place('aurora', 'aurora-snowbank-6', 'debris', 4600, -7.5),
  ],
  // Sky Spiral: energy platform barriers and aerial gates on the helix, away from the launch gaps, plus
  // spinning light hoops 6 m up that pay the risk-ring score for a precise airborne line.
  spiral: [
    place('spiral', 'spiral-hoop-1', 'ring', 1100, 2.5, hoop(6, 4)),
    place('spiral', 'spiral-hoop-2', 'ring', 1700, -2.5, hoop(6, 4, Math.PI)),
    place('spiral', 'spiral-hoop-3', 'ring', 2200, 2.5, hoop(6, 4)),
    place('spiral', 'spiral-hoop-4', 'ring', 3450, -2.5, hoop(6, 4, Math.PI)),
    place('spiral', 'spiral-hoop-5', 'ring', 4350, 0, hoop(6, 4)),
    place('spiral', 'spiral-barrier-1', 'energy-barrier', 700, -2.5, pulse(3)),
    place('spiral', 'spiral-gate-1', 'gate', 1500, 4.6, sweep(5)),
    place('spiral', 'spiral-gate-2', 'gate', 1900, -4.6, sweep(5, Math.PI)),
    place('spiral', 'spiral-barrier-2', 'energy-barrier', 2500, 2.5),
    place('spiral', 'spiral-barrier-3', 'energy-barrier', 3300, -2.5, pulse(3, Math.PI)),
    place('spiral', 'spiral-gate-3', 'gate', 4200, 2.5),
  ],
};
