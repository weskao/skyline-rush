import { normalizeRaceConfig, rulesSignature, validateRaceRequest } from './race-config.ts';
import { createRaceObjective } from './race-objectives.ts';
import { RACE_STREAMS, streamSeed } from './rng.ts';

// Contract-only themes: they do not recolor the live WebGL scene. Presentation
// may opt in separately without changing physics or mode record eligibility.
export const VISUAL_PRESETS = Object.freeze(['track', 'day', 'dusk', 'night', 'rain', 'fog', 'snow', 'aurora'] as const);
export type VisualPreset = (typeof VISUAL_PRESETS)[number];
// Snowfall and aurora skies only where the landscape suits them; unknown tracks get the base six.
const STYLED_PRESETS: Partial<Record<VisualPreset, readonly string[]>> = {
  snow: ['aurora', 'alpine', 'canyon'], aurora: ['aurora', 'alpine', 'coastal', 'spiral'],
};
export function presetsForTrack(trackId: string): VisualPreset[] {
  return VISUAL_PRESETS.filter(preset => STYLED_PRESETS[preset]?.includes(trackId) ?? true);
}

/**
 * Versioned, JSON-serializable identity for one race session.
 * Keep the existing race.config shape untouched: old bests/ghosts key records by
 * JSON.stringify(config), so replacing it with presentation data would break saves.
 */
export function createRaceSessionContract(
  trackId: string, seed: number,
  settings: Record<string, unknown> = {},
  presentation: Record<string, unknown> = {},
) {
  if (typeof trackId !== 'string' || !/^[a-z][a-z-]{1,24}$/.test(trackId))
    throw new RangeError('Invalid race trackId');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError('Invalid race seed');
  if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation))
    throw new TypeError('Presentation settings must be an object');
  if (presentation.ghostEnabled !== undefined && typeof presentation.ghostEnabled !== 'boolean')
    throw new RangeError('Invalid ghostEnabled flag');
  const visualPreset = presentation.visualPreset ?? 'track';
  if (!presetsForTrack(trackId).includes(visualPreset as VisualPreset)) throw new RangeError('Invalid visualPreset');

  // Existing createRace() passes the already-normalized v1 object. New callers
  // supplying raw settings must pass strict mode/field/type validation.
  const config = normalizeRaceConfig(settings);
  const canonical = settings?.rulesVersion === 1 &&
    Object.keys(settings).length === Object.keys(config).length &&
    Object.entries(config).every(([key, value]) => JSON.stringify(settings[key]) === JSON.stringify(value));
  if (!canonical) validateRaceRequest(settings);
  const simulation = Object.freeze({
    rulesVersion: config.rulesVersion,
    rivalCount: config.rivals,
    aiDifficulty: config.difficulty,
    trafficDensity: config.traffic,
    itemsEnabled: config.items,
    collisionRule: config.collision ?? 'normal',
    ...(config.stages ? { stageCount: config.stages } : {}),
    ...(config.duration ? { durationSeconds: config.duration } : {}),
  });
  return Object.freeze({
    contractVersion: 1 as const,
    trackId,
    seed,
    mode: config.mode,
    simulation,
    presentation: Object.freeze({
      ghostEnabled: (presentation.ghostEnabled ?? true) as boolean,
      visualPreset: visualPreset as VisualPreset,
    }),
    objective: createRaceObjective(config),
    rulesSignature: rulesSignature(config),
    randomStreams: RACE_STREAMS, // fixed names, not a shared mutable PRNG state
    randomSeeds: Object.freeze(Object.fromEntries(
      Object.entries(RACE_STREAMS).map(([system, stream]) => [system, streamSeed(seed, stream)]),
    )), // authored traffic/checkpoints remain unchanged until procedural rules opt in
  });
}

export type RaceSessionContract = ReturnType<typeof createRaceSessionContract>;
