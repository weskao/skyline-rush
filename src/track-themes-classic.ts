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
};
