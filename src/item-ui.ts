import { useHeldItem } from './game.js';
import type { ActiveItemCar, ActiveItem } from './active-items.ts';
import { t } from './i18n.ts';
import { setHiddenIfChanged, setTextIfChanged } from './hud-dom.ts';

interface ItemRace {
  phase: string;
  config: { activeItems?: boolean };
  player: ActiveItemCar;
  rivals: unknown[];
}
interface ItemSettings { itemRules?: string; activeItems?: boolean }
const powers: ActiveItem[] = ['shield', 'magnet', 'ghost', 'freeze'];
export const itemRuleValue = (rules: ItemSettings): string => rules.itemRules ?? (rules.activeItems ? 'all' : 'classic');

export function setupItemUI({ getRace, cue }: { getRace: () => ItemRace; cue: (name: string) => void }) {
  const slot = document.getElementById('item-slot')!;
  const status = document.getElementById('item-status')!;
  const button = document.getElementById('activate-item') as HTMLButtonElement;
  let previousRace: ItemRace | null = null;
  let previousHeld: ActiveItem | null = null;
  let wasCooling = false;
  function activate() { if (useHeldItem(getRace())) cue('pickup'); }
  button.addEventListener('click', activate);
  return { activate, update(race: ItemRace) {
    const car = race.player;
    if (race !== previousRace) { previousHeld = null; wasCooling = false; previousRace = race; }
    setHiddenIfChanged(slot, !race.config.activeItems || race.phase === 'ready');
    if (slot.hidden) return;
    const effect = car.heldItem ?? powers.find(item => car.effects[item] > 0) ?? null;
    const cooling = car.itemCooldown > 0;
    const key = cooling ? 'mode.itemCooling' : car.heldItem ? 'mode.itemReady' : effect ? 'mode.itemActive' : 'mode.itemEmpty';
    setTextIfChanged(status, t(key, { item: effect ? t('mode.item.' + effect) : '',
      sec: Math.ceil(cooling ? car.itemCooldown : effect ? car.effects[effect] : 0) }));
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
