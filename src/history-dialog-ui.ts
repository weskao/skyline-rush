import { nextTick } from 'vue';
import { dialogNavigation, dialogTabIndex } from './dialog-navigation.ts';
import { historySections, historyView, updateHistoryView, type HistorySection } from './history-view-state.ts';

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
  const navigation = dialogNavigation(historyScreen);
  const tabs = $('#history-tabs');
  const track = $<HTMLSelectElement>('#history-track');
  let historyOpener: HTMLElement | null = null;
  let closing: Animation | null = null;

  async function select(section: HistorySection, focus: 'tab' | 'entry') {
    updateHistoryView({ section });
    await nextTick();
    if (!historyScreen.open) return;
    $('.history-content').scrollTop = 0;
    const selectedTab = $(`#history-tab-${section}`);
    const cloudAction = ['#cloud-login', '#cloud-logout', '#cloud-switch'].map(id => $<HTMLButtonElement>(id))
      .find(button => !button.hidden && !button.disabled);
    (focus === 'entry' && section === 'cloud' ? cloudAction ?? selectedTab : selectedTab).focus({ preventScroll: true });
  }

  for (const button of document.querySelectorAll<HTMLElement>('[data-open-history]')) button.addEventListener('click', () => {
    if (historyScreen.open) return;
    clearControls();
    historyOpener = button;
    track.value = getTrackId();
    showHistory();
    const section = historySections.find(id => id === button.dataset.openHistory) ?? 'races';
    updateHistoryView({ section });
    navigation.open();
    void select(section, 'entry');
  });

  tabs.addEventListener('click', event => {
    const tab = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
    const section = historySections.find(id => tab?.id === `history-tab-${id}`);
    if (section) void select(section, 'tab');
  });
  tabs.addEventListener('keydown', event => {
    const index = dialogTabIndex(historySections.indexOf(historyView.section), historySections.length, event.key);
    if (index === null) return;
    event.preventDefault();
    void select(historySections[index]!, 'tab');
  });
  track.addEventListener('change', showHistory);
  $('#mode-history-filter').addEventListener('change', showHistory);

  function closeHistory(): void {
    if (closing) return;
    if (calm()) { navigation.close(); return; }
    const animation = historyScreen.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(36px)' }], motionOptions('fast'));
    closing = animation;
    void animation.finished.then(() => navigation.close(), () => {});
  }
  $('#history-close').addEventListener('click', closeHistory);
  historyScreen.addEventListener('cancel', event => { event.preventDefault(); closeHistory(); });
  historyScreen.addEventListener('close', () => {
    closing?.cancel();
    closing = null;
    historyOpener?.focus({ preventScroll: true });
  });
  return { close: () => navigation.close(true), isOpen: () => historyScreen.open };
}
