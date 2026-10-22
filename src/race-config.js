// Pure, versioned rules for race sessions. No storage, DOM or renderer coupling.
export const RACE_CONFIG_VERSION = 1;
export const RACE_MODES = Object.freeze(['classic', 'custom', 'free', 'time']);
const DEFAULTS = Object.freeze({
  rivalCount: 3, aiDifficulty: 'normal', trafficDensity: 'normal',
  itemsEnabled: true, collisionRule: 'normal', ghostEnabled: true, visualPreset: 'track',
});
const TRAFFIC = Object.freeze({ off: 0, light: .5, normal: 1, heavy: 1.5 });
const ALLOWED = new Set(['version', 'mode', ...Object.keys(DEFAULTS)]);
const CHOICES = { aiDifficulty: ['easy', 'normal', 'hard'], trafficDensity: Object.keys(TRAFFIC), collisionRule: ['normal', 'relaxed'], visualPreset: ['track', 'day', 'night'] };

export function raceConfig(trackId = 'coast', options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Invalid race options');
  for (const key of Object.keys(options)) if (!ALLOWED.has(key)) throw new RangeError(`Unknown race option: ${key}`);
  if (options.version !== undefined && options.version !== RACE_CONFIG_VERSION) throw new RangeError('Unknown race config version');
  const mode = options.mode ?? 'classic';
  if (!RACE_MODES.includes(mode)) throw new RangeError(`Unknown race mode: ${mode}`);
  for (const [key, values] of Object.entries(CHOICES)) if (options[key] !== undefined && !values.includes(options[key])) throw new RangeError(`Invalid ${key}`);
  if (options.rivalCount !== undefined && (!Number.isInteger(options.rivalCount) || options.rivalCount < 0 || options.rivalCount > 3)) throw new RangeError('Invalid rival count');
  for (const key of ['itemsEnabled', 'ghostEnabled']) if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new TypeError(`Invalid ${key}`);
  const rules = mode === 'classic' ? DEFAULTS : { ...DEFAULTS, ...options };
  // Solo modes deliberately cannot inherit opponents from stale Custom settings.
  const rivalCount = mode === 'free' || mode === 'time' ? 0 : rules.rivalCount;
  return { version: RACE_CONFIG_VERSION, mode, trackId, rivalCount,
    aiDifficulty: rules.aiDifficulty, trafficDensity: rules.trafficDensity,
    itemsEnabled: rules.itemsEnabled, collisionRule: rules.collisionRule,
    ghostEnabled: rules.ghostEnabled, visualPreset: rules.visualPreset };
}

export const trafficMultiplier = density => {
  if (!Object.hasOwn(TRAFFIC, density)) throw new RangeError(`Unknown traffic density: ${density}`);
  return TRAFFIC[density];
};
export const officialRules = config => config?.mode === 'classic' &&
  Object.entries(DEFAULTS).every(([key, value]) => config[key] === value) && config.rivalCount === 3;
export const raceRulesKey = config => JSON.stringify([
  config.version, config.mode, config.trackId, config.rivalCount, config.aiDifficulty,
  config.trafficDensity, config.itemsEnabled, config.collisionRule, config.ghostEnabled,
]);
