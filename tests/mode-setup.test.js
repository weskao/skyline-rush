import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RULES, modeEligibility, ruleConflicts, modeRulesSummary } from '../src/mode-setup.ts';
import { normalizeRaceConfig, MODES } from '../src/race-config.ts';
import { t, setLocale } from '../src/i18n.ts';
import { UI } from '../src/locales/ui.ts';

// 10A: the mode-first setup row (summary, eligibility, Restore defaults, unsupported combinations).
const fakeT = (key, params) => params ? `${key}${JSON.stringify(params)}` : key;

test('Restore defaults returns every rule to the values a fresh Custom race uses', () => {
  const custom = normalizeRaceConfig({ mode: 'custom', ...DEFAULT_RULES, hazards: undefined });
  assert.deepEqual(custom, normalizeRaceConfig({ mode: 'custom' }));
  assert.equal(DEFAULT_RULES.hazards, 'off');
  assert.equal(DEFAULT_RULES.themes, false, 'themed track hazards are opt-in');
  assert.equal(DEFAULT_RULES.riskLines, 'on');
  assert.ok(Object.isFrozen(DEFAULT_RULES));
});

test('each mode says whether the run counts for records, mode bests or practice', () => {
  assert.equal(modeEligibility('classic'), 'records');
  assert.equal(modeEligibility('classic', { daily: true }), 'daily');
  assert.equal(modeEligibility('free'), 'practice');
  for (const mode of MODES.filter(m => !['classic', 'free'].includes(m))) assert.equal(modeEligibility(mode), 'modeBests', mode);
});

test('unsupported combinations are named with a reason instead of silently ignored', () => {
  const rules = { ...DEFAULT_RULES };
  assert.deepEqual(ruleConflicts('custom', rules, { unlocked: 10, cupCount: 3 }), []);
  assert.deepEqual(ruleConflicts('custom', { ...rules, rivals: 0 }, { unlocked: 10, cupCount: 3 }),
    [{ rule: 'difficulty', reason: 'mode.conflict.noRivals' }]);
  for (const mode of ['free', 'gauntlet', 'checkpoint', 'stunt', 'elimination'])
    assert.ok(ruleConflicts(mode, rules, { unlocked: 10, cupCount: 3 }).some(c => c.rule === 'ghost' && c.reason === 'mode.ghostUnavailable'), mode);
  for (const mode of ['classic', 'custom', 'time'])
    assert.ok(!ruleConflicts(mode, rules, { unlocked: 10, cupCount: 3 }).some(c => c.rule === 'ghost'), mode);
  assert.deepEqual(ruleConflicts('cup', rules, { unlocked: 2, cupCount: 3 }).find(c => c.rule === 'start'),
    { rule: 'start', reason: 'mode.cupLocked', params: { n: 3 } });
  assert.equal(ruleConflicts('cup', rules, { unlocked: 5, cupCount: 5 }).find(c => c.rule === 'start'), undefined);
});

test('every mode gets a one-line rules summary built from its own settings', () => {
  const summary = (mode, extra = {}) => modeRulesSummary(normalizeRaceConfig({ mode, ...extra }), fakeT);
  assert.match(summary('classic'), /mode\.setupAI\{"n":7\}/);
  assert.match(summary('custom', { rivals: 1, difficulty: 'hard', stages: 3 }), /mode\.setupAI\{"n":1\}.*mode\.setupDifficulty.*mode\.setupStages\{"n":3\}/);
  assert.match(summary('time', { clean: true }), /mode\.setupSolo.*mode\.cleanRules/);
  assert.match(summary('stunt', { duration: 180 }), /mode\.stuntMinutes\.180/);
  assert.match(summary('gauntlet', { hazardTier: 'extreme' }), /mode\.setupTier\{"value":"mode\.extreme"\}/);
  assert.match(summary('cup', { cupTracks: ['coast', 'neon', 'canyon', 'aurora', 'spiral'] }), /mode\.setupCupTracks\{"n":5\}/);
  assert.match(summary('circuit', { laps: 5 }), /circuit\.laps 5/);
  assert.match(summary('endless'), /^mode\.setupSolo/);
  for (const mode of ['custom', 'free', 'gauntlet']) {
    assert.match(summary(mode, { themes: true }), /mode\.themes/, mode);
    assert.doesNotMatch(summary(mode), /mode\.themes/, mode);
  }
  for (const mode of MODES) assert.ok(summary(mode).length > 0, mode);
});

test('new setup copy exists in English and Traditional Chinese', () => {
  const keys = ['mode.conflict.noRivals', 'mode.restoreDefaults', 'mode.editRules', 'mode.setupSolo', 'mode.setupTier', 'mode.setupCupTracks',
    'mode.eligibility.records', 'mode.eligibility.daily', 'mode.eligibility.modeBests', 'mode.eligibility.practice', 'mode.step.mode', 'mode.step.track', 'mode.step.rules', 'mode.themes'];
  for (const key of keys) {
    assert.ok(UI.en[key], `en ${key}`);
    assert.ok(UI['zh-TW'][key], `zh-TW ${key}`);
    assert.notEqual(UI.en[key], UI['zh-TW'][key], key);
  }
  setLocale('zh-TW');
  assert.equal(modeRulesSummary(normalizeRaceConfig({ mode: 'time' }), t).includes(UI['zh-TW']['mode.setupSolo']), true);
  setLocale('en');
});
