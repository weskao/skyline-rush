// Shared, structural contracts used at the JavaScript game/UI boundary.
// Deliberately describe the stable fields first; physics stays plain JS.

/** @typedef {{ from: number, to: number, type: string, x?: number, altitude?: number, dir?: number }} TrackSection */

/** @typedef {{ name: string, length: number, trafficDensity: number, seed: number, sections: TrackSection[], fixedRings?: boolean }} TrackConfig */

/** @typedef {{ speed: number, distance: number, altitude: number, fuel: number }} PlayerSnapshot */

/** @typedef {{ name: string, distance: number, speed?: number }} RivalSnapshot */

/** @typedef {{ trackId: string, length: number, elapsed: number, phase: string, mode: string, player: PlayerSnapshot, rivals: RivalSnapshot[] }} RaceSnapshot */

export {};
