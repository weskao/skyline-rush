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
  /** Shortcut drawn high over a chasm (Frostbite Rift): sinking or steering out of it mid-span is a fall. */
  span?: boolean;
  /** Shortcut over a road with a solid deck (Frostbite): cars can neither rise nor sink through its slab. */
  deck?: boolean;
}
export interface TrackConfig {
  name: string;
  length: number;
  trafficDensity: number;
  seed: number;
  sections: TrackSection[];
  fixedRings?: boolean;
  /** Cumulative roll thresholds for charge / nitro / slipstream / risk rings; the rest is mystery. */
  ringOdds?: readonly [number, number, number, number];
  /** Fixed gate-line ring altitudes, cycled by ring index (default 8). */
  ringAltitudes?: readonly number[];
  /** The first N rings are nitro rings, so the first NITRO comes early without adding rings. */
  openingNitroRings?: number;
  /** An opening map: Easy and Normal rivals drive at the gentler 'intro' skill (`src/rival-driver.ts`), so a new player can place. */
  introRivals?: boolean;
  /** Ring/pickup layout generation for timed records (`src/record-layout.ts`); omitted = 1. Bump it whenever a layout change makes older times incomparable. */
  layoutVersion?: number;
  /** Rival top-speed multiplier for this track (default 1); a long course where throttle alone would win sets it higher. */
  rivalPace?: number;
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
