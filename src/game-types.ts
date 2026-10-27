/**
 * Strongly typed contracts between Vue/TypeScript UI and the JavaScript engine.
 * Existing high-frequency simulation/render modules may remain JavaScript.
 */
export interface TrackSection {
  from: number;
  to: number;
  type: string;
  x?: number;
  altitude?: number;
  dir?: number;
}
export interface TrackConfig {
  name: string;
  length: number;
  trafficDensity: number;
  seed: number;
  sections: TrackSection[];
  fixedRings?: boolean;
}
export interface PlayerSnapshot {
  speed: number;
  distance: number;
  altitude: number;
  fuel: number;
}
export interface RivalSnapshot {
  name: string;
  distance: number;
  speed?: number;
}
export interface RaceSnapshot {
  trackId: string;
  length: number;
  elapsed: number;
  phase: string;
  mode: string;
  player: PlayerSnapshot;
  rivals: RivalSnapshot[];
}
