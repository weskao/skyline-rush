import { nextTick } from 'vue';

// History dialog lifecycle: open from any History/Medals/Cloud entry, animated close, focus return.
// The records themselves are rendered by history-ui.ts.
interface HistoryDialogOptions {
  getTrackId(): string;
  showHistory(): void;
  clearControls(): void;
  calm(): boolean;
  motionOptions(duration: string): KeyframeAnimationOptions;
}

export function setupHistoryDialog({ getTrackId, showHistory, clearControls, calm, motionOptions }: HistoryDialogOptions) {
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const historyScreen = $<HTMLDialogElement>('#history-screen');
  let historyOpener: HTMLElement | null = null;
  for (const button of document.querySelectorAll<HTMLElement>('[data-open-history]')) button.addEventListener('click', async () => {
    clearControls(); historyOpener = button; $<HTMLSelectElement>('#history-track').value = getTrackId();
    showHistory(); historyScreen.showModal();
    await nextTick();
    if (!historyScreen.open) return;
    if (button.dataset.openHistory === 'medals') $('#achievements-title').scrollIntoView({ block: 'start' });
    if (button.dataset.openHistory === 'cloud') ($('#cloud-login').hidden ? $('#cloud-logout') : $('#cloud-login')).focus();
  });
  $('#history-track').addEventListener('change', showHistory);
  $('#mode-history-filter').addEventListener('change', showHistory);
  function closeHistory(): void {
    if (calm()) { historyScreen.close(); return; }
    const animation = historyScreen.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(36px)' }], motionOptions('fast'));
    animation.finished.catch(() => {}).then(() => historyScreen.close());
  }
  $('#history-close').addEventListener('click', closeHistory);
  historyScreen.addEventListener('cancel', event => { event.preventDefault(); closeHistory(); });
  historyScreen.addEventListener('close', () => historyOpener?.focus({ preventScroll: true }));
  historyScreen.addEventListener('keydown', event => event.stopPropagation());
  return {
    /** Immediate close, used when a Daily Challenge starts from inside the dialog. */
    close(): void { historyScreen.close(); },
    isOpen: (): boolean => historyScreen.open,
  };
}
