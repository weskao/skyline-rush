import { CIRCUIT_ID, CIRCUIT_TRACK } from './circuit-track.ts';
import type { TrackConfig } from './game-types.ts';
import { FROSTBITE_ID, FROSTBITE_TRACK } from './courses/frostbite-race.ts';
import { STORMLINE_ID, STORMLINE_TRACK } from './courses/stormline-megacity-race.ts';
import { VOLCANIC_ID, VOLCANIC_TRACK } from './courses/volcanic-crown-race.ts';
import { MONSOON_ID, MONSOON_TRACK } from './courses/monsoon-ruins-race.ts';
import { COURSE_RUNTIMES } from './course-runtimes.ts';

// Special sections are { from, to, type } in metres; `dir` (+1 / -1) is the crosswind direction,
// `x` / `altitude` place a shortcut corridor.
// Classic layout v2 (Coast, Neon, Canyon): denser, more rewarding rings, tuned by scripts/pickup-economy.mjs to
// the World Tour BOOST/NITRO median. Every other track keeps the defaults bit-for-bit.
const BOOST_ODDS = [0.4, 0.7, 0.8, 0.9] as const; // charge 40%, nitro 30%, slipstream 10%, risk 10%, mystery 10% (unchanged)
export const RACE_TRACKS: Record<string, TrackConfig> = {
  coast: { // fixedRings: the original gate heights (8 m, then road height 3 m) on any lane
    name: 'Coast', length: 5000, trafficDensity: 1, seed: 1001, layoutVersion: 4, fixedRings: true, ringAltitudes: [8, 3], ringOdds: BOOST_ODDS, introRivals: true, // the first, easiest map
    sections: [{ from: 2200, to: 2700, type: 'shortcut', x: -7.5, altitude: 6 }],
  },
  neon: {
    name: 'Neon Downtown', length: 4000, trafficDensity: 1.5, seed: 2002, layoutVersion: 4, ringOdds: BOOST_ODDS, introRivals: true, // an early, easy map
    sections: [
      { from: 600, to: 1100, type: 'tunnel' }, { from: 1150, to: 1650, type: 'shortcut', x: 7.5, altitude: 6 },
      { from: 1700, to: 2300, type: 'tunnel' }, { from: 2900, to: 3400, type: 'tunnel' },
    ],
  },
  canyon: {
    name: 'Canyon Skyway', length: 6000, trafficDensity: 1, seed: 3003, layoutVersion: 4, openingNitroRings: 2, // volume was enough; only the first NITRO came late
    sections: [
      { from: 700, to: 1300, type: 'crosswind', dir: 1 }, { from: 1500, to: 1560, type: 'gap' },
      { from: 2000, to: 2500, type: 'shortcut', x: -7.5, altitude: 6 },
      { from: 3000, to: 3070, type: 'gap' }, { from: 3300, to: 4100, type: 'crosswind', dir: -1 },
      { from: 4400, to: 4470, type: 'gap' },
    ],
  },
  aurora: {
    name: 'Aurora Pass', length: 5500, trafficDensity: 1, seed: 4004, layoutVersion: 3,
    sections: [
      { from: 900, to: 1500, type: 'ice' }, { from: 1800, to: 2600, type: 'uphill' }, { from: 2800, to: 3500, type: 'ice' },
      { from: 3800, to: 4200, type: 'uphill' }, { from: 4300, to: 4900, type: 'ice' },
      { from: 4920, to: 5380, type: 'shortcut', x: 7.5, altitude: 6 },
    ],
  },
  spiral: {
    name: 'Sky Spiral', length: 5600, trafficDensity: 0.75, seed: 5005, layoutVersion: 4, openingNitroRings: 2, // difficulty curve: only the late first NITRO is fixed
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
// scales by length / the mean classic length. The ten classic tracks stay at 1 (their layouts are pinned).
const CLASSIC_MEAN_LENGTH = Object.values(RACE_TRACKS).reduce((sum, track) => sum + track.length, 0) / Object.keys(RACE_TRACKS).length;
export const itemScale = (track: TrackConfig): number =>
  track.topology === 'course-graph' || track.topology === 'course-graph-runtime' ? track.length / CLASSIC_MEAN_LENGTH : 1;

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
  (mode === 'circuit' ? id === CIRCUIT_ID : Object.hasOwn(RACE_TRACKS, id));

/** Topology guard for createRace: a circuit only in Circuit mode; gated CourseGraph sprints only in Classic. */
export function assertTrackMode(trackId: string, mode: string): void {
  if ((trackId === CIRCUIT_ID) !== (mode === 'circuit')) throw new RangeError('Circuit mode requires a circuit route');
  if (Object.hasOwn(COURSE_TRACKS, trackId) && mode !== 'classic') throw new RangeError(`${COURSE_TRACKS[trackId].name} is a gated classic sprint`);
}
