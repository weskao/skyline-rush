// 11B: per-track themed hazards for opt-in modes (config.themes). Placements are authored data,
// validated by the ENV-02 schema; the simulation reuses the existing race.hazards contract.
import { validateHazardPlacement, type HazardPlacement } from './hazard-schema.ts';
import type { GameplayType } from './object-catalog.ts';
import { CLASSIC_THEMED_PLACEMENTS } from './track-themes-classic.ts';
import { createHazards, type HazardTrack } from './hazards.ts';

export interface ThemedHazard {
  id: string; type: GameplayType; distance: number; x: number; altitude: number;
  hit: boolean; passed: boolean; moving: false; phase: number; speed: number;
  halfWidth: number; halfLength: number; height: number;
  /** ENV-05 drives motion and non-block effects from this through hazardFrame/hazardContact. */
  placement: HazardPlacement;
}
interface Hazardish { distance: number }

const THEMED_PLACEMENTS: Readonly<Record<string, readonly unknown[]>> = { ...CLASSIC_THEMED_PLACEMENTS };
export const THEMED_TRACKS: readonly string[] = Object.freeze(Object.keys(THEMED_PLACEMENTS));

// Validated once per track; the tables are immutable, so the cache never needs invalidating.
const validated = new Map<string, readonly HazardPlacement[]>();
export function themedPlacements(trackId: string): readonly HazardPlacement[] {
  if (!validated.has(trackId)) validated.set(trackId, Object.freeze((THEMED_PLACEMENTS[trackId] ?? []).map(validateHazardPlacement)));
  return validated.get(trackId)!;
}

/** Fresh, mutable race hazards (hit/passed change during a race) for one track's theme. */
export function themedHazards(trackId: string): ThemedHazard[] {
  return themedPlacements(trackId).map(placement => ({
    id: placement.id, type: placement.type, distance: placement.distance, x: placement.lateralOffset,
    altitude: placement.altitude, hit: false, passed: false, moving: false, phase: 0, speed: 0,
    halfWidth: placement.hitbox.halfWidth, halfLength: placement.hitbox.halfLength, height: placement.hitbox.height, placement,
  }));
}

/** Generated hazards near an authored one are dropped so the two never close a third lane together. */
export function withThemedHazards<T extends Hazardish>(generated: T[], themed: readonly Hazardish[]): (T | Hazardish)[] {
  if (!themed.length) return generated;
  const clear = generated.filter(h => themed.every(t => Math.abs(t.distance - h.distance) > 35));
  return [...clear, ...themed].sort((a, b) => a.distance - b.distance);
}

/** The race's hazard list: generated Gauntlet/practice hazards plus the opt-in track theme. */
export function raceHazards(trackId: string, track: HazardTrack, lanes: readonly number[], config: { mode: string; hazardTier?: 'standard' | 'extreme'; hazards?: 'standard' | 'extreme'; themes?: boolean }) {
  const generated = config.mode === 'gauntlet' ? createHazards(track, lanes, config.hazardTier) :
    config.hazards ? createHazards(track, lanes, config.hazards) : [];
  return withThemedHazards(generated, config.themes ? themedHazards(trackId) : []);
}
