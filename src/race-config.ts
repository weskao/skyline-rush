// A small, versioned contract for practice modes; Classic and Daily stay identical.
export const MODES: readonly string[] = Object.freeze(['classic', 'custom', 'free', 'time', 'gauntlet', 'checkpoint', 'cup', 'stunt', 'elimination', 'endless', 'circuit']);
const TRAFFIC: Readonly<Record<string, number>> = Object.freeze({ off: 0, light: 0.5, normal: 1, heavy: 1.5 });
const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export const ITEM_RULES = ['off', 'classic', 'active', 'all'] as const;

export const trafficMultiplier = (value: unknown): number => typeof value === 'string' ? (TRAFFIC[value] ?? TRAFFIC.normal) : TRAFFIC.normal;

export function normalizeRaceConfig(value: unknown = {}) {
  if (!isRecord(value)) throw new TypeError('Race mode settings must be an object');
  const mode = value.mode ?? 'classic';
  if (!isOneOf(mode, MODES)) throw new RangeError('Unknown race mode: ' + String(mode));
  // Only Custom has rivals. Free Drive can adjust traffic and pickups.
  const custom = mode === 'custom';
  const practice = custom || mode === 'free';
  const itemRules = practice && isOneOf(value.itemRules, ITEM_RULES) ? value.itemRules : null;
  const items = itemRules ? itemRules === 'classic' || itemRules === 'all' : practice && typeof value.items === 'boolean' ? value.items : true;
  const activeItems = itemRules ? itemRules === 'active' || itemRules === 'all' : practice && items && value.activeItems === true;
  // Explicit v1 4-car competitive saves retain their identity; new races use seven AI.
  const legacyFour = !custom && value.rulesVersion === 1 && value.rivals === 3;
  const competitive = ['classic', 'cup', 'elimination', 'circuit'].includes(mode);
  const rivals = custom
    ? typeof value.rivals === 'number' && Number.isInteger(value.rivals) && value.rivals >= 0 && value.rivals <= 7 ? value.rivals : 3
    : competitive ? legacyFour ? 3 : 7 : 0;
  return Object.freeze({
    rulesVersion: 1,
    mode,
    rivals,
    traffic: practice && typeof value.traffic === 'string' && Object.hasOwn(TRAFFIC, value.traffic) ? value.traffic : ['time', 'gauntlet', 'checkpoint', 'circuit'].includes(mode) ? 'off' : 'normal',
    difficulty: custom && isOneOf(value.difficulty, DIFFICULTIES) ? value.difficulty : 'normal',
    items,
    ...(activeItems ? { activeItems: true } : {}),
    ...(itemRules ? { itemRules } : {}),
    ...(['stunt', 'checkpoint'].includes(mode) && value.bonusGates === true ? { bonusGates: true } : {}),
    // Keep pre-existing bests/ghosts comparable: the default remains absent from rules signatures.
    ...(practice && value.collision === 'relaxed' ? { collision: 'relaxed' } : {}),
    ...(practice && isOneOf(value.hazards, ['standard', 'extreme']) ? { hazards: value.hazards } : {}),
    // REPLAY-03 practice switch: only 'off' is stored, so default signatures stay identical.
    ...(practice && value.riskLines === 'off' ? { riskLines: 'off' } : {}),
    // 11B themed track hazards are opt-in, so every other mode's rules signature stays the same.
    ...((practice || mode === 'gauntlet') && value.themes === true ? { themes: true } : {}),
    ...(custom && isOneOf(value.stages, [2, 3, 5]) ? { stages: value.stages } : {}),
    ...(mode === 'gauntlet' && value.hazardTier === 'extreme' ? { hazardTier: 'extreme' } : {}),
    // MODE-07: only the mixed course is stored, so the original Gauntlet signature is unchanged.
    ...(mode === 'gauntlet' && value.layout === 'mixed' ? { layout: 'mixed' } : {}),
    ...(mode === 'time' && value.clean === true ? { clean: true } : {}),
    ...(mode === 'circuit' ? { laps: isOneOf(value.laps, [1, 3, 5]) ? value.laps : 3, topologyVersion: 1 } : {}),
    ...(mode === 'stunt' ? { duration: isOneOf(value.duration, [120, 180, 300]) ? value.duration : 120 } : {}),
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
export const rulesSignature = (config: unknown): string => JSON.stringify(normalizeRaceConfig(config));

// Strict boundary for new user-authored/preset session requests. Legacy or stored
// configs still use normalizeRaceConfig(), which intentionally retains safe fallbacks.
const REQUEST_KEYS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  classic: [],
  custom: ['rivals', 'traffic', 'difficulty', 'items', 'activeItems', 'itemRules', 'collision', 'hazards', 'stages', 'themes', 'riskLines'],
  free: ['traffic', 'items', 'activeItems', 'itemRules', 'collision', 'hazards', 'themes', 'riskLines'],
  time: ['clean'],
  gauntlet: ['hazardTier', 'themes', 'layout'],
  checkpoint: ['bonusGates'],
  cup: ['cupTracks'],
  stunt: ['duration', 'bonusGates'],
  elimination: [],
  endless: [],
  circuit: ['laps', 'topologyVersion'],
});
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const isOneOf = <T extends string | number>(value: unknown, values: readonly T[]): value is T => values.includes(value as T);
const assertOption: (test: unknown, key: string) => asserts test = (test, key) => {
  if (!test) throw new RangeError('Invalid race option: ' + key);
};

/**
 * Reject bad/new user options instead of quietly starting a different race.
 * This is opt-in so existing Classic, Daily and persisted configuration
 * normalization retain their exact previous fallback behavior.
 */
export function validateRaceRequest(value: unknown = {}, { availableTracks }: { availableTracks?: readonly string[] } = {}) {
  if (!isRecord(value)) throw new TypeError('Race settings must be an object');
  const mode = value.mode ?? 'classic';
  if (!isOneOf(mode, MODES)) throw new RangeError('Unknown race mode: ' + String(mode));
  const allowed = new Set(['mode', 'rulesVersion', ...REQUEST_KEYS[mode]]);
  for (const key of Object.keys(value)) {
    assertOption(allowed.has(key), key + ' not supported in ' + mode);
  }
  if (Object.hasOwn(value, 'rulesVersion')) assertOption(value.rulesVersion === 1, 'rulesVersion');
  if (Object.hasOwn(value, 'rivals'))
    assertOption(typeof value.rivals === 'number' && Number.isInteger(value.rivals) && value.rivals >= 0 && value.rivals <= 7, 'rivals');
  if (Object.hasOwn(value, 'traffic')) assertOption(typeof value.traffic === 'string' && Object.hasOwn(TRAFFIC, value.traffic), 'traffic');
  if (Object.hasOwn(value, 'difficulty')) assertOption(isOneOf(value.difficulty, DIFFICULTIES), 'difficulty');
  for (const key of ['items', 'activeItems', 'clean', 'bonusGates', 'themes'])
    if (Object.hasOwn(value, key)) assertOption(typeof value[key] === 'boolean', key);
  if (Object.hasOwn(value, 'itemRules')) {
    assertOption(isOneOf(value.itemRules, ITEM_RULES), 'itemRules');
    const expected = normalizeRaceConfig(value);
    if (Object.hasOwn(value, 'items')) assertOption(value.items === expected.items, 'items conflicts with itemRules');
    if (Object.hasOwn(value, 'activeItems')) assertOption(value.activeItems === Boolean(expected.activeItems), 'activeItems conflicts with itemRules');
  } else if (value.activeItems === true && value.items === false) assertOption(false, 'activeItems with items disabled');
  if (Object.hasOwn(value, 'collision')) assertOption(isOneOf(value.collision, ['normal', 'relaxed']), 'collision');
  if (Object.hasOwn(value, 'riskLines')) assertOption(isOneOf(value.riskLines, ['on', 'off']), 'riskLines');
  if (Object.hasOwn(value, 'hazards')) assertOption(isOneOf(value.hazards, ['standard', 'extreme']), 'hazards');
  if (Object.hasOwn(value, 'layout')) assertOption(isOneOf(value.layout, ['classic', 'mixed']), 'layout');
  if (Object.hasOwn(value, 'hazardTier')) assertOption(isOneOf(value.hazardTier, ['standard', 'extreme']), 'hazardTier');
  if (Object.hasOwn(value, 'stages')) assertOption(isOneOf(value.stages, [1, 2, 3, 5]), 'stages');
  if (Object.hasOwn(value, 'laps')) assertOption(isOneOf(value.laps, [1, 3, 5]), 'laps');
  if (Object.hasOwn(value, 'topologyVersion')) assertOption(value.topologyVersion === 1, 'topologyVersion');
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
