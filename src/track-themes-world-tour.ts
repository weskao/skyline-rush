// 11B themed hazard data for the World Tour roads (Taipei, Tokyo, Alpine, Coastal, Cosmic).
import { place, closure, sweep, pulse, fall, hoop } from './themed-placement.ts';

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
  // Tokyo Afterdark: timed traffic-control gates, neon construction equipment and a lane of roadworks.
  tokyo: [
    place('tokyo', 'tokyo-signal-gate-1', 'gate', 600, -2.5, pulse(4, 0)),
    place('tokyo', 'tokyo-works-1', 'barrier', 1600, 7.5),
    place('tokyo', 'tokyo-signal-gate-2', 'gate', 2200, 2.5, pulse(4, 1.6)),
    place('tokyo', 'tokyo-works-2', 'barrier', 3300, -7.5),
    place('tokyo', 'tokyo-signal-gate-3', 'gate', 3800, -2.5, pulse(4, 3.2)),
    ...closure('tokyo', 'tokyo-roadworks', 4760, 7.5),
    place('tokyo', 'tokyo-signal-gate-4', 'gate', 6200, 2.5, pulse(4, 4.7)),
  ],
  // Alpine Rail Pass: snow drifts and warned avalanche debris dropping onto the open mountain road.
  // No rail crossing: a closed crossing would shut all four lanes.
  alpine: [
    place('alpine', 'alpine-avalanche-1', 'debris', 620, 2.5),
    place('alpine', 'alpine-avalanche-2', 'debris', 2600, -2.5, fall(10, 8, 0)),
    ...closure('alpine', 'alpine-drift-east', 2850, 7.5),
    place('alpine', 'alpine-avalanche-3', 'debris', 4400, -7.5),
    place('alpine', 'alpine-avalanche-4', 'debris', 5500, 2.5, fall(10, 8, Math.PI)),
    place('alpine', 'alpine-avalanche-5', 'debris', 6700, -2.5, fall(10, 8, 1.5)),
    place('alpine', 'alpine-avalanche-6', 'debris', 7200, 7.5),
  ],
  // Coastal Horizon: wave-spray gusts on the open stretches (never stacked on a crosswind),
  // lighthouse-side bridge works and sea-wall repairs, with the shoulder line kept open.
  coastal: [
    place('coastal', 'coastal-bridge-works-1', 'barrier', 560, 7.5),
    place('coastal', 'coastal-spray-1', 'gust', 1700, 0, { seed: 1, warningLeadSeconds: 2 }),
    ...closure('coastal', 'coastal-bridge-lane', 1500, 2.5),
    place('coastal', 'coastal-bridge-works-2', 'barrier', 1850, -7.5),
    place('coastal', 'coastal-bridge-works-3', 'barrier', 3600, 2.5),
    place('coastal', 'coastal-spray-2', 'gust', 5100, 0, { seed: 2, warningLeadSeconds: 2 }),
    ...closure('coastal', 'coastal-seawall', 4680, -7.5),
    place('coastal', 'coastal-bridge-works-4', 'barrier', 4900, -2.5),
    place('coastal', 'coastal-bridge-works-5', 'barrier', 5300, 7.5),
  ],
  // Cosmic Orbit: floating asteroid fragments and sweeping energy barriers between the solar winds.
  cosmic: [
    place('cosmic', 'cosmic-fragment-1', 'debris', 700, -2.5),
    place('cosmic', 'cosmic-barrier-1', 'energy-barrier', 1100, 4.6, sweep(3.5, 0)),
    place('cosmic', 'cosmic-fragment-2', 'debris', 2400, 7.5),
    place('cosmic', 'cosmic-barrier-2', 'energy-barrier', 2700, -4.6, sweep(4, 2)),
    place('cosmic', 'cosmic-fragment-3', 'debris', 4200, 2.5),
    place('cosmic', 'cosmic-barrier-3', 'energy-barrier', 4700, 4.6, sweep(3, 1)),
    place('cosmic', 'cosmic-fragment-4', 'debris', 5900, -7.5),
    place('cosmic', 'cosmic-barrier-4', 'energy-barrier', 7100, -4.6, sweep(4.5, 4)),
    // Aerial gate sequences: three spinning hoops climbing through each low-gravity sector.
    place('cosmic', 'cosmic-gate-1', 'ring', 3800, -2.5, hoop(5, 5)),
    place('cosmic', 'cosmic-gate-2', 'ring', 3920, 2.5, hoop(7, 5, Math.PI)),
    place('cosmic', 'cosmic-gate-3', 'ring', 4040, -2.5, hoop(9, 5)),
    place('cosmic', 'cosmic-gate-4', 'ring', 7350, 2.5, hoop(5, 5)),
    place('cosmic', 'cosmic-gate-5', 'ring', 7470, -2.5, hoop(7, 5, Math.PI)),
    place('cosmic', 'cosmic-gate-6', 'ring', 7590, 2.5, hoop(9, 5)),
  ],
};

// Themed road sections a race adds to the track's own when themes are on: Cosmic's low-gravity sectors
// sit on open road, clear of the solar winds, the shortcut and the hyperdrive tunnel.
export const WORLD_TOUR_THEMED_SECTIONS: Readonly<Record<string, readonly { from: number; to: number; type: string }[]>> = {
  cosmic: [{ from: 3700, to: 4150, type: 'low-gravity' }, { from: 7250, to: 7700, type: 'low-gravity' }],
};
