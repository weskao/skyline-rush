import { HISTORY_KEY } from './history.js';
import { getLocale, t, formatDate } from './i18n.js';
import { CURRENT_RELEASE, NOTES_SEEN_KEY, recentReleases, shouldAnnounce, markAnnouncementSeen, releaseText, releaseImage } from './release-notes.js';

// Pure keyboard navigation, independently testable without a DOM.
export function releaseTabIndex(index, count, key) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[key];
  if (step) return (index + step + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

// The DOM controller owns only the event-driven release dialog.
// Gameplay, control state and notice restoration stay owned by main.js.
export function setupReleaseNotesUI({ canOpen, canAutoOpen, beforeOpen, afterClose, reducedMotion }) {
  const $ = selector => document.querySelector(selector);
  const releaseDialog = $('#whats-new-screen');
  const releaseOpen = $('#whats-new-open');
  const releasePanel = $('#release-panel');
  const RECENT_RELEASES = recentReleases();
  let releaseIndex = 0;
  let releaseOpener = null;
  let releaseShownHere = false;
  let releaseUnread = new Set();
  const releaseStorage = () => { try { return localStorage; } catch { return null; } };
  // Someone who finished the guide or saved a race played before the notes were recorded.
  const returningPlayer = () => {
    try { return localStorage.getItem('skyline-rush-guide-seen') !== null || localStorage.getItem(HISTORY_KEY) !== null; }
    catch { return false; }
  };
  const releaseDay = (date, options) => formatDate(new Date(date + 'T00:00:00'), options);
  
  function renderReleaseNotes() {
    if (!CURRENT_RELEASE) return;
    const locale = getLocale();
    const tabs = RECENT_RELEASES.map((release, index) => {
      const tab = document.createElement('button');
      const selected = index === releaseIndex;
      Object.assign(tab, { type: 'button', id: 'release-tab-' + index, className: 'release-tab', tabIndex: selected ? 0 : -1 });
      tab.dataset.version = release.version;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'release-panel');
      tab.setAttribute('aria-selected', String(selected));
      const name = document.createElement('span');
      name.className = 'release-tab-version';
      name.textContent = 'v' + release.version;
      const note = document.createElement('span');
      note.className = index ? 'release-tab-note' : 'release-tab-note release-tab-latest';
      note.textContent = index ? releaseDay(release.date, { month: 'short', day: 'numeric' }) : t('release.latest');
      tab.append(name, note);
      if (releaseUnread.has(release.version)) {
        const unread = document.createElement('span');
        unread.className = 'release-tab-unread';
        unread.textContent = t('release.unread');
        tab.append(unread);
      }
      return tab;
    });
    $('#release-versions').replaceChildren(...tabs);
    releasePanel.setAttribute('aria-labelledby', 'release-tab-' + releaseIndex);
    const release = RECENT_RELEASES[releaseIndex];
    $('#release-version').textContent = 'v' + release.version;
    $('#release-date').textContent = releaseDay(release.date, { year: 'numeric', month: 'long', day: 'numeric' });
    const hero = $('#release-hero');
    const heroImage = releaseImage(release.image, locale);
    hero.hidden = !heroImage;
    if (heroImage) hero.src = import.meta.env.BASE_URL + heroImage;
    else hero.removeAttribute('src');
    const entries = release.highlights.map(item => {
      const article = document.createElement('article');
      article.className = 'release-entry';
      article.dataset.kind = item.kind;
      const image = releaseImage(item.image, locale);
      if (image) {
        const thumb = document.createElement('img');
        thumb.src = import.meta.env.BASE_URL + image;
        thumb.alt = '';
        thumb.loading = 'lazy';
        thumb.addEventListener('error', () => thumb.remove(), { once: true });
        article.append(thumb);
      }
      const copy = document.createElement('div');
      const kind = document.createElement('span');
      kind.className = 'release-kind';
      kind.textContent = t('release.kind.' + item.kind);
      const title = document.createElement('strong');
      title.textContent = releaseText(item.title, locale);
      const description = document.createElement('p');
      description.textContent = releaseText(item.description, locale);
      copy.append(kind, title, description);
      article.append(copy);
      return article;
    });
    $('#release-items').replaceChildren(...entries);
    releaseOpen.classList.toggle('has-update', !releaseShownHere && shouldAnnounce(CURRENT_RELEASE, releaseStorage(), returningPlayer()));
  }
  function selectRelease(index) {
    releaseIndex = (index + RECENT_RELEASES.length) % RECENT_RELEASES.length;
    renderReleaseNotes();
    const tab = $('#release-tab-' + releaseIndex);
    tab.focus({ preventScroll: true });
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    releasePanel.scrollTop = 0;
    if (!reducedMotion.matches) releasePanel.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.16, 1, .3, 1)' });
  }
  function openReleaseNotes(opener = null) {
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
    const tab = target.closest('[role="tab"]');
    if (tab) selectRelease(Number(tab.id.slice('release-tab-'.length)));
  });
  $('#release-versions').addEventListener('keydown', event => {
    const target = releaseTabIndex(releaseIndex, RECENT_RELEASES.length, event.key);
    if (target === null) return;
    event.preventDefault();
    selectRelease(target);
  });
  releaseDialog.addEventListener('cancel', event => { event.preventDefault(); closeReleaseNotes(); });
  releaseDialog.addEventListener('keydown', event => event.stopPropagation());
  releaseDialog.addEventListener('close', () => {
    releaseOpen.classList.remove('has-update');
    (releaseOpener ?? releaseOpen).focus({ preventScroll: true });
    afterClose();
  });
  // A missing bundled image still leaves the entire description readable.
  $('#release-hero').addEventListener('error', ({ target }) => { target.hidden = true; });
  // A higher-priority modal may have been open during the first ready-state check.
  document.addEventListener('close', () => queueMicrotask(maybeShowReleaseNotes), true);
  releaseOpen.hidden = !CURRENT_RELEASE;

  return { renderReleaseNotes, maybeShowReleaseNotes };
}
