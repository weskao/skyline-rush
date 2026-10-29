import { CIRCUIT_ID, CIRCUIT_TRACK } from './circuit-track.ts';
import type { TrackConfig } from './game-types.ts';

// Special sections are { from, to, type } in metres; `dir` (+1 / -1) is the crosswind direction,
// `x` / `altitude` place a shortcut corridor.
export const RACE_TRACKS: Record<string, TrackConfig> = {
  coast: { // fixedRings: the original gate grid
    name: 'Coast', length: 5000, trafficDensity: 1, seed: 1001, fixedRings: true,
    sections: [{ from: 2200, to: 2700, type: 'shortcut', x: -7.5, altitude: 6 }],
  },
  neon: {
    name: 'Neon Downtown', length: 4000, trafficDensity: 1.5, seed: 2002,
    sections: [
      { from: 600, to: 1100, type: 'tunnel' }, { from: 1150, to: 1650, type: 'shortcut', x: 7.5, altitude: 6 },
      { from: 1700, to: 2300, type: 'tunnel' }, { from: 2900, to: 3400, type: 'tunnel' },
    ],
  },
  canyon: {
    name: 'Canyon Skyway', length: 6000, trafficDensity: 1, seed: 3003,
    sections: [
      { from: 700, to: 1300, type: 'crosswind', dir: 1 }, { from: 1500, to: 1560, type: 'gap' },
      { from: 2000, to: 2500, type: 'shortcut', x: -7.5, altitude: 6 },
      { from: 3000, to: 3070, type: 'gap' }, { from: 3300, to: 4100, type: 'crosswind', dir: -1 },
      { from: 4400, to: 4470, type: 'gap' },
    ],
  },
  aurora: {
    name: 'Aurora Pass', length: 5500, trafficDensity: 1, seed: 4004,
    sections: [
      { from: 900, to: 1500, type: 'ice' }, { from: 1800, to: 2600, type: 'uphill' }, { from: 2800, to: 3500, type: 'ice' },
      { from: 3800, to: 4200, type: 'uphill' }, { from: 4300, to: 4900, type: 'ice' },
      { from: 4920, to: 5380, type: 'shortcut', x: 7.5, altitude: 6 },
    ],
  },
  spiral: {
    name: 'Sky Spiral', length: 5600, trafficDensity: 0.75, seed: 5005,
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
  taipei: {"name":"Taipei Heritage","length":6200,"trafficDensity":1.1,"seed":6006,"sections":[{"from":850,"to":1200,"type":"tunnel"},{"from":1950,"to":2450,"type":"shortcut","x":-7.5,"altitude":6},{"from":3120,"to":3450,"type":"boost-tunnel"},{"from":4100,"to":4450,"type":"tunnel"}]},
  tokyo: {"name":"Tokyo Afterdark","length":6800,"trafficDensity":1.4,"seed":7007,"sections":[{"from":850,"to":1350,"type":"tunnel"},{"from":2450,"to":2950,"type":"shortcut","x":7.5,"altitude":6},{"from":4150,"to":4650,"type":"tunnel"},{"from":5050,"to":5450,"type":"boost-tunnel"}]},
  alpine: {"name":"Alpine Rail Pass","length":7600,"trafficDensity":0.8,"seed":8008,"sections":[{"from":900,"to":1420,"type":"uphill"},{"from":1600,"to":2200,"type":"tunnel"},{"from":3100,"to":3600,"type":"shortcut","x":-7.5,"altitude":6},{"from":3850,"to":4200,"type":"boost-tunnel"},{"from":4700,"to":5200,"type":"tunnel"},{"from":5900,"to":6400,"type":"uphill"}]},
  coastal: {"name":"Coastal Horizon","length":5800,"trafficDensity":1,"seed":9009,"sections":[{"from":850,"to":1300,"type":"crosswind","dir":1},{"from":2100,"to":2600,"type":"shortcut","x":7.5,"altitude":6},{"from":2950,"to":3310,"type":"boost-tunnel"},{"from":3950,"to":4600,"type":"crosswind","dir":-1}]},
  cosmic: {"name":"Cosmic Orbit","length":8000,"trafficDensity":0.65,"seed":1010,"sections":[{"from":1400,"to":1900,"type":"crosswind","dir":1},{"from":3000,"to":3500,"type":"shortcut","x":-7.5,"altitude":6},{"from":5100,"to":5600,"type":"crosswind","dir":-1},{"from":6100,"to":6540,"type":"boost-tunnel"}]},
};

// The separate lookup never changes Daily/Career/Cup's ordered sprint catalog.
export const raceTrack = (id: string): TrackConfig | undefined => id === CIRCUIT_ID ? CIRCUIT_TRACK : RACE_TRACKS[id];

export const isModeTrack = (id: unknown, mode: unknown): id is string => typeof id === 'string' &&
  (mode === 'circuit' ? id === CIRCUIT_ID : Object.hasOwn(RACE_TRACKS, id));
