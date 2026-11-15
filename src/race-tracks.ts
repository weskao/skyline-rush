import { SKY_LENGTH } from './sky-track.ts';
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
    name: 'Canyon Skyway', length: 6000, trafficDensity: 1, seed: 3003, layoutVersion: 6, itemDensity: OPENING_ITEMS, openingNitroRings: 2, // volume was enough; only the first NITRO came late
    sections: [
      { from: 700, to: 1300, type: 'crosswind', dir: 1 }, { from: 1500, to: 1560, type: 'gap' },
      { from: 2000, to: 2500, type: 'shortcut', x: -7.5, altitude: 6 },
      { from: 3000, to: 3070, type: 'gap' }, { from: 3300, to: 4100, type: 'crosswind', dir: -1 },
      { from: 4400, to: 4470, type: 'gap' },
    ],
  },
  aurora: {
    name: 'Aurora Pass', length: 5500, trafficDensity: 1, seed: 4004, layoutVersion: 5, itemDensity: OPENING_ITEMS,
    sections: [
      { from: 900, to: 1500, type: 'ice' }, { from: 1800, to: 2600, type: 'uphill' }, { from: 2800, to: 3500, type: 'ice' },
      { from: 3800, to: 4200, type: 'uphill' }, { from: 4300, to: 4900, type: 'ice' },
      { from: 4920, to: 5380, type: 'shortcut', x: 7.5, altitude: 6 },
    ],
  },
  spiral: {
    name: 'Sky Spiral', length: SKY_LENGTH, trafficDensity: 0.75, seed: 5005, layoutVersion: 6, itemDensity: OPENING_ITEMS, openingNitroRings: 2, // difficulty curve: only the late first NITRO is fixed
    sections: [
      { from: 1100, to: 2200, type: 'spiral' },
      { from: 2800, to: 2870, type: 'launch' },
      { from: 2870, to: 2935, type: 'gap' },
      { from: 3700, to: 3775, type: 'launch' },
      { from: 3775, to: 3840, type: 'gap' },
      { from: 4550, to: 4630, type: 'launch' },
      { from: 4630, to: 4700, type: 'gap' },
      { from: 4950, to: 5450, type: 'shortcut', x: -7.5, altitude: 6 },
    ],
  },
  taipei: {"name":"Taipei Heritage","length":6200,"trafficDensity":1.1,"seed":6006,"layoutVersion":3,"sections":[{"from":850,"to":1200,"type":"tunnel"},{"from":1950,"to":2450,"type":"shortcut","x":-7.5,"altitude":6},{"from":3120,"to":3450,"type":"boost-tunnel"},{"from":4100,"to":4450,"type":"tunnel"}]},
  tokyo: {"name":"Tokyo Afterdark","length":6800,"trafficDensity":1.4,"seed":7007,"layoutVersion":3,"sections":[{"from":850,"to":1350,"type":"tunnel"},{"from":2450,"to":2950,"type":"shortcut","x":7.5,"altitude":6},{"from":4150,"to":4650,"type":"tunnel"},{"from":5050,"to":5450,"type":"boost-tunnel"}]},
  alpine: {"name":"Alpine Rail Pass","length":7600,"trafficDensity":0.8,"seed":8008,"layoutVersion":3,"sections":[{"from":900,"to":1420,"type":"uphill"},{"from":1600,"to":2200,"type":"tunnel"},{"from":3100,"to":3600,"type":"shortcut","x":-7.5,"altitude":6},{"from":3850,"to":4200,"type":"boost-tunnel"},{"from":4700,"to":5200,"type":"tunnel"},{"from":5900,"to":6400,"type":"uphill"}]},
  coastal: {"name":"Coastal Horizon","length":5800,"trafficDensity":1,"seed":9009,"layoutVersion":3,"sections":[{"from":850,"to":1300,"type":"crosswind","dir":1},{"from":2100,"to":2600,"type":"shortcut","x":7.5,"altitude":6},{"from":2950,"to":3310,"type":"boost-tunnel"},{"from":3950,"to":4600,"type":"crosswind","dir":-1}]},
  cosmic: {"name":"Cosmic Orbit","length":8000,"trafficDensity":0.65,"seed":1010,"layoutVersion":3,"sections":[{"from":1400,"to":1900,"type":"crosswind","dir":1},{"from":3000,"to":3500,"type":"shortcut","x":-7.5,"altitude":6},{"from":5100,"to":5600,"type":"crosswind","dir":-1},{"from":6100,"to":6540,"type":"boost-tunnel"}]},
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
