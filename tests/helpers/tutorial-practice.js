import { DRIFT_BLEED, DRIFT_MIN_SPEED, DRIFT_REWARDS } from '../../src/game.js';

// km/h on #speed before the keyboard practice starts its BRAKE + LEFT drift. A drift sheds DRIFT_BLEED m/s²
// and ends below DRIFT_MIN_SPEED, so enter fast enough to outlast the first payout tier plus 0.5 s.
const FIRST_TIER = Math.min(...DRIFT_REWARDS.map(reward => reward.time));
export const DRIFT_ENTRY_KMH = Math.ceil((DRIFT_MIN_SPEED + DRIFT_BLEED * (FIRST_TIER + .5)) * 3.6);
