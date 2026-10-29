import type { TrackConfig, PlayerSnapshot } from '../../src/game-types';
const track: TrackConfig = { name: 'a', length: 'wrong', trafficDensity: 1, seed: 2, sections: [] };
const player: PlayerSnapshot = { speed: 'wrong', distance: 0, altitude: 0, fuel: 100 };
export { track, player };
