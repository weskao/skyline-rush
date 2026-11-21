import { sprintTier, type SprintTierId } from './sprint-tier.ts';
import { interpolate } from './i18n.ts';

/** The in-race HUD's one reading of the sprint ladder (src/sprint-tier.ts). It writes `data-sprint-tier` (the tier
 * id while racing) and `data-sprint-chain` (2 or 3 while a NITRO chain runs) on the root, on change only, and
 * returns the tier's caption for the HUD lines that name it. CSS draws every look from those two attributes
 * (src/style.css, src/touch-sprint-buttons.css), so a new tier is one CSS rule and one `hud.tier.<id>` key.
 * Rule: .claude/rules/touch-sprint-buttons.md. */
export function createSprintTierHud(root: { dataset: DOMStringMap }) {
  let tier: SprintTierId = 'idle', chain = 0, burst = 0, copy: Record<string, string> | undefined, caption: string | undefined;
  return {
    /** One HUD tick. `boost` is held BOOST with charge left (car.boosting); `charges` is car.nitroBurst. */
    update(racing: boolean, nitro: boolean, boost: boolean, charges: number, L: Record<string, string>): string | undefined {
      const next = racing ? sprintTier(nitro, boost) : 'idle';
      const nextBurst = next !== 'idle' && nitro && charges > 1 ? Math.floor(charges) : 0, nextChain = Math.min(3, nextBurst);
      if (next !== tier) { if (next === 'idle') delete root.dataset.sprintTier; else root.dataset.sprintTier = next; }
      if (nextChain !== chain) { if (nextChain) root.dataset.sprintChain = String(nextChain); else delete root.dataset.sprintChain; }
      if (next !== tier || nextBurst !== burst || L !== copy) {
        const plain = L[`hud.tier.${next}`];
        caption = nextBurst ? interpolate(L[`hud.tierChain.${next}`] ?? plain ?? '', { n: nextBurst }) : plain;
      }
      tier = next; chain = nextChain; burst = nextBurst; copy = L;
      return caption;
    },
  };
}
