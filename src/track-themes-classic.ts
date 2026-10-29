// 11B themed hazard data for the classic tracks (Coast, Neon, Canyon, Aurora, Sky Spiral).
import { place, closure } from './themed-placement.ts';

export const CLASSIC_THEMED_PLACEMENTS: Readonly<Record<string, readonly unknown[]>> = {
  // Coast: cargo spilled from delivery trucks and temporary shoulder closures along the seafront.
  coast: [
    place('coast', 'coast-cargo-1', 'debris', 980, -2.5),
    place('coast', 'coast-cargo-2', 'debris', 1420, 7.5),
    ...closure('coast', 'coast-shoulder-east', 1760, 7.5),
    place('coast', 'coast-cargo-3', 'debris', 3080, 2.5),
    ...closure('coast', 'coast-shoulder-west', 3500, -7.5),
    place('coast', 'coast-cargo-4', 'debris', 4150, -7.5),
  ],
  // Neon Downtown: roadworks between the tunnels, a coned-off lane, a diversion and neon gates.
  neon: [
    place('neon', 'neon-works-1', 'barrier', 500, 2.5),
    ...closure('neon', 'neon-lane-closure', 2380, -7.5),
    place('neon', 'neon-works-2', 'barrier', 2520, -2.5),
    place('neon', 'neon-gate-1', 'gate', 2700, 7.5),
    ...closure('neon', 'neon-diversion', 3480, 7.5),
    place('neon', 'neon-works-3', 'barrier', 3600, -2.5),
    place('neon', 'neon-gate-2', 'gate', 3720, -7.5),
  ],
  // Canyon Skyway: rockfall and cliff-side debris, kept clear of the broken-bridge gaps.
  canyon: [
    place('canyon', 'canyon-rock-1', 'debris', 900, -2.5),
    place('canyon', 'canyon-rock-2', 'debris', 1250, 7.5),
    place('canyon', 'canyon-debris-1', 'debris', 2700, -7.5),
    place('canyon', 'canyon-rock-3', 'debris', 3500, 2.5),
    place('canyon', 'canyon-debris-2', 'debris', 4000, -7.5),
    place('canyon', 'canyon-rock-4', 'debris', 5100, 2.5),
  ],
  // Aurora Pass: snowbanks pushed onto alternating lanes, so a safer line is always open.
  aurora: [
    place('aurora', 'aurora-snowbank-1', 'debris', 700, 7.5),
    place('aurora', 'aurora-snowbank-2', 'debris', 1200, -7.5),
    place('aurora', 'aurora-snowbank-3', 'debris', 2100, 2.5),
    place('aurora', 'aurora-snowbank-4', 'debris', 3000, -2.5),
    place('aurora', 'aurora-snowbank-5', 'debris', 3900, 7.5),
    place('aurora', 'aurora-snowbank-6', 'debris', 4600, -7.5),
  ],
  // Sky Spiral: energy platform barriers and aerial gates on the helix, away from the launch gaps.
  spiral: [
    place('spiral', 'spiral-barrier-1', 'energy-barrier', 700, -2.5),
    place('spiral', 'spiral-gate-1', 'gate', 1500, 7.5),
    place('spiral', 'spiral-gate-2', 'gate', 1900, -7.5),
    place('spiral', 'spiral-barrier-2', 'energy-barrier', 2500, 2.5),
    place('spiral', 'spiral-barrier-3', 'energy-barrier', 3300, -2.5),
    place('spiral', 'spiral-gate-3', 'gate', 4200, 2.5),
  ],
};
