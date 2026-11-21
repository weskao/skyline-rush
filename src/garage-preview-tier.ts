import { SPRINT_TIERS, sprintTier } from './sprint-tier.ts';
import type { SprintTierId } from './sprint-tier.ts';

// Which sprint tier the Garage preview burns. Plain state, no Vue: the Studio stage reads it every frame.
type Inputs = Readonly<{ nitro: boolean; boost: boolean }>;
const ids = Object.keys(SPRINT_TIERS) as SprintTierId[];
/** Every ladder row above idle, weakest first. A new row in sprint-tier.ts appears here by itself. */
export const PREVIEW_TIERS: readonly SprintTierId[] = ids
  .filter(id => SPRINT_TIERS[id].level > 0).sort((a, b) => SPRINT_TIERS[a].level - SPRINT_TIERS[b].level);
// The ladder owns the inputs-to-tier rule; ask it instead of keeping a second table.
const inputs = new Map<SprintTierId, Inputs>();
for (const nitro of [false, true]) for (const boost of [false, true]) inputs.set(sprintTier(nitro, boost), { nitro, boost });

const top = PREVIEW_TIERS[PREVIEW_TIERS.length - 1]!;
let tier = top;
export const garagePreviewTier = (): SprintTierId => tier;
export function setGaragePreviewTier(id: SprintTierId) { tier = PREVIEW_TIERS.includes(id) ? id : top; }
export const previewTierInputs = (): Inputs => inputs.get(tier)!;
