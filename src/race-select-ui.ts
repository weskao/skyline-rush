import { t, trackName, getLocale } from './i18n.ts';
import { RACE_TRACKS } from './game.js';
import { RULE_PRESETS } from './race-config.ts';
import { itemRuleValue } from './item-ui.ts';
import { createCup, type CupState } from './championship-cup.ts';
import { loadRecentCustom } from './recent-custom.ts';
import { refreshCustomSelects } from './custom-select.ts';
import { createRouteMap } from './route-map.ts';
import { timeString } from './time-format.ts';
import { setupEventLabUI } from './event-lab-ui.ts';
import type { GhostRun } from './ghost.ts';
import { racePresentationFor, updateRaceSetup } from './race-presentation-ui.ts';
import type { VisualPreset } from './race-session.ts';

// The simulation race comes from plain-JS game.js; this screen reads its selection fields only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Race = any;
type RouteMap = ReturnType<typeof createRouteMap> & { trackId?: string };
interface RaceSelectOptions {
  ui: Record<string, HTMLElement>;
  getRace(): Race;
  setRace(race: Race): void;
  /** The Daily Challenge being raced, or null for a normal selection. */
  getDaily(): unknown;
  clearDaily(): void;
  createRace(trackId?: string, config?: unknown, presentation?: { visualPreset: VisualPreset }): Race;
  unlockedTracks: Set<string>;
  ghostFor(race: Race): GhostRun | null;
  ghostEnabled(): boolean;
  showHomeStatus(): void;
  refreshPhase(): void;
  clearControls(): void;
  cueUi(): void;
  reducedMotion: MediaQueryList;
}
type RuleKey = 'rivals' | 'traffic' | 'difficulty' | 'items' | 'activeItems' | 'itemRules' | 'collision' | 'hazards' | 'stages' | 'bonusGates';
const LAST_TRACK_KEY = 'skyline-rush-last-track';

/** Home-screen race selection: mode, custom rules, track picker, route maps and the remembered track. */
export function setupRaceSelectUI(options: RaceSelectOptions) {
  const { ui, getRace, setRace, unlockedTracks } = options;
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const trackButtons = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('[data-track]')];
  const ruleInputs = (): HTMLInputElement[] => [...document.querySelectorAll<HTMLInputElement>('[data-race-rule]')];
  let selectedMode = 'classic';
  const raceRules: Record<RuleKey, unknown> = { rivals: 3, traffic: 'normal', difficulty: 'normal', items: true, activeItems: false, itemRules: undefined, collision: 'normal', hazards: 'off', stages: 1, bonusGates: false };
  const cupCount = (): number => Number($<HTMLSelectElement>('#cup-length').value);
  const eventLab = setupEventLabUI({ ...options, select: next => {
    selectedMode = 'eventlab'; options.clearDaily(); setRace(next); showTracks(); options.refreshPhase();
  } });
  const selectedRace = (trackId: string): Race => selectedMode === 'eventlab' ? eventLab.selectedRace(trackId) : selectedMode === 'classic' ? options.createRace(trackId) : options.createRace(selectedMode === 'endless' ? 'coast' : trackId, { mode: selectedMode, ...raceRules,
    ...(selectedMode === 'cup' && unlockedTracks.size >= cupCount() && unlockedTracks.has(trackId)
      ? { cupTracks: createCup([...unlockedTracks], trackId, cupCount()).tracks } : {}),
    ...(selectedMode === 'gauntlet' ? { hazardTier: $<HTMLSelectElement>('#hazard-tier').value } : {}),
    ...(selectedMode === 'time' && $<HTMLInputElement>('#clean-trial').checked ? { clean: true } : {}),
    ...(selectedMode === 'stunt' ? { duration: Number($<HTMLSelectElement>('#stunt-duration').value) } : {}) }, racePresentationFor(selectedMode, trackId));

  let raceRouteMap: RouteMap | undefined;
  const trackRouteMaps = new Map<string, RouteMap>();
  function ensureRouteMaps(): void {
    const race = getRace();
    for (const button of trackButtons()) {
      if (trackRouteMaps.has(button.dataset.track!)) continue;
      const map = createRouteMap(button.dataset.track!);
      button.querySelector('.track-route-map')!.append(map.element);
      button.querySelector<HTMLElement>('.track-route-map')!.dataset.theme = button.dataset.track;
      trackRouteMaps.set(button.dataset.track!, map);
    }
    if (!raceRouteMap || raceRouteMap.trackId !== race.trackId) {
      raceRouteMap?.destroy();
      raceRouteMap = createRouteMap(race.trackId, { live: true });
      raceRouteMap.trackId = race.trackId;
      $('#race-route-map').replaceChildren(raceRouteMap.element);
      $('#race-route-map').dataset.theme = race.trackId;
    }
  }
  function refreshTrackLabels(): void {
    for (const button of trackButtons()) button.querySelector('strong')!.textContent = trackName(button.dataset.track!, getLocale());
    for (const option of $<HTMLSelectElement>('#history-track').options) option.textContent = trackName(option.value, getLocale());
    $<HTMLSelectElement>('#locale-select').value = getLocale();
  }

  function renderModeRules(): void {
    for (const button of document.querySelectorAll<HTMLElement>('button[data-race-mode]'))
      button.setAttribute('aria-pressed', String(button.dataset.raceMode === selectedMode));
    $('#race-mode-rules').hidden = !['custom', 'free'].includes(selectedMode);
    $('#sprint-stages-setting').hidden = selectedMode !== 'custom';
    $('#gauntlet-rules').hidden = selectedMode !== 'gauntlet';
    $('#time-trial-rules').hidden = selectedMode !== 'time';
    $('#cup-rules').hidden = selectedMode !== 'cup';
    $('#stunt-rules').hidden = selectedMode !== 'stunt';
    $('#bonus-gates-rule').hidden = !['stunt', 'checkpoint'].includes(selectedMode);
    const recent = selectedMode === 'custom' ? loadRecentCustom().filter(entry => unlockedTracks.has(entry.trackId)) : [];
    $('#recent-custom').hidden = recent.length === 0;
    $('#recent-custom-runs').replaceChildren(...recent.map((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.recent = String(index);
      button.textContent = t('mode.recentSetup', { track: trackName(entry.trackId, getLocale()),
        rivals: entry.config.rivals, traffic: t('mode.' + entry.config.traffic) });
      return button;
    }));
    $('#race-mode-rules > summary').textContent = t(selectedMode === 'free' ? 'mode.freeOptions' : 'mode.rules');
    for (const button of document.querySelectorAll<HTMLElement>('[data-race-preset]'))
      button.setAttribute('aria-pressed', String(!getRace().config.activeItems && Object.entries(RULE_PRESETS[button.dataset.racePreset as keyof typeof RULE_PRESETS]).every(([key, value]) => getRace().config[key] === value)));
    $('#mode-description').textContent = t('mode.description.' + selectedMode);
  }
  function renderTrackButtons(race: Race): void {
    // Solo sessions show elapsed time rather than a false "01 / 04" ranking.
    const solo = race.rivals.length === 0;
    $('.route-drivers').textContent = selectedMode === 'classic' ? t('intro.drivers') : t('mode.driverCount', { n: race.rivals.length + 1 });
    $('.position-stat .stat-label').textContent = t(solo ? 'mode.' + race.mode : 'race.position');
    $('.position-stat > div > span').textContent = solo ? '' : '/ ' + String(race.rivals.length + 1).padStart(2, '0');
    if (race.phase === 'ready') ui.position!.textContent = solo ? '—' : String(race.rivals.length + 1).padStart(2, '0');
    ui.leaderboard!.hidden = solo;
    ensureRouteMaps(); refreshTrackLabels();
    for (const button of trackButtons()) {
      const id = button.dataset.track!;
      const locked = !unlockedTracks.has(id);
      button.disabled = selectedMode === 'endless' && id !== 'coast';
      button.classList.toggle('is-locked', locked);
      button.setAttribute('aria-pressed', String(id === race.trackId));
      button.querySelector('small')!.textContent = t(locked ? 'track.locked' : id === race.trackId ? 'track.selected' : 'track.open');
      const previous = Object.keys(RACE_TRACKS)[Object.keys(RACE_TRACKS).indexOf(id) - 1]!;
      button.title = button.disabled ? t('mode.description.endless') : locked ? t('track.unlockHint', { track: trackName(previous, getLocale()) }) : t(`track.note.${id}`);
    }
  }
  function renderRouteInfo(race: Race): void {
    const daily = options.getDaily();
    const startButton = ui['start-button'] as HTMLButtonElement;
    startButton.disabled = !daily && (!unlockedTracks.has(race.trackId) || (selectedMode === 'cup' && unlockedTracks.size < cupCount()));
    startButton.setAttribute('aria-describedby', 'track-note');
    $('.start-hint').hidden = startButton.disabled;
    $('#track-length').textContent = race.endless ? t('mode.endlessRoute') : t('track.sprint', { km: (RACE_TRACKS as Record<string, { length: number }>)[race.trackId]!.length / 1000 });
    const tracks = Object.keys(RACE_TRACKS);
    const next = tracks[tracks.indexOf(race.trackId) + 1];
    const previous = tracks[tracks.indexOf(race.trackId) - 1]!;
    $('#track-note').textContent = (selectedMode === 'cup' && unlockedTracks.size < cupCount() ? t('mode.cupLocked', { n: cupCount() }) + ' · ' : '') + (!daily && !unlockedTracks.has(race.trackId) ? t('track.unlockHint', { track: trackName(previous, getLocale()) }) + ' · ' : '') + t(`track.note.${race.trackId}`) + (next && !unlockedTracks.has(next) && race.mode === 'classic' && !race.modifier ? t('track.unlockNext', { track: trackName(race.trackId, getLocale()), next: trackName(next, getLocale()) }) : '');
    const name = trackName(race.trackId, getLocale());
    const route = (race.modifier ? t('route.daily', { track: name, modifier: t(`modifier.${race.modifier}`) }) : race.mode !== 'classic' ? `${t('mode.' + race.mode)} · ${name}` : name).toUpperCase();
    $('.route-heading').textContent = route;
    $('.overlay-route').textContent = `SKYLINE RUSH / ${route}`;
    $('#world').setAttribute('aria-label', t('world.aria', { track: name }));
  }
  function showGhost(race: Race): void {
    const ghost = options.ghostFor(race);
    const track = trackName(race.trackId, getLocale());
    $<HTMLInputElement>('#ghost-enabled').checked = options.ghostEnabled();
    $('#ghost-status').textContent = race.modifier ? t('ghost.daily') : ['free', 'endless'].includes(race.mode) ? t('mode.ghostUnavailable') : ghost ? t('ghost.ready', { track, time: timeString(ghost.time) }) : t('ghost.none', { track });
  }
  function showTracks(): void {
    options.showHomeStatus();
    const race = getRace();
    updateRaceSetup(race);
    document.body.dataset.raceMode = race.mode;
    renderModeRules();
    renderTrackButtons(race);
    renderRouteInfo(race);
    showGhost(race);
  }
  // The browser clamps scrollLeft, so the first and last tracks rest at the row's edges instead of the middle.
  function centerSelectedTrack(smooth = false): void {
    const button = document.querySelector<HTMLElement>(`[data-track="${getRace().trackId}"]`)!, row = button.parentElement!;
    row.scrollBy({ left: button.getBoundingClientRect().left + button.offsetWidth / 2 - row.getBoundingClientRect().left - row.clientWidth / 2, behavior: smooth && !options.reducedMotion.matches ? 'smooth' : 'instant' });
  }
  function changeRaceSelection(): void {
    if (getRace().phase !== 'ready') return;
    options.clearDaily();
    setRace(selectedRace(getRace().trackId));
    showTracks();
    options.refreshPhase();
    options.cueUi();
  }
  function showRuleInputs(): void {
    for (const input of ruleInputs()) {
      const value = raceRules[input.dataset.raceRule as RuleKey];
      if (input.type === 'checkbox') input.checked = value as boolean;
      else input.value = String(input.dataset.raceRule === 'itemRules' ? itemRuleValue(raceRules) : value);
    }
    refreshCustomSelects();
  }

  for (const button of trackButtons()) button.addEventListener('click', () => {
    if (getRace().phase !== 'ready') return;
    options.clearControls();
    setRace(selectedRace(button.dataset.track!)); options.clearDaily();
    showTracks();
    button.focus({ preventScroll: true }); // Safari does not focus buttons on click
    centerSelectedTrack(true);
    options.cueUi();
  });
  $('.track-select').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const buttons = [...document.querySelectorAll<HTMLElement>('[data-track]:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length]!.focus();
  });
  for (const button of document.querySelectorAll<HTMLElement>('button[data-race-mode]')) button.addEventListener('click', () => {
    if (button.dataset.raceMode === 'eventlab') { eventLab.open(); return; }
    selectedMode = button.dataset.raceMode!;
    changeRaceSelection();
  });
  for (const button of document.querySelectorAll<HTMLElement>('[data-race-preset]')) button.addEventListener('click', () => {
    Object.assign(raceRules, RULE_PRESETS[button.dataset.racePreset as keyof typeof RULE_PRESETS], { collision: 'normal', hazards: 'off', stages: 1, activeItems: false, itemRules: button.dataset.racePreset === 'noitems' ? 'off' : undefined });
    showRuleInputs();
    changeRaceSelection();
  });
  for (const id of ['hazard-tier', 'clean-trial', 'cup-length', 'stunt-duration', 'race-visual-preset']) $(`#${id}`).addEventListener('change', changeRaceSelection);
  $('#recent-custom-runs').addEventListener('click', ({ target }) => {
    const index = Number((target as Element).closest<HTMLElement>('button[data-recent]')?.dataset.recent);
    const entry = loadRecentCustom().filter(item => unlockedTracks.has(item.trackId))[index];
    if (!entry || getRace().phase !== 'ready') return;
    for (const key of Object.keys(raceRules) as RuleKey[]) if (Object.hasOwn(entry.config, key)) raceRules[key] = (entry.config as Record<string, unknown>)[key];
    raceRules.hazards = (entry.config as Record<string, unknown>).hazards ?? 'off';
    raceRules.itemRules = entry.config.itemRules; raceRules.activeItems = entry.config.activeItems ?? false;
    showRuleInputs();
    setRace(selectedRace(entry.trackId));
    options.clearDaily(); showTracks(); options.refreshPhase(); options.cueUi();
  });
  for (const input of ruleInputs()) input.addEventListener('change', () => {
    raceRules[input.dataset.raceRule as RuleKey] = input.type === 'checkbox' ? input.checked : ['rivals', 'stages'].includes(input.dataset.raceRule!) ? Number(input.value) : input.value;
    changeRaceSelection();
  });
  // Back to home reloads the page; the tab remembers the last raced track so the intro reopens on it.
  try { const last = sessionStorage.getItem(LAST_TRACK_KEY); if (last && unlockedTracks.has(last)) setRace(selectedRace(last)); } catch { /* Coast stays the default without storage. */ }

  return {
    recreate: eventLab.recreate,
    selectedRace,
    selectedMode: (): string => selectedMode,
    /** The Daily Challenge always races the Classic rules. */
    selectClassic(): void { selectedMode = 'classic'; },
    restoreCup(cup: CupState): void {
      selectedMode = 'cup';
      $<HTMLSelectElement>('#cup-length').value = String(cup.tracks.length);
      setRace(options.createRace(cup.tracks[cup.results.length], { mode: 'cup', cupTracks: cup.tracks }));
      showTracks();
    },
    cupCount,
    showTracks,
    centerSelectedTrack,
    ensureRouteMaps,
    /** Live route map for the HUD tick (rebuilt when the track changes). */
    raceRouteMap: (): RouteMap => { if (raceRouteMap?.trackId !== getRace().trackId) ensureRouteMaps(); return raceRouteMap!; },
    relabelRouteMaps(locale: string): void { for (const map of [...trackRouteMaps.values(), raceRouteMap]) map?.relabel(locale); },
    rememberTrack(trackId: string): void {
      try { sessionStorage.setItem(LAST_TRACK_KEY, trackId); } catch { /* The intro falls back to Coast after a reload. */ }
    },
  };
}
