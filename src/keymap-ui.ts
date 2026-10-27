import { t } from './i18n.ts';
import { loadKeyMap, rebind, resetKeyMap, saveKeyMap, type KeyMap, type DriveAction } from './key-map.ts';

type Say = (element: HTMLElement, text: () => string) => void;
interface KeyMapOptions {
  clearControls(): void;
  /** Writes a status message that re-renders on a language switch. */
  say: Say;
}

const ARROWS: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
export const keyLabel = (code: string): string =>
  ARROWS[code] ?? code.replace(/^Key|^Digit/, '').replace('ShiftLeft', 'Left Shift').replace('ShiftRight', 'Right Shift');

/** One group per key slot (W A S D, then ↑ ← ↓ →); Left/Right Shift read as one Shift. */
export function keyLegendGroups(actions: string[], keyMap: KeyMap): string[][] {
  const codes = (action: string): string[] => keyMap[action as DriveAction];
  const seen = new Set<string>();
  return Array.from({ length: Math.max(...actions.map(action => codes(action).length)) }, (_, slot) => actions
    .map(action => codes(action)[slot]).filter((code): code is string => !!code).map(code => keyLabel(code).replace(/^(Left|Right) Shift$/, 'Shift'))
    .filter(label => !seen.has(label) && !!seen.add(label))).filter(group => group.length);
}

export function setupKeyMapUI({ clearControls, say }: KeyMapOptions) {
  const status = document.querySelector<HTMLElement>('#keymap-status')!;
  let keyMap = loadKeyMap();
  let rebinding: DriveAction | null = null;

  function showKeyMap(): void {
    // Start-screen legend: one kbd group per key slot, "/" between groups.
    for (const keys of document.querySelectorAll<HTMLElement>('.intro-controls [data-keys], #guide-screen [data-keys], #tutorial-input[data-keys]')) {
      const groups = keyLegendGroups(keys.dataset.keys!.split(' '), keyMap);
      keys.replaceChildren(...groups.flatMap((group, i) => [...(i ? ['/'] : []), ...group.map(label => {
        const key = document.createElement('kbd'); key.textContent = label; return key;
      })]));
    }
    for (const button of document.querySelectorAll<HTMLElement>('[data-rebind]')) {
      button.lastElementChild!.textContent = keyMap[button.dataset.rebind as DriveAction].map(keyLabel).join(' / ');
      button.setAttribute('aria-pressed', String(rebinding === button.dataset.rebind));
    }
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-rebind]')) button.addEventListener('click', () => {
    clearControls();
    rebinding = button.dataset.rebind as DriveAction;
    const action = rebinding;
    say(status, () => t('keymap.press', { action: t(`keymap.${action}`) }));
    showKeyMap();
  });
  document.querySelector('#keymap-reset')!.addEventListener('click', () => {
    clearControls(); rebinding = null; keyMap = resetKeyMap(); saveKeyMap(keyMap); showKeyMap();
    say(status, () => t('keymap.restored'));
  });
  /** Consumes the key while waiting for a new binding; returns false when not rebinding. */
  function handleRebindKey(event: KeyboardEvent): boolean {
    if (!rebinding) return false;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.repeat) return true;
    if (event.code === 'Escape') { rebinding = null; showKeyMap(); say(status, () => t('keymap.cancelled')); return true; }
    const action = rebinding;
    const result = rebind(keyMap, action, event.code);
    if (result.error) {
      const key = keyLabel(event.code);
      say(status, () => result.error === 'reserved' ? t('keymap.reserved', { key }) : t('keymap.unavailable'));
      return true;
    }
    clearControls(); keyMap = result.map; saveKeyMap(keyMap); rebinding = null; showKeyMap();
    const key = keyLabel(event.code);
    say(status, () => result.swapped ? t('keymap.swapped', { action: t(`keymap.${action}`), other: t(`keymap.${result.swapped}`) }) : t('keymap.assigned', { action: t(`keymap.${action}`), key }));
    return true;
  }
  showKeyMap();
  return {
    getKeyMap: (): KeyMap => keyMap,
    showKeyMap,
    handleRebindKey,
    cancelRebinding(): void { rebinding = null; },
  };
}
