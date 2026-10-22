// A small, versioned contract for practice modes; Classic and Daily stay identical.
export const MODES = Object.freeze(['classic', 'custom', 'free', 'time', 'gauntlet', 'checkpoint']);
const TRAFFIC = Object.freeze({ off: 0, light: 0.5, normal: 1, heavy: 1.5 });
const DIFFICULTIES = ['easy', 'normal', 'hard'];

export const trafficMultiplier = value => TRAFFIC[value] ?? TRAFFIC.normal;

export function normalizeRaceConfig(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Race mode settings must be an object');
  const mode = value.mode ?? 'classic';
  if (!MODES.includes(mode)) throw new RangeError('Unknown race mode: ' + String(mode));
  // Only Custom has rivals. Free Drive can adjust traffic and pickups.
  const custom = mode === 'custom';
  const practice = custom || mode === 'free';
  const rivals = custom && Number.isInteger(value.rivals) && value.rivals >= 0 && value.rivals <= 3 ? value.rivals : custom || mode === 'classic' ? 3 : 0;
  return Object.freeze({
    rulesVersion: 1,
    mode,
    rivals,
    traffic: practice && Object.hasOwn(TRAFFIC, value.traffic) ? value.traffic : ['time', 'gauntlet', 'checkpoint'].includes(mode) ? 'off' : 'normal',
    difficulty: custom && DIFFICULTIES.includes(value.difficulty) ? value.difficulty : 'normal',
    items: practice && typeof value.items === 'boolean' ? value.items : true,
    // Keep pre-existing bests/ghosts comparable: the default remains absent from rules signatures.
    ...(practice && value.collision === 'relaxed' ? { collision: 'relaxed' } : {}),
    ...(custom && [2, 3, 5].includes(value.stages) ? { stages: value.stages } : {}),
    ...(mode === 'gauntlet' && value.hazardTier === 'extreme' ? { hazardTier: 'extreme' } : {}),
  });
}

export const RULE_PRESETS = Object.freeze({
  standard: Object.freeze({ rivals: 3, difficulty: 'normal', traffic: 'normal', items: true }),
  traffic: Object.freeze({ rivals: 3, difficulty: 'hard', traffic: 'heavy', items: true }),
  noitems: Object.freeze({ rivals: 3, difficulty: 'normal', traffic: 'normal', items: false }),
  air: Object.freeze({ rivals: 1, difficulty: 'easy', traffic: 'off', items: true }),
  precision: Object.freeze({ rivals: 0, difficulty: 'normal', traffic: 'light', items: false }),
});
export const rulesSignature = config => JSON.stringify(normalizeRaceConfig(config));
