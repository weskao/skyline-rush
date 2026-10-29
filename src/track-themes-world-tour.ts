// 11B themed hazard data for the World Tour roads (Taipei, Tokyo, Alpine, Coastal, Cosmic).
import { place, closure } from './themed-placement.ts';

export const WORLD_TOUR_THEMED_PLACEMENTS: Readonly<Record<string, readonly unknown[]>> = {
  // Taipei Heritage: festival barricades and cone-lined boulevard closures, low enough to keep
  // the Presidential Office in view.
  taipei: [
    place('taipei', 'taipei-barricade-1', 'barrier', 620, -2.5),
    ...closure('taipei', 'taipei-boulevard-east', 1400, 7.5),
    place('taipei', 'taipei-barricade-2', 'barrier', 1700, 2.5),
    place('taipei', 'taipei-barricade-3', 'barrier', 2700, -7.5),
    ...closure('taipei', 'taipei-festival-west', 3700, -7.5),
    place('taipei', 'taipei-barricade-4', 'barrier', 5000, 2.5),
    place('taipei', 'taipei-barricade-5', 'barrier', 5600, -2.5),
  ],
};
