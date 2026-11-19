import { t } from './i18n.ts';

// AUTO starts on for every device; only a player's own toggle is remembered.
const AUTO_KEY = 'skyline-rush-auto';

interface AssistOptions {
  button: HTMLElement;
  /** The tutorial drives the throttle itself, so AUTO cannot change during it. */
  isLocked(): boolean;
  cueUi(): void;
}

export function setupAssistUI({ button, isLocked, cueUi }: AssistOptions) {
  let autoThrottle = true;
  try { autoThrottle = localStorage.getItem(AUTO_KEY) !== 'off'; } catch { /* AUTO stays on without storage. */ }
  function showAssist(): void {
    button.setAttribute('aria-pressed', String(autoThrottle));
    button.title = t(autoThrottle ? 'assist.titleOn' : 'assist.titleOff');
  }
  function toggleAssist(): void {
    if (isLocked()) return;
    autoThrottle = !autoThrottle;
    try { localStorage.setItem(AUTO_KEY, autoThrottle ? 'on' : 'off'); } catch { /* The toggle lasts for this page without storage. */ }
    showAssist();
    cueUi();
  }
  button.addEventListener('click', toggleAssist);
  showAssist();
  return { isOn: (): boolean => autoThrottle, showAssist, toggleAssist };
}
