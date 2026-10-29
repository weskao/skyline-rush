import type { BonusCar } from './bonus-gates.ts';
import { useHeldItem } from './game.js';
import type { ActiveItemCar, ActiveItem } from './active-items.ts';
import { t } from './i18n.ts';
import { setHiddenIfChanged, setTextIfChanged } from './hud-dom.ts';

export interface ItemRace {
  phase: string;
  elapsed: number;
  rings: { type: string; distance: number; hit?: boolean }[];
  config: { activeItems?: boolean };
  player: ActiveItemCar & Partial<BonusCar>;
  rivals: unknown[];
}
interface ItemSettings { itemRules?: unknown; activeItems?: unknown }
const powers: ActiveItem[] = ['shield', 'magnet', 'ghost', 'freeze', 'emp'];
export const itemRuleValue = (rules: ItemSettings): string => typeof rules.itemRules === 'string' ? rules.itemRules : rules.activeItems ? 'all' : 'classic';

export function setupItemUI({ getRace, cue }: { getRace: () => ItemRace; cue: (name: string) => void }) {
  const slot = document.getElementById('item-slot')!;
  const status = document.getElementById('item-status')!;
  const bonus = document.getElementById('bonus-status')!;
  const button = document.getElementById('activate-item') as HTMLButtonElement;
  let previousRace: ItemRace | null = null;
  let previousHeld: ActiveItem | null = null;
  let wasCooling = false;
  let lastBonus: BonusCar['lastBonus'];
  let warned: ItemRace['rings'][number] | undefined;
  function updateBonus(race: ItemRace): void {
    const car = race.player;
    const ahead = race.rings.find(ring => !ring.hit && (ring.type.endsWith('-pad') || ring.type === 'emp') && ring.distance > (car.distance ?? 0));
    const active = (car.recoveryTime ?? 0) > 0 ? 'recovery-pad' : (car.multiplierTime ?? 0) > 0 ? 'score-pad' : null;
    const recent = car.lastBonus && race.elapsed - car.lastBonus.time < 1.2 ? car.lastBonus : null;
    const near = ahead && ahead.distance - (car.distance ?? 0) <= 170 ? ahead : null;
    setHiddenIfChanged(bonus, race.phase === 'ready' || !(active || recent || near));
    if (!bonus.hidden) {
      const item = t('mode.bonus.' + (active ?? recent?.type ?? near!.type));
      setTextIfChanged(bonus, active ? t('mode.bonusActive', { item, sec: Math.ceil(active === 'recovery-pad' ? car.recoveryTime! : car.multiplierTime!) }) :
        recent ? t('mode.bonusCollected', { item }) : t('mode.bonusAhead', { item, n: Math.ceil(near!.distance - (car.distance ?? 0)) }));
    }
    if (race.phase === 'racing') {
      if (car.lastBonus && car.lastBonus !== lastBonus) cue('pickup');
      else if (near && near !== warned) cue('ui');
    }
    lastBonus = car.lastBonus; warned = near ?? undefined;
  }
  function activate() { if (useHeldItem(getRace())) cue('pickup'); }
  button.addEventListener('click', activate);
  return { activate, update(race: ItemRace) {
    const car = race.player;
    if (race !== previousRace) { previousHeld = null; wasCooling = false; previousRace = race; lastBonus = undefined; warned = undefined; }
    updateBonus(race);
    setHiddenIfChanged(slot, !race.config.activeItems || race.phase === 'ready');
    if (slot.hidden) return;
    const effect = car.heldItem ?? powers.find(item => (car.effects[item] ?? 0) > 0) ?? null;
    const cooling = car.itemCooldown > 0;
    const key = cooling ? 'mode.itemCooling' : car.heldItem ? 'mode.itemReady' : effect ? 'mode.itemActive' : 'mode.itemEmpty';
    setTextIfChanged(status, t(key, { item: effect ? t('mode.item.' + effect) : '',
      sec: Math.ceil(cooling ? car.itemCooldown : effect ? car.effects[effect] ?? 0 : 0) }));
    if (slot.dataset.item !== (effect ?? '')) slot.dataset.item = effect ?? '';
    const disabled = !car.heldItem || race.phase !== 'racing' || cooling;
    if (button.disabled !== disabled) button.disabled = disabled;
    if (race.phase === 'racing') {
      if (car.heldItem && car.heldItem !== previousHeld) cue('pickup');
      else if (car.heldItem && wasCooling && !cooling) cue('ui');
    }
    previousHeld = car.heldItem; wasCooling = cooling;
  } };
}
