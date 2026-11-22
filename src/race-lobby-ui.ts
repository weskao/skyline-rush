import { dialogNavigation, dialogTabIndex } from './dialog-navigation.ts';
import { t } from './i18n.ts';

const trackId = (card: HTMLButtonElement): string => card.dataset.track ?? card.dataset.upcomingTrack ?? '';
const chooser = (): HTMLDialogElement => document.querySelector<HTMLDialogElement>('#track-chooser')!;
const trackOpener = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('#lobby-tracks-toggle')!;

function copyRouteMap(slot: HTMLElement, card: Element | undefined | null, track: string): void {
  const map = card?.querySelector('.track-route-map')?.firstElementChild;
  slot.replaceChildren(...(map ? [map.cloneNode(true)] : []));
  slot.dataset.theme = track;
}

export function setupLobbyPickers(applyTrack: (id: string) => void, getTrack: () => string): void {
  const mode = document.querySelector<HTMLButtonElement>('#lobby-modes-toggle')!;
  const opener = trackOpener();
  const dialog = chooser();
  const cards = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-track], [data-upcoming-track]'));
  const confirm = dialog.querySelector<HTMLButtonElement>('#track-choose-confirm')!;
  const map = dialog.querySelector<HTMLElement>('#track-choose-map')!;
  const selection = dialog.querySelector<HTMLElement>('#track-choose-selection')!;
  const state = dialog.querySelector<HTMLElement>('#track-choose-state')!;
  const actionLabel = confirm.querySelector<HTMLElement>('span')!;
  const navigation = dialogNavigation(dialog);
  let pending: HTMLButtonElement | undefined;

  function stage(card: HTMLButtonElement | undefined): void {
    pending = card;
    const activeTrack = getTrack();
    for (const option of cards) {
      option.setAttribute('aria-pressed', String(option === card));
      if (trackId(option) === activeTrack) option.setAttribute('aria-current', 'true');
      else option.removeAttribute('aria-current');
    }
    selection.textContent = card?.querySelector('strong')?.textContent ?? '';
    state.textContent = card?.querySelector('small')?.textContent ?? '';
    const trackState = card?.dataset.trackState ?? '';
    state.dataset.trackState = trackState;
    const previewOnly = trackState === 'locked' || trackState === 'preview';
    confirm.dataset.previewOnly = String(previewOnly);
    const actionKey = previewOnly ? 'track.previewConfirm' : 'track.confirm';
    actionLabel.dataset.i18n = actionKey;
    actionLabel.textContent = t(actionKey);
    copyRouteMap(map, card, card ? trackId(card) : '');
    confirm.disabled = !card;
  }
  mode.addEventListener('click', () => mode.setAttribute('aria-expanded', String(mode.getAttribute('aria-expanded') !== 'true')));
  document.getElementById('intro')!.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || mode.getAttribute('aria-expanded') !== 'true' || dialog.open) return;
    event.stopPropagation();
    mode.setAttribute('aria-expanded', 'false');
    mode.focus({ preventScroll: true });
  });
  opener.addEventListener('click', () => {
    const enabled = cards.filter(card => !card.disabled);
    mode.setAttribute('aria-expanded', 'false');
    stage(enabled.find(card => trackId(card) === getTrack()) ?? enabled[0]);
    navigation.open();
    opener.setAttribute('aria-expanded', 'true');
    pending?.focus();
  });
  dialog.addEventListener('close', () => {
    stage(cards.find(card => trackId(card) === getTrack()));
    opener.setAttribute('aria-expanded', 'false');
    opener.focus({ preventScroll: true });
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); navigation.close(true); });
  dialog.querySelector('#track-choose-close')!.addEventListener('click', () => navigation.close(true));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const { left, top, right, bottom } = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) navigation.close(true);
  });
  for (const card of cards) card.addEventListener('click', () => stage(card));
  dialog.addEventListener('keydown', event => {
    const enabled = cards.filter(card => !card.disabled);
    const index = enabled.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const next = dialogTabIndex(index, enabled.length, event.key);
    if (next === null) return;
    event.preventDefault();
    enabled[next]?.focus();
  });
  confirm.addEventListener('click', () => {
    if (!pending) return;
    applyTrack(trackId(pending));
    navigation.close(true);
  });
}

const trackCard = (id: string): Element | null => chooser().querySelector(`[data-track="${id}"], [data-upcoming-track="${id}"]`);

export function renderLobbyTrackArt(id: string): void {
  const card = trackCard(id);
  const image = document.querySelector<HTMLImageElement>('#lobby-hero-art')!;
  const thumbnail = card?.querySelector<HTMLImageElement>('.track-preview img')?.getAttribute('src');
  if (thumbnail) image.src = thumbnail;
  else image.removeAttribute('src');
  const slot = document.querySelector<HTMLElement>('#lobby-hero-map')!;
  copyRouteMap(slot, card, id);
}

export function focusLobbyTrack(): void {
  (trackOpener().disabled ? document.getElementById('lobby-modes-toggle')! : trackOpener()).focus({ preventScroll: true });
}

/** A copied map never receives its source's relabel(); copy it again once the cards are relabelled. */
export function refreshCopiedRouteMaps(): void {
  for (const slot of document.querySelectorAll<HTMLElement>('#lobby-hero-map, #track-choose-map')) {
    const id = slot.dataset.theme;
    if (id) copyRouteMap(slot, trackCard(id), id);
  }
}
