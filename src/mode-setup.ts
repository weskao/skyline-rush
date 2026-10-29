// 10A mode-first setup: pure decisions for the rules row (defaults, summary, eligibility, conflicts).
// The DOM controller (race-select-ui.ts) renders them; nothing here touches storage.

type Translate = (key: string, params?: Record<string, string | number>) => string;
/** The rule values a fresh Custom/Free race starts with; Restore defaults returns to exactly these. */
export const DEFAULT_RULES = Object.freeze({ rivals: 3, traffic: 'normal', difficulty: 'normal', items: true, activeItems: false,
  itemRules: undefined, collision: 'normal', hazards: 'off', stages: 1, bonusGates: false });

export type Eligibility = 'records' | 'daily' | 'modeBests' | 'practice';
/** What a finished run of this mode saves; Free Drive never writes a result. */
export function modeEligibility(mode: string, { daily = false }: { daily?: boolean } = {}): Eligibility {
  if (daily) return 'daily';
  return mode === 'classic' ? 'records' : mode === 'free' ? 'practice' : 'modeBests';
}

export interface RuleConflict { rule: string; reason: string; params?: Record<string, number> }
const GHOST_MODES = new Set(['classic', 'custom', 'time']);
/** Settings that cannot apply in this combination, each with the reason shown beside the disabled control. */
export function ruleConflicts(mode: string, rules: { rivals?: unknown }, { unlocked, cupCount }: { unlocked: number; cupCount: number }): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  if (mode === 'custom' && rules.rivals === 0) conflicts.push({ rule: 'difficulty', reason: 'mode.conflict.noRivals' });
  if (!GHOST_MODES.has(mode)) conflicts.push({ rule: 'ghost', reason: 'mode.ghostUnavailable' });
  if (mode === 'cup' && unlocked < cupCount) conflicts.push({ rule: 'start', reason: 'mode.cupLocked', params: { n: cupCount } });
  return conflicts;
}

interface SummaryConfig {
  mode: string; rivals: number; traffic: string; difficulty: string; items: boolean; activeItems?: boolean;
  collision?: string; hazards?: string; stages?: number; hazardTier?: string; clean?: boolean; duration?: number;
  cupTracks?: readonly string[];
}
/** One readable line of the rules a race will use, for every mode. */
export function modeRulesSummary(config: SummaryConfig, t: Translate): string {
  const field = (key: string, value: string) => t(key, { value: t('mode.' + value) });
  const field3 = [t('mode.setupAI', { n: config.rivals }), field('mode.setupTraffic', config.traffic),
    t(config.items ? 'mode.setupSuppliesOn' : 'mode.setupSuppliesOff')];
  const parts: Record<string, () => string[]> = {
    classic: () => field3,
    elimination: () => field3,
    custom: () => [...field3, field('mode.setupCollision', config.collision ?? 'normal'), field('mode.setupHazards', config.hazards ?? 'off'),
      ...(config.activeItems ? [t('mode.activeItems')] : []), field('mode.setupDifficulty', config.difficulty), t('mode.setupStages', { n: config.stages ?? 1 })],
    free: () => [field('mode.setupTraffic', config.traffic), t(config.items ? 'mode.setupSuppliesOn' : 'mode.setupSuppliesOff'),
      field('mode.setupCollision', config.collision ?? 'normal'), field('mode.setupHazards', config.hazards ?? 'off'), ...(config.activeItems ? [t('mode.activeItems')] : [])],
    time: () => [t('mode.setupSolo'), ...(config.clean ? [t('mode.cleanRules')] : [])],
    gauntlet: () => [t('mode.setupSolo'), field('mode.setupTier', config.hazardTier ?? 'standard')],
    checkpoint: () => [t('mode.setupSolo')],
    cup: () => [t('mode.setupAI', { n: config.rivals }), t('mode.setupCupTracks', { n: config.cupTracks?.length ?? 3 })],
    stunt: () => [t('mode.setupSolo'), t(`mode.stuntMinutes.${config.duration ?? 120}`)],
  };
  return (parts[config.mode] ?? parts.classic)().join(' · ');
}
