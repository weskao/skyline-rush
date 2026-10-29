// REPLAY-03: what the aerial (risk ring) and ground (close hazard pass) lines pay.
// Default rules reproduce the original payouts exactly, so Classic, Daily and existing records are unchanged.
export const RISK_SCORE = 500;
const NEAR_PASS = 300, WIDE_PASS = 150;
const HARD_SCALE = 1.5; // only Custom lets players pick difficulty; Daily presets keep ×1

export interface RiskRules { readonly rings: boolean; readonly ringScore: number; readonly nearScore: number; readonly passScore: number }
interface RiskConfig { readonly mode?: string; readonly difficulty?: string; readonly riskLines?: string }

export function riskRules(config: RiskConfig): RiskRules {
  if (config.riskLines === 'off') return { rings: false, ringScore: 0, nearScore: 0, passScore: 0 };
  const scale = config.mode === 'custom' && config.difficulty === 'hard' ? HARD_SCALE : 1;
  return { rings: true, ringScore: RISK_SCORE * scale, nearScore: NEAR_PASS * scale, passScore: WIDE_PASS };
}
