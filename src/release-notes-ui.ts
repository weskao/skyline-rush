import { nextTick } from 'vue';
import { updateReleaseView } from './release-view-state.ts';
import { HISTORY_KEY } from './history.ts';
import { getLocale, t, formatDate } from './i18n.ts';
import { CURRENT_RELEASE, NOTES_SEEN_KEY, recentReleases, shouldAnnounce, markAnnouncementSeen, releaseText, releaseImage } from './release-notes.ts';

// Pure keyboard navigation, independently testable without a DOM.
export function releaseTabIndex(index: number, count: number, key: string): number | null {
  const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const step = steps[key];
  if (step) return (index + step + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

// The DOM controller owns only the event-driven release dialog.
// Gameplay, control state and notice restoration stay owned by main.js.
interface ReleaseNotesUIOptions {
  canOpen: () => boolean;
  canAutoOpen: () => boolean;
  beforeOpen: () => void;
  afterClose: () => void;
  reducedMotion: MediaQueryList;
}
export function setupReleaseNotesUI({ canOpen, canAutoOpen, beforeOpen, afterClose, reducedMotion }: ReleaseNotesUIOptions) {
  const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;
  const releaseDialog = document.querySelector<HTMLDialogElement>('#whats-new-screen')!;
  const releaseOpen = document.querySelector<HTMLButtonElement>('#whats-new-open')!;
  const releasePanel = $('#release-panel');
  const RECENT_RELEASES = recentReleases();
  let releaseIndex = 0;
  let releaseOpener: HTMLElement | null = null;
  let releaseShownHere = false;
  let releaseUnread = new Set<string>();
  const releaseStorage = (): Storage | null => { try { return localStorage; } catch { return null; } };
  // Someone who finished the guide or saved a race played before the notes were recorded.
  const returningPlayer = () => {
    try { return localStorage.getItem('skyline-rush-guide-seen') !== null || localStorage.getItem(HISTORY_KEY) !== null; }
    catch { return false; }
  };
  const releaseDay = (date: string, options: Intl.DateTimeFormatOptions): string => formatDate(new Date(date + 'T00:00:00'), options);
  
  function renderReleaseNotes() {
    if (!CURRENT_RELEASE) return;
    const locale = getLocale();
    const tabs = RECENT_RELEASES.map((release, index) => ({
      id: 'release-tab-' + index,
      version: release.version,
      selected: index === releaseIndex,
      latest: index === 0,
      note: index ? releaseDay(release.date, { month: 'short', day: 'numeric' }) : t('release.latest'),
      unread: releaseUnread.has(release.version),
      unreadLabel: t('release.unread'),
    }));
    const release = RECENT_RELEASES[releaseIndex];
    const hero = releaseImage(release.image, locale);
    updateReleaseView({
      tabs,
      panelLabel: 'release-tab-' + releaseIndex,
      version: 'v' + release.version,
      date: releaseDay(release.date, { year: 'numeric', month: 'long', day: 'numeric' }),
      heroSrc: hero ? import.meta.env.BASE_URL + hero : '',
      entries: release.highlights.map(item => {
        const image = releaseImage(item.image, locale);
        return {
          kind: item.kind,
          kindLabel: t('release.kind.' + item.kind),
          title: releaseText(item.title, locale),
          description: releaseText(item.description, locale),
          image: image ? import.meta.env.BASE_URL + image : '',
        };
      }),
    });
    updateReleaseView({ openHasUpdate: !releaseShownHere && shouldAnnounce(CURRENT_RELEASE, releaseStorage(), returningPlayer()) });
  }
  function selectRelease(index: number): void {
    releaseIndex = (index + RECENT_RELEASES.length) % RECENT_RELEASES.length;
    renderReleaseNotes();
    nextTick(() => {
      const tab = $('#release-tab-' + releaseIndex);
      tab?.focus({ preventScroll: true });
      tab?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      releasePanel.scrollTop = 0;
      if (!reducedMotion.matches) releasePanel.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    });
  }
  function openReleaseNotes(opener: HTMLElement | null = null): boolean {
    if (!CURRENT_RELEASE || !canOpen() || releaseDialog.open || document.querySelector('dialog[open]')) return false;
    releaseOpener = opener;
    beforeOpen();
    // Showing the notes is what counts as read: record it now so a reload or crash never repeats them.
    // Everything newer than the previous record stays marked for this visit only.
    const storage = releaseStorage(), returning = returningPlayer();
    releaseUnread = new Set(RECENT_RELEASES.filter(release => shouldAnnounce(release, storage, returning)).map(release => release.version));
    markAnnouncementSeen(CURRENT_RELEASE, storage);
    releaseShownHere = true;
    releaseIndex = 0;
    renderReleaseNotes();
    releaseDialog.showModal();
    $('#release-close').focus({ preventScroll: true });
    return true;
  }
  function maybeShowReleaseNotes() {
    if (releaseShownHere || !CURRENT_RELEASE) return;
    const storage = releaseStorage(), returning = returningPlayer();
    if (!shouldAnnounce(CURRENT_RELEASE, storage, returning)) {
      // A first-time player starts from today's notes; the next release is the first one announced to them.
      if (!returning) try { if (storage?.getItem(NOTES_SEEN_KEY) == null) markAnnouncementSeen(CURRENT_RELEASE, storage); } catch { /* nothing to record */ }
      return;
    }
    if (!canAutoOpen() || !canOpen() || document.querySelector('dialog[open]')) return;
    openReleaseNotes();
  }
  function closeReleaseNotes() { if (releaseDialog.open) releaseDialog.close(); }
  releaseOpen.addEventListener('click', () => openReleaseNotes(releaseOpen));
  $('#release-close').addEventListener('click', closeReleaseNotes);
  $('#release-continue').addEventListener('click', closeReleaseNotes);
  $('#release-versions').addEventListener('click', ({ target }) => {
    const tab = (target as HTMLElement | null)?.closest<HTMLElement>('[role="tab"]');
    if (tab) selectRelease(Number(tab.id.slice('release-tab-'.length)));
  });
  $('#release-versions').addEventListener('keydown', (event: KeyboardEvent) => {
    const target = releaseTabIndex(releaseIndex, RECENT_RELEASES.length, event.key);
    if (target === null) return;
    event.preventDefault();
    selectRelease(target);
  });
  releaseDialog.addEventListener('cancel', event => { event.preventDefault(); closeReleaseNotes(); });
  releaseDialog.addEventListener('keydown', event => event.stopPropagation());
  releaseDialog.addEventListener('close', () => {
    updateReleaseView({ openHasUpdate: false });
    (releaseOpener ?? releaseOpen).focus({ preventScroll: true });
    afterClose();
  });
  // A missing bundled image still leaves the entire description readable.
  // The Vue image handler clears its source when the asset fails.
  // A higher-priority modal may have been open during the first ready-state check.
  document.addEventListener('close', () => queueMicrotask(maybeShowReleaseNotes), true);
  updateReleaseView({ openHidden: !CURRENT_RELEASE });

  return { renderReleaseNotes, maybeShowReleaseNotes };
}
