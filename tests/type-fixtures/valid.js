// @ts-check
/** @type {import('../../src/game-types.js').TrackConfig} */
export const track = { name: 'Test', length: 1000, trafficDensity: 1, seed: 42, sections: [] };
/** @type {import('../../src/game-types.js').PlayerSnapshot} */
export const player = { speed: 12, distance: 55, altitude: 0, fuel: 90 };
/** @type {import('../../src/game-types.js').RivalSnapshot} */
export const rival = { name: 'RIVAL', distance: 43 };
/** @type {import('../../src/game-types.js').RaceSnapshot} */
export const race = { trackId: 'coast', length: track.length, elapsed: 2, phase: 'racing', mode: 'classic', player, rivals: [rival] };
