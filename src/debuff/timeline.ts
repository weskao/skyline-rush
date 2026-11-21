import type { ItemAttack } from '../item-attacks.ts';

// One clock for every surface that shows a Freeze or EMP hit (centre panel, screen edge, speedometer).
// Each effect's look lives in its own folder (./freeze, ./emp); shared files only route to it.
export type DebuffPhase = 'impact' | 'spread' | 'active' | 'recovery';

/** Seconds after the hit at which the impact pulse and the spread end; `recovery` = the last seconds before expiry. */
export const DEBUFF_TIMELINE = {
  freeze: { impact: .15, spread: .65, recovery: .5 },
  emp: { impact: .1, spread: .45, recovery: .3 },
} as const;

export function debuffPhase(attack: ItemAttack, age: number, remaining: number): DebuffPhase {
  const { impact, spread, recovery } = DEBUFF_TIMELINE[attack];
  return remaining <= recovery ? 'recovery' : age < impact ? 'impact' : age < spread ? 'spread' : 'active';
}
