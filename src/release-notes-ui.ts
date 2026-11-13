import { nextTick } from 'vue';
import { releaseView, updateReleaseView } from './release-view-state.ts';
import { getLocale, t, formatDate, SUPPORTED_LOCALES } from './i18n.ts';
import { CURRENT_RELEASE, UPCOMING, recentReleases, shouldAnnounce, markAnnouncementSeen, releaseHighlightCopy, releaseImage, releaseHeroVideo, highlightsByKind, type ReleaseVideo } from './release-notes.ts';
import type { ReleaseClipView } from './ui-state-contracts.ts';
import { createReleaseMediaCache } from './release-media-cache.ts';
import { onUserActivation } from './user-activation.ts';

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
  const portrait = matchMedia('(orientation: portrait)');
  const RECENT_RELEASES = recentReleases();
  let releaseIndex = 0;
  let releaseOpener: HTMLElement | null = null;
  let releaseShownHere = false;
  let releaseUnread = new Set<string>();
  const releaseStorage = (): Storage | null => { try { return localStorage; } catch { return null; } };
  const releaseDay = (date: string, options: Intl.DateTimeFormatOptions): string => formatDate(new Date(date + 'T00:00:00'), options);
  const versionLabel = (version: string): string => version === UPCOMING ? t('release.upcoming') : 'v' + version;
  // Absolute, so the address matches what Cache Storage records for it.
  const bundled = (path: string): string => new URL(import.meta.env.BASE_URL + path, location.href).href;
  const clipSources = new Set(RECENT_RELEASES.flatMap(release => [release.video, ...release.highlights.map(item => item.video)]
    .flatMap(video => SUPPORTED_LOCALES.flatMap(locale => [false, true].map(portrait => releaseHeroVideo(video, locale, portrait)?.src))))
    .filter((src): src is string => !!src).map(bundled));
  const mediaCache = createReleaseMediaCache(clipSources, {
    caches: globalThis.caches, fetch: url => fetch(url), createObjectURL: blob => URL.createObjectURL(blob),
  });
  // Clips download ahead only while the notes are open, so the hero and any enlarged clip start at once; highlight clips
  // draw only their poster and play button. A reader who moved on meanwhile keeps their view (the stale view just updates unseen).
  function loadVisibleClips() {
    if (!releaseDialog.open) return;
    for (const view of [releaseView.heroVideo, ...releaseView.entries.map(entry => entry.video)]) {
      if (view && !view.src) mediaCache.load(view.source).then(src => { view.src = src; if (view === releaseView.heroVideo) nextTick(syncReleaseVideo); });
    }
  }
  function clipView(video: ReleaseVideo | null | undefined, locale: string): ReleaseClipView | null {
    const clip = releaseHeroVideo(video, locale, portrait.matches);
    if (!clip) return null;
    const source = bundled(clip.src);
    return { src: mediaCache.peek(source) ?? '', source, poster: import.meta.env.BASE_URL + clip.poster, variant: clip.variant, controls: reducedMotion.matches };
  }

  function renderReleaseNotes() {
    if (!CURRENT_RELEASE) return;
    const locale = getLocale();
    const tabs = RECENT_RELEASES.map((release, index) => ({
      id: 'release-tab-' + index,
      version: release.version,
      label: versionLabel(release.version),
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
      version: versionLabel(release.version),
      date: releaseDay(release.date, { year: 'numeric', month: 'long', day: 'numeric' }),
      heroSrc: hero ? import.meta.env.BASE_URL + hero : '',
      zoom: { image: t('release.zoomImage'), video: t('release.zoomVideo'), close: t('release.zoomClose'), pause: t('release.pauseClip'), resume: t('release.resumeClip') },
      heroVideo: clipView(release.video, locale),
      entries: highlightsByKind(release.highlights).map(item => {
        const image = releaseImage(item.image, locale);
        const { title, description } = releaseHighlightCopy(item, locale);
        return {
          kind: item.kind,
          kindLabel: t('release.kind.' + item.kind),
          title,
          zoomLabel: t('release.zoomEntry', { title }),
          description,
          image: image ? import.meta.env.BASE_URL + image : '',
          video: clipView(item.video, locale),
          playLabel: t('release.playEntry', { title }),
        };
      }),
    });
    updateReleaseView({ openHasUpdate: !releaseShownHere && shouldAnnounce(CURRENT_RELEASE, releaseStorage()) });
    nextTick(syncReleaseVideo);
    loadVisibleClips();
  }
  // The hero plays only while the notes are open and it is on screen (short landscape hides it); reduced motion keeps its poster and controls.
  function syncReleaseVideo() {
    const video = document.querySelector<HTMLVideoElement>('#release-video');
    if (!video) return;
    if (releaseDialog.open && !reducedMotion.matches && video.offsetParent) video.play().catch(() => { /* autoplay refused: the poster stays */ });
    else video.pause();
  }
  // iPhone refuses even a muted clip in Low Power Mode until the player touches the page: the first tap or key anywhere starts
  // the hero where it is (as it starts the music), not only a tap on the clip, which enlarges it. An enlarged view keeps it waiting.
  onUserActivation(() => {
    if (releaseDialog.open && !reducedMotion.matches && !releaseDialog.querySelector('dialog[open]')
      && document.querySelector<HTMLVideoElement>('#release-video')?.paused) syncReleaseVideo();
  });
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
    const storage = releaseStorage();
    releaseUnread = new Set(RECENT_RELEASES.filter(release => shouldAnnounce(release, storage)).map(release => release.version));
    markAnnouncementSeen(CURRENT_RELEASE, storage);
    releaseShownHere = true;
    releaseIndex = 0;
    renderReleaseNotes();
    releaseDialog.showModal();
    loadVisibleClips();
    $('#release-close').focus({ preventScroll: true });
    return true;
  }
  function maybeShowReleaseNotes() {
    if (releaseShownHere || !CURRENT_RELEASE) return;
    if (!shouldAnnounce(CURRENT_RELEASE, releaseStorage())) return;
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
  portrait.addEventListener('change', () => { if (releaseDialog.open) renderReleaseNotes(); }); // a turned phone gets the matching clip
  releaseDialog.addEventListener('close', () => {
    syncReleaseVideo();
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
