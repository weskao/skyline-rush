// Decides when the Controls panel shows keyboard remapping: desktops at once, touch devices
// only after a physical (e.g. Bluetooth) keyboard has been used, remembered across visits.
export const KEYBOARD_SEEN_KEY = 'skyline-rush-keyboard-seen';

interface KeyTarget { tagName?: string; type?: string; isContentEditable?: boolean }
interface KeyLike { code: string; isComposing: boolean; target: KeyTarget | EventTarget | null }
interface KeyboardWindow {
  matchMedia(query: string): { matches: boolean };
  localStorage: Pick<Storage, 'getItem' | 'setItem'>;
  addEventListener(type: 'keydown', listener: (event: KeyLike) => void, capture: boolean): void;
  removeEventListener(type: 'keydown', listener: (event: KeyLike) => void, capture: boolean): void;
}

const TEXT_INPUT = /^(text|search|email|url|tel|password|number)$/;
const typesText = ({ tagName, type, isContentEditable }: KeyTarget): boolean =>
  !!isContentEditable || tagName === 'TEXTAREA' || (tagName === 'INPUT' && TEXT_INPUT.test(type ?? 'text'));

/** On-screen keyboards send an empty code (iOS) or compose (Android IME); text fields may get IME codes too. */
export const isPhysicalKey = ({ code, isComposing, target }: KeyLike): boolean =>
  !!code && !isComposing && !(target && typesText(target as KeyTarget));

export function trackKeyboard(show: (visible: boolean) => void, win: KeyboardWindow = window as unknown as KeyboardWindow): void {
  let seen = win.matchMedia('(hover: hover) and (pointer: fine)').matches;
  try { seen ||= win.localStorage.getItem(KEYBOARD_SEEN_KEY) === '1'; } catch { /* storage blocked: detect per visit */ }
  show(seen);
  if (seen) return;
  const onKey = (event: KeyLike): void => {
    if (!isPhysicalKey(event)) return;
    win.removeEventListener('keydown', onKey, true);
    try { win.localStorage.setItem(KEYBOARD_SEEN_KEY, '1'); } catch { /* storage blocked: detect per visit */ }
    show(true);
  };
  win.addEventListener('keydown', onKey, true);
}
