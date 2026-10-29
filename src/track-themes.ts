// 11B: per-track themed hazards for opt-in modes (config.themes). Placements are authored data,
// validated by the ENV-02 schema; the simulation reuses the existing race.hazards contract.
import { validateHazardPlacement, type HazardPlacement } from './hazard-schema.ts';
import type { GameplayType } from './object-catalog.ts';
import { CLASSIC_THEMED_PLACEMENTS } from './track-themes-classic.ts';
import { WORLD_TOUR_THEMED_PLACEMENTS } from './track-themes-world-tour.ts';
import { createHazards, type HazardTrack } from './hazards.ts';
import { RISK_RING_RADIUS } from './ring-layout.ts';
import type { RiskRules } from './risk-lines.ts';
import type { LaunchRamp } from './launch-ramps.ts';

// Launch ramps go to race.ramps (the one launch rule) and hoops to race.rings (risk-ring scoring), never race.hazards.
const ROUTED: ReadonlySet<GameplayType> = new Set(['ramp', 'ring']);

export interface ThemedHazard {
  id: string; type: GameplayType; distance: number; x: number; altitude: number;
  hit: boolean; passed: boolean; moving: false; phase: number; speed: number;
  halfWidth: number; halfLength: number; height: number;
  /** ENV-05 drives motion and non-block effects from this through hazardFrame/hazardContact. */
  placement: HazardPlacement;
}
interface Hazardish { distance: number }

const THEMED_PLACEMENTS: Readonly<Record<string, readonly unknown[]>> = { ...CLASSIC_THEMED_PLACEMENTS, ...WORLD_TOUR_THEMED_PLACEMENTS };
export const THEMED_TRACKS: readonly string[] = Object.freeze(Object.keys(THEMED_PLACEMENTS));

// Validated once per track; the tables are immutable, so the cache never needs invalidating.
const validated = new Map<string, readonly HazardPlacement[]>();
export function themedPlacements(trackId: string): readonly HazardPlacement[] {
  if (!validated.has(trackId)) validated.set(trackId, Object.freeze((THEMED_PLACEMENTS[trackId] ?? []).map(validateHazardPlacement)));
  return validated.get(trackId)!;
}

/** Fresh, mutable race hazards (hit/passed change during a race) for one track's theme. */
export function themedHazards(trackId: string): ThemedHazard[] {
  return themedPlacements(trackId).filter(placement => !ROUTED.has(placement.type)).map(placement => ({
    id: placement.id, type: placement.type, distance: placement.distance, x: placement.lateralOffset,
    altitude: placement.altitude, hit: false, passed: false, moving: false, phase: 0, speed: 0,
    halfWidth: placement.hitbox.halfWidth, halfLength: placement.hitbox.halfLength, height: placement.hitbox.height, placement,
  }));
}

export interface ThemedHoop { distance: number; x: number; altitude: number; radius: number; type: 'risk'; group: 0; spin: number; spinPhase: number }
/** A theme's ramps and hoops for a race, or null when themes are off; hoops follow the risk-lines switch. */
export function themedExtras(trackId: string, config: { themes?: boolean }, risk: RiskRules): { ramps: LaunchRamp[]; hoops: ThemedHoop[] } | null {
  if (!config.themes) return null;
  const placements = themedPlacements(trackId);
  return {
    ramps: placements.filter(p => p.type === 'ramp').map(p => ({ distance: p.distance, x: p.lateralOffset,
      halfWidth: p.hitbox.halfWidth, halfLength: p.hitbox.halfLength, height: p.hitbox.height })),
    hoops: risk.rings ? placements.filter(p => p.type === 'ring').map(p => ({ distance: p.distance, x: p.lateralOffset, altitude: p.altitude,
      radius: RISK_RING_RADIUS, type: 'risk' as const, group: 0 as const,
      spin: p.movementPattern.kind === 'rotate' ? 2 * Math.PI / p.movementPattern.period : 0,
      spinPhase: 'phase' in p.movementPattern ? p.movementPattern.phase : 0 })) : [],
  };
}

/** Generated hazards near an authored one are dropped so the two never close a third lane together. */
export function withThemedHazards<T extends Hazardish>(generated: T[], themed: readonly Hazardish[]): (T | Hazardish)[] {
  if (!themed.length) return generated;
  const clear = generated.filter(h => themed.every(t => Math.abs(t.distance - h.distance) > 35));
  return [...clear, ...themed].sort((a, b) => a.distance - b.distance);
}

/** The race's hazard list: generated Gauntlet/practice hazards plus the opt-in track theme. */
export function raceHazards(trackId: string, track: HazardTrack, lanes: readonly number[], config: { mode: string; hazardTier?: 'standard' | 'extreme'; hazards?: 'standard' | 'extreme'; themes?: boolean },
  course: { hazards: Hazardish[] } | null = null) { // MODE-07 mixed Gauntlet course, built once by createRace
  const generated = course ? course.hazards : config.mode === 'gauntlet' ? createHazards(track, lanes, config.hazardTier) :
    config.hazards ? createHazards(track, lanes, config.hazards) : [];
  return withThemedHazards(generated, config.themes ? themedHazards(trackId) : []);
}
