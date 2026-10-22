import { normalizeRaceConfig, rulesSignature } from './race-config.js';
import { createRaceObjective } from './race-objectives.js';
import { RACE_STREAMS } from './rng.js';

// Contract-only themes: they do not recolor the live WebGL scene. Presentation
// may opt in separately without changing physics or mode record eligibility.
export const VISUAL_PRESETS = Object.freeze(['track', 'day', 'dusk', 'night', 'rain', 'fog']);

/**
 * Versioned, JSON-serializable identity for one race session.
 * Keep the existing race.config shape untouched: old bests/ghosts key records by
 * JSON.stringify(config), so replacing it with presentation data would break saves.
 */
export function createRaceSessionContract(trackId, seed, settings = {}, presentation = {}) {
  if (typeof trackId !== 'string' || !/^[a-z][a-z-]{1,24}$/.test(trackId))
    throw new RangeError('Invalid race trackId');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError('Invalid race seed');
  if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation))
    throw new TypeError('Presentation settings must be an object');
  if (presentation.ghostEnabled !== undefined && typeof presentation.ghostEnabled !== 'boolean')
    throw new RangeError('Invalid ghostEnabled flag');
  const visualPreset = presentation.visualPreset ?? 'track';
  if (!VISUAL_PRESETS.includes(visualPreset)) throw new RangeError('Invalid visualPreset');

  const config = normalizeRaceConfig(settings);
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
    contractVersion: 1,
    trackId,
    seed,
    mode: config.mode,
    simulation,
    presentation: Object.freeze({
      ghostEnabled: presentation.ghostEnabled ?? true,
      visualPreset,
    }),
    objective: createRaceObjective(config),
    rulesSignature: rulesSignature(config),
    randomStreams: RACE_STREAMS, // fixed names, not a shared mutable PRNG state
  });
}
