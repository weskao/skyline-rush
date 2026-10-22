// A small, versioned contract for practice modes; Classic and Daily stay identical.
export const MODES = Object.freeze(['classic', 'custom', 'free', 'time', 'gauntlet', 'checkpoint', 'cup', 'stunt', 'elimination']);
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
  const rivals = custom && Number.isInteger(value.rivals) && value.rivals >= 0 && value.rivals <= 3 ? value.rivals : custom || mode === 'classic' || mode === 'cup' || mode === 'elimination' ? 3 : 0;
  return Object.freeze({
    rulesVersion: 1,
    mode,
    rivals,
    traffic: practice && Object.hasOwn(TRAFFIC, value.traffic) ? value.traffic : ['time', 'gauntlet', 'checkpoint'].includes(mode) ? 'off' : 'normal',
    difficulty: custom && DIFFICULTIES.includes(value.difficulty) ? value.difficulty : 'normal',
    items: practice && typeof value.items === 'boolean' ? value.items : true,
    ...(practice && value.items !== false && value.activeItems === true ? { activeItems: true } : {}),
    // Keep pre-existing bests/ghosts comparable: the default remains absent from rules signatures.
    ...(practice && value.collision === 'relaxed' ? { collision: 'relaxed' } : {}),
    ...(practice && ['standard', 'extreme'].includes(value.hazards) ? { hazards: value.hazards } : {}),
    ...(custom && [2, 3, 5].includes(value.stages) ? { stages: value.stages } : {}),
    ...(mode === 'gauntlet' && value.hazardTier === 'extreme' ? { hazardTier: 'extreme' } : {}),
    ...(mode === 'time' && value.clean === true ? { clean: true } : {}),
    ...(mode === 'stunt' ? { duration: [120, 180, 300].includes(value.duration) ? value.duration : 120 } : {}),
    ...(mode === 'cup' && Array.isArray(value.cupTracks) && [3,5].includes(value.cupTracks.length) &&
       value.cupTracks.every(id => typeof id === 'string') && new Set(value.cupTracks).size === value.cupTracks.length
       ? { cupTracks: Object.freeze([...value.cupTracks]) } : {}),
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

// Strict boundary for new user-authored/preset session requests. Legacy or stored
// configs still use normalizeRaceConfig(), which intentionally retains safe fallbacks.
const REQUEST_KEYS = Object.freeze({
  classic: [],
  custom: ['rivals', 'traffic', 'difficulty', 'items', 'activeItems', 'collision', 'hazards', 'stages'],
  free: ['traffic', 'items', 'activeItems', 'collision', 'hazards'],
  time: ['clean'],
  gauntlet: ['hazardTier'],
  checkpoint: [],
  cup: ['cupTracks'],
  stunt: ['duration'],
  elimination: [],
});
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isOneOf = (value, values) => values.includes(value);
const assertOption = (test, key) => {
  if (!test) throw new RangeError('Invalid race option: ' + key);
};

/**
 * Reject bad/new user options instead of quietly starting a different race.
 * This is opt-in so existing Classic, Daily and persisted configuration
 * normalization retain their exact previous fallback behavior.
 */
export function validateRaceRequest(value = {}, { availableTracks } = {}) {
  if (!isRecord(value)) throw new TypeError('Race settings must be an object');
  const mode = value.mode ?? 'classic';
  if (!MODES.includes(mode)) throw new RangeError('Unknown race mode: ' + String(mode));
  const allowed = new Set(['mode', 'rulesVersion', ...REQUEST_KEYS[mode]]);
  for (const key of Object.keys(value)) {
    assertOption(allowed.has(key), key + ' not supported in ' + mode);
  }
  if (Object.hasOwn(value, 'rulesVersion')) assertOption(value.rulesVersion === 1, 'rulesVersion');
  if (Object.hasOwn(value, 'rivals'))
    assertOption(Number.isInteger(value.rivals) && value.rivals >= 0 && value.rivals <= 3, 'rivals');
  if (Object.hasOwn(value, 'traffic')) assertOption(Object.hasOwn(TRAFFIC, value.traffic), 'traffic');
  if (Object.hasOwn(value, 'difficulty')) assertOption(isOneOf(value.difficulty, DIFFICULTIES), 'difficulty');
  for (const key of ['items', 'activeItems', 'clean'])
    if (Object.hasOwn(value, key)) assertOption(typeof value[key] === 'boolean', key);
  if (value.activeItems === true && value.items === false) assertOption(false, 'activeItems with items disabled');
  if (Object.hasOwn(value, 'collision')) assertOption(isOneOf(value.collision, ['normal', 'relaxed']), 'collision');
  if (Object.hasOwn(value, 'hazards')) assertOption(isOneOf(value.hazards, ['standard', 'extreme']), 'hazards');
  if (Object.hasOwn(value, 'hazardTier')) assertOption(isOneOf(value.hazardTier, ['standard', 'extreme']), 'hazardTier');
  if (Object.hasOwn(value, 'stages')) assertOption(isOneOf(value.stages, [1, 2, 3, 5]), 'stages');
  if (Object.hasOwn(value, 'duration')) assertOption(isOneOf(value.duration, [120, 180, 300]), 'duration');
  if (Object.hasOwn(value, 'cupTracks')) {
    const tracks = value.cupTracks;
    assertOption(Array.isArray(tracks) && [3, 5].includes(tracks.length) &&
      tracks.every(track => typeof track === 'string' && /^[a-z][a-z-]{1,24}$/.test(track)) &&
      new Set(tracks).size === tracks.length, 'cupTracks');
    if (availableTracks !== undefined) {
      assertOption(Array.isArray(availableTracks) && tracks.every(track => availableTracks.includes(track)), 'cupTracks unknown track');
    }
  }
  return normalizeRaceConfig(value);
}
