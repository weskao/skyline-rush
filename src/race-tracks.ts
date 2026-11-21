import { CANYON_GAP, CANYON_LENGTH, profileLength } from './track-profile-road.ts';
import { SKY_JUMPS, SKY_LENGTH, SKY_SPIRAL } from './sky-track.ts';
import { CIRCUIT_ID, CIRCUIT_TRACK } from './circuit-track.ts';
import type { TrackConfig } from './game-types.ts';
import { FROSTBITE_ID, FROSTBITE_TRACK } from './courses/frostbite-race.ts';
import { STORMLINE_ID, STORMLINE_TRACK } from './courses/stormline-megacity-race.ts';
import { VOLCANIC_ID, VOLCANIC_TRACK } from './courses/volcanic-crown-race.ts';
import { MONSOON_ID, MONSOON_TRACK } from './courses/monsoon-ruins-race.ts';
import { COURSE_RUNTIMES } from './course-runtimes.ts';
import { NEON_RING_LINES } from './neon-ring-lines.ts';

// Special sections are { from, to, type } in metres; `dir` (+1 / -1) is the crosswind direction,
// `x` / `altitude` place a shortcut corridor.
// Classic layout v2 (Coast, Neon, Canyon): denser, more rewarding rings, tuned by scripts/pickup-economy.mjs to
// the World Tour BOOST/NITRO median. Every other track keeps the defaults bit-for-bit.
// User, 2026-11-13: the first five maps (Coast → Sky Spiral) felt sparse, so they carry 40% more ring and pickup
// slots (a new layoutVersion each).
const OPENING_ITEMS = 1.4;
// Keep the number of full-width rows and trains in check as the longer profiles add item slots.
const PROFILE_RING_SHAPES = [.065, .23] as const;
const BOOST_ODDS = [0.4, 0.7, 0.8, 0.9] as const; // charge 40%, nitro 30%, slipstream 10%, risk 10%, mystery 10% (unchanged)
export const RACE_TRACKS: Record<string, TrackConfig> = {
  coast: { // fixedRings: the original gate heights (8 m, then road height 3 m) on any lane
    name: 'Coast', length: 5000, trafficDensity: 1, seed: 1001, layoutVersion: 6, itemDensity: OPENING_ITEMS, fixedRings: true, ringAltitudes: [8, 3], ringOdds: BOOST_ODDS, introRivals: true, // the first, easiest map
    sections: [{ from: 2200, to: 2700, type: 'shortcut', x: -7.5, altitude: 6 }],
  },
  neon: {
    // Owner, 2026-11-15: 4000 m was a 36 s lap, so the lap is 10 km (one lap, never two). 2.5 times the road carries
    // 2.5 times the item slots, so pickups keep their per-km density; layout 7 never shipped, so it stays 7.
    name: 'Neon Downtown', length: 10000, trafficDensity: 1.5, seed: 2002, layoutVersion: 7, itemDensity: OPENING_ITEMS * 2.5, ringOdds: BOOST_ODDS, introRivals: true, // an early, easy map
    // The only tunnel is the rail underpass in the first right-hander. One mechanic per sector: the market corridor,
    // the sea wind across the harbour straight, the rooftop cut inside the old town's last left-hander.
    sections: [
      { from: 690, to: 910, type: 'tunnel' }, { from: 2200, to: 2700, type: 'shortcut', x: 7.5, altitude: 6 },
      { from: 4500, to: 5300, type: 'crosswind', dir: 1 }, { from: 8290, to: 8750, type: 'shortcut', x: -7.5, altitude: 6 },
    ],
    ringLines: NEON_RING_LINES, // owner brief, 2026-11-15: one highlight per sector
    // Seven lines take 2.9 km of the lap from the random rings, so the rest carries 1.45 times the slots: 23 rings a
    // km (the owner asked for 22 or more; 17 before). Rings only: pickups keep the classic density per km.
    ringDensity: 1.45,
    // Fewer random rows, more trains: 10 km of the default odds tipped the game-wide share of rows over one in three
    // shapes (tests/ring-rows.test.js), and a train is the readable way to add rings.
    shapeOdds: [0.04, 0.4],
  },
  canyon: {
    name: 'Canyon Skyway', length: CANYON_LENGTH, trafficDensity: 1, seed: 3003, layoutVersion: 7,
    itemDensity: OPENING_ITEMS * CANYON_LENGTH / 6000, openingNitroRings: 2,
    ringDensity: .86, // keep ring takes and NITRO per minute near the previous Canyon pace
    sections: [
      { from: 1650, to: 2200, type: 'crosswind', dir: 1 },
      CANYON_GAP,
      { from: 5300, to: 5800, type: 'shortcut', x: -7.5, altitude: 6 },
      { from: 7750, to: 8380, type: 'crosswind', dir: -1 },
    ],
  },
  aurora: {
    name: 'Aurora Pass', length: profileLength('aurora'), trafficDensity: 1, seed: 4004, layoutVersion: 6,
    itemDensity: OPENING_ITEMS * profileLength('aurora') / 5500, ringDensity: .77,
    shapeOdds: PROFILE_RING_SHAPES,
    sections: [
      { from: 900, to: 1680, type: 'ice' }, { from: 2200, to: 2960, type: 'uphill' },
      { from: 4060, to: 4440, type: 'tunnel' }, { from: 5190, to: 5740, type: 'uphill' },
      { from: 7760, to: 8550, type: 'ice' }, { from: 9020, to: 9520, type: 'shortcut', x: 7.5, altitude: 6 },
    ],
  },
  spiral: {
    name: 'Sky Spiral', length: SKY_LENGTH, trafficDensity: .75, seed: 5005, layoutVersion: 7,
    itemDensity: OPENING_ITEMS * SKY_LENGTH / 5600, ringDensity: .82, openingNitroRings: 2,
    shapeOdds: PROFILE_RING_SHAPES,
    sections: [
      { from: SKY_SPIRAL.start, to: SKY_SPIRAL.end, type: 'spiral' },
      ...SKY_JUMPS.flatMap(({ rampFrom, rampTo, gapFrom, gapTo }) => [
        { from: rampFrom, to: rampTo, type: 'launch' }, { from: gapFrom, to: gapTo, type: 'gap' },
      ] as const),
      { from: 7220, to: 7720, type: 'shortcut', x: -7.5, altitude: 6 },
    ],
  },
  taipei: {
    name: 'Taipei Heritage', length: profileLength('taipei'), trafficDensity: 1.1, seed: 6006, layoutVersion: 4,
    itemDensity: profileLength('taipei') / 6200, ringDensity: .78,
    shapeOdds: PROFILE_RING_SHAPES,
    sections: [
      { from: 1950, to: 2450, type: 'shortcut', x: -7.5, altitude: 6 }, { from: 2780, to: 3130, type: 'tunnel' },
      { from: 3400, to: 3730, type: 'boost-tunnel' }, { from: 6930, to: 7280, type: 'tunnel' },
    ],
  },
  tokyo: {
    name: 'Tokyo Afterdark', length: profileLength('tokyo'), trafficDensity: 1.4, seed: 7007, layoutVersion: 4,
    itemDensity: profileLength('tokyo') / 6800, ringDensity: .96,
    shapeOdds: PROFILE_RING_SHAPES,
    sections: [
      { from: 850, to: 1350, type: 'tunnel' }, { from: 2450, to: 2950, type: 'shortcut', x: 7.5, altitude: 6 },
      { from: 4880, to: 5520, type: 'boost-tunnel' }, { from: 8220, to: 8900, type: 'boost-tunnel' },
    ],
  },
  alpine: {
    name: 'Alpine Rail Pass', length: profileLength('alpine'), trafficDensity: .8, seed: 8008, layoutVersion: 4,
    itemDensity: profileLength('alpine') / 7600, ringDensity: .9,
    shapeOdds: PROFILE_RING_SHAPES,
    sections: [
      { from: 900, to: 1420, type: 'uphill' }, { from: 1600, to: 2200, type: 'tunnel' },
      { from: 3100, to: 3600, type: 'shortcut', x: -7.5, altitude: 6 }, { from: 4430, to: 4860, type: 'tunnel' },
      { from: 5010, to: 5360, type: 'boost-tunnel' }, { from: 5380, to: 5760, type: 'uphill' },
    ],
  },
  coastal: {
    name: 'Coastal Horizon', length: profileLength('coastal'), trafficDensity: 1, seed: 9009, layoutVersion: 4,
    itemDensity: profileLength('coastal') / 5800, ringDensity: .78,
    shapeOdds: PROFILE_RING_SHAPES,
    sections: [
      { from: 2890, to: 3380, type: 'crosswind', dir: 1 }, { from: 4250, to: 4750, type: 'shortcut', x: 7.5, altitude: 6 },
      { from: 5780, to: 6140, type: 'boost-tunnel' }, { from: 6520, to: 7140, type: 'crosswind', dir: -1 },
    ],
  },
  cosmic: {
    name: 'Cosmic Orbit', length: profileLength('cosmic'), trafficDensity: .65, seed: 1010, layoutVersion: 4,
    itemDensity: profileLength('cosmic') / 8000, ringDensity: .9,
    shapeOdds: PROFILE_RING_SHAPES,
    sections: [
      { from: 1400, to: 1900, type: 'crosswind', dir: 1 }, { from: 3000, to: 3500, type: 'shortcut', x: -7.5, altitude: 6 },
      { from: 5060, to: 5500, type: 'boost-tunnel' }, { from: 6570, to: 7100, type: 'crosswind', dir: -1 },
    ],
  },
};

// User, 2026-11-09: a new course (any `topology`) keeps the classic per-km ring/pickup density: its per-car item count
// scales by length / the mean classic length. Classic tracks use their own itemDensity (default 1).
// Frozen at the ten classic lengths as they stood when the long-form courses were tuned (Neon 4000 m): a classic track
// changing length must not re-scale them (tests/course-item-density.test.js, *long-form courses keep their item counts*).
const CLASSIC_MEAN_LENGTH = 6050;
export const itemScale = (track: TrackConfig): number =>
  track.topology === 'course-graph' || track.topology === 'course-graph-runtime' ? track.length / CLASSIC_MEAN_LENGTH : track.itemDensity ?? 1;

// The separate lookup never changes Daily/Career/Cup's ordered sprint catalog.
// Frostbite, Stormline, Volcanic and Monsoon (measured routes) plus the per-car graph runtimes are gated CourseGraph sprints:
// raceable by id, never in the catalog, Daily or Cup.
/** CourseGraph sprints outside the catalog whose results persist under a topology-keyed id (`record-layout.ts`). */
export const COURSE_TRACKS: Readonly<Record<string, TrackConfig & { topologyVersion: number }>> = {
  [FROSTBITE_ID]: FROSTBITE_TRACK, [STORMLINE_ID]: STORMLINE_TRACK, [VOLCANIC_ID]: VOLCANIC_TRACK, [MONSOON_ID]: MONSOON_TRACK,
  ...Object.fromEntries(Object.entries(COURSE_RUNTIMES).map(([id, entry]) => [id, entry.track])),
};
export const raceTrack = (id: string): TrackConfig | undefined => id === CIRCUIT_ID ? CIRCUIT_TRACK : Object.hasOwn(COURSE_TRACKS, id) ? COURSE_TRACKS[id] : RACE_TRACKS[id];

export const isModeTrack = (id: unknown, mode: unknown): id is string => typeof id === 'string' &&
  (mode === 'circuit' ? id === CIRCUIT_ID : Object.hasOwn(RACE_TRACKS, id) || (mode !== 'classic' && Object.hasOwn(COURSE_TRACKS, id)));

/** Circuit keeps its own loop; approved CourseGraph courses can reuse existing race modes in dev. */
export function assertTrackMode(trackId: string, mode: string): void {
  if ((trackId === CIRCUIT_ID) !== (mode === 'circuit')) throw new RangeError('Circuit mode requires a circuit route');
}
