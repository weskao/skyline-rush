import { t } from './i18n.ts';
import { showSettingToast } from './toast-view-state.ts';
import { icons } from './icons.ts';

// AUTO starts on for every device; only a player's own toggle is remembered.
const AUTO_KEY = 'skyline-rush-auto';

interface AssistButton {
  title: string;
  setAttribute(name: string, value: string): void;
  addEventListener(type: 'click', listener: () => void): void;
}

export interface AssistUIDeps {
  button: AssistButton;
  isLocked?: () => boolean;
  cue: () => void;
}

export function setupAssistUI({ button, isLocked, cue }: AssistUIDeps) {
  let on = true;
  try { on = localStorage.getItem(AUTO_KEY) !== 'off'; } catch { /* AUTO stays on without storage. */ }

  function show() {
    button.setAttribute('aria-pressed', String(on));
    button.title = t(on ? 'assist.titleOn' : 'assist.titleOff');
  }

  function toggle() {
    if (isLocked?.()) return;
    on = !on;
    try { localStorage.setItem(AUTO_KEY, on ? 'on' : 'off'); } catch { /* The toggle lasts for this page without storage. */ }
    show();
    cue();
    showSettingToast('assist', on, icons.assist);
  }

  button.addEventListener('click', toggle);
  return { isOn: () => on, show, toggle };
}
