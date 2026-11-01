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
  /** [min, max] metres to the next ring (default [200, 320]); a fixed grid steps by min (default 220). */
  ringGap?: readonly [number, number];
  /** Cumulative roll thresholds for charge / nitro / slipstream / risk rings; the rest is mystery. */
  ringOdds?: readonly [number, number, number, number];
  /** Fixed-grid ring altitudes, cycled by ring index (default 8). */
  ringAltitudes?: readonly number[];
  /** The first N rings are nitro rings, so the first NITRO comes early without adding rings. */
  openingNitroRings?: number;
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
