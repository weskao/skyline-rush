import './style.css';
import { createApp } from 'vue';
import App from './App.vue';
import { icon } from './icons.js';
import { createRace as createBareRace, startRace, stepRace, useHeldItem, racePosition, sprintGaps, dailyChallenge, gapChargeWarning, RACE_TRACKS, MAX_SPEED } from './game.js';
import { createControls } from './input.js';
import { RULE_PRESETS } from './race-config.js';
import { createSprintSeries, addSprintStage, sprintTotal } from './sprint-series.js';
import { checkpointDirection } from './checkpoint-rush.js';
import { loadRecentCustom, saveRecentCustom } from './recent-custom.js';
import { stuntMedal } from './stunt-attack.js';
import { createCup, addCupResult, cupStandings, cupComplete, cupTotalTime } from './championship-cup.js';
import { createWorld } from './world.js';
import { roadObstacles } from './world-tour-scene.js';
import { photoFilename } from './photo-export.js';
import { createSound } from './audio.js';
import { AUDIO_COOKIES, AUDIO_VERSION, readAudio, setVolume } from './audio-settings.js';
import { vfxSettings, VFX_PRESETS } from './vfx-settings.js';
import { initialDeviceVisuals,noticeMessage,DEVICE_NOTICE_KEY,QUALITY_STORAGE_KEY } from './device-quality.js';
import { controlSettings, CONTROLS_KEY } from './control-settings.js';
import { createInteractiveTutorial, TUTORIAL_STEPS } from './interactive-tutorial.js';
import { loadKeyMap, rebind, resetKeyMap, saveKeyMap } from './key-map.js';
import { recordRace, recordBest, recordModeRace, loadModeHistory, loadModeGhost, saveModeGhost, loadHistory, loadBests, careerStats, recordMedals, loadMedals, recordStars, loadStars, starTotal,
  loadPaint, savePaint, loadGhost, saveGhost, recordDaily, loadDaily, dailyBoard, MEDALS, LEGACY_BEST_KEY } from './history.js';
import { recordGhost, validGhost, ghostAt } from './ghost.js';
import { createCallouts } from './callouts.js';
import { createPresentation } from './presentation.js';
import { PAINTS } from './appearance.js';
import { frameStats, PERF_WINDOW } from './perf.js';
import { createRouteMap } from './route-map.js';
import { trackName, saveLocale, resolveInitialLocale, getLocale, setLocale, onLocaleChange, applyI18n, applyDocumentLocale, t, interpolate, formatDate, CATALOGS } from './i18n.js';
import { availableTracks, availablePaints } from '@progression-access';
import { customSelect, refreshCustomSelects } from './custom-select.js';
import { trackDropdown } from './dropdown.js';
import { refreshIfStale } from './update-check.js';

const TOUCH_SCALE = { S: 0.85, M: 1, L: 1.15 };

// mount() renders synchronously, so the DOM queries below find the App.vue markup.
createApp(App).mount('#app');
// Saved choice > system language > English; only a click on the switch persists (saveLocale below).
setLocale(resolveInitialLocale());
applyI18n(); applyDocumentLocale(); // before customSelect, so the drawn selects copy translated text
for (const select of document.querySelectorAll('select')) customSelect(select);

const $ =selector => document.querySelector(selector);
// HUD text is read every tick: a plain catalog lookup (key parity is unit-tested), swapped on a language switch.
let L = CATALOGS[getLocale()];
// Event messages (tilt, key map, errors) remember how to re-render, so a language switch translates the live text.
const said = new Map();
function say(element, text) { said.set(element, text); element.textContent = text(); }
const ui = Object.fromEntries(['intro', 'race-info', 'race-status', 'speed', 'position', 'timer', 'distance', 'progress-fill', 'fuel-value', 'fuel-fill', 'fuel-caption', 'fuel-meter', 'altitude', 'flight-mode', 'mode-icon', 'flight-state', 'flight-budget', 'flight-instruction', 'climb-rate', 'height-indicator', 'impact-report', 'impact-title', 'impact-loss', 'countdown', 'driving-message', 'race-overlay', 'overlay-title', 'overlay-copy', 'result-stats', 'resume-button', 'again-button', 'start-button', 'pause-button', 'restart-button', 'settings-button', 'settings-panel', 'camera-button', 'controls-button', 'controls-panel', 'touch-controls', 'leaderboard', 'speed-caption'].map(id => [id, $(`#${id}`)]));
ui['assist-button'] = $('#assist-button');
ui['skill-report'] = $('#skill-report');
const countdownNumber = $('#countdown-number');
const countdownLabel = $('#countdown-label');
const speedTicks = [...document.querySelectorAll('.speed-ticks i')];
ui.leaderboard.innerHTML = Array.from({ length: 4 }, () => '<div class="racer"><span></span><i></i><strong></strong><span></span></div>').join('');
const leaderboardRows = [...ui.leaderboard.children];
const touchButtons = [...document.querySelectorAll('[data-control]')];
// Touch driving prevents default pointer behavior, so :active alone cannot show a press.
const pressedButtons = new Map();
document.addEventListener('pointerdown', event => {
  const button = event.target.closest('button:not(:disabled)');
  if (button) { pressedButtons.set(event.pointerId, button); button.classList.add('is-pressed'); }
}, { capture: true });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) document.addEventListener(type, event => {
  pressedButtons.get(event.pointerId)?.classList.remove('is-pressed');
  pressedButtons.delete(event.pointerId);
}, { capture: true });
function clearButtonPresses() {
  for (const button of pressedButtons.values()) button.classList.remove('is-pressed');
  pressedButtons.clear();
}
const touchPreference = matchMedia('(pointer: coarse)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// World Tour scenery that reaches into the road is solid in the simulation too.
const createRace = (...args) => { const created = createBareRace(...args); created.props = roadObstacles(created.trackId); return created; };
let race = createRace();
let tutorial = null, tutorialReturn = null, tutorialView = '', raceAfterTutorial = false;
const racerRows = new Map(['YOU', ...race.rivals.map(rival => rival.name)].map((name, i) => [name, leaderboardRows[i]]));
let leaderboardOrder = '';
const speedNeedle = $('#speed-needle');
const positionChange = $('#position-change');
let previousPosition = null, positionUntil = 0;
let world;
let contextLost = false; // iOS drops WebGL on lock/app switch and may never restore it
let previousPhase;
let previousFlight;
let goUntil = 0;
let { audio, volume } = readAudio();
const audioSwitches = [...document.querySelectorAll('[data-audio]')];
// Touch players start with AUTO on (checked once at load, never persisted); desktop starts off.
let autoThrottle = touchPreference.matches;
let animationId;
let pausedPhase = 'racing';
const sessionBests = {};
let sessionHistory = loadHistory();
const unlockedTracks = new Set(availableTracks());
// Session copies keep progression honest when storage is blocked.
let sessionMedals = loadMedals();
const sessionStars = loadStars();
let equippedPaint = loadPaint(availablePaints(starTotal(sessionStars)));
const ghosts = {}; // per-track best-run ghost, loaded and validated on first use
const ghostFor = trackId => trackId in ghosts ? ghosts[trackId] : ghosts[trackId] = loadGhost(trackId);
const modeGhosts = new Map();
const modeGhostKey = race => race.trackId + ':' + JSON.stringify(race.config);
const modeGhostFor = race => {
  const key = modeGhostKey(race);
  if (!modeGhosts.has(key)) modeGhosts.set(key, loadModeGhost(race.trackId, race.config));
  return modeGhosts.get(key);
};
let trace = [], traceRace = null;
let sessionDaily = loadDaily();
let daily = null; // the challenge being raced; its modifier lives on race.modifier
let selectedMode = 'classic';
const raceRules = { rivals: 3, traffic: 'normal', difficulty: 'normal', items: true, activeItems: false, collision: 'normal', hazards: 'off', stages: 1 };
const cupCount = () => Number($('#cup-length').value);
let sprintSeries = null; // Aggregated Custom heats; never career progress or genuine circuit laps.
let cup = null; // Three unlocked point-to-point heats, with rival points carried between heats.
let stunt = null; // Timed score run composed of explicit point-to-point heats, never fake laps.
const selectedRace = trackId => selectedMode === 'classic' ? createRace(trackId) : createRace(trackId, { mode: selectedMode, ...raceRules,
  ...(selectedMode === 'cup' && unlockedTracks.size >= cupCount() && unlockedTracks.has(trackId)
    ? { cupTracks: createCup([...unlockedTracks], trackId, cupCount()).tracks } : {}),
  ...(selectedMode === 'gauntlet' ? { hazardTier: $('#hazard-tier').value } : {}),
  ...(selectedMode === 'time' && $('#clean-trial').checked ? {clean:true} : {}),
  ...(selectedMode === 'stunt' ? {duration:Number($('#stunt-duration').value)} : {}) });
let previousFuel = 100;
let previousNitro = 0;
const presentation = createPresentation();
let presentationState = presentation.update(race, 0);
let resultCounts = [];
let nitroRefillUntil = 0;
try { ({ audio, volume } = readAudio(document.cookie)); } catch { /* Audio defaults to on when cookies are unavailable. */ }
const sound = createSound();
// Initial quality selection is performed once; manual/previous settings win.
let storedVisuals=null;
try { const raw=localStorage.getItem(QUALITY_STORAGE_KEY); if(raw)storedVisuals=JSON.parse(raw); }
catch { /* Storage is optional; use device-aware in-memory defaults. */ }
const deviceSelection=initialDeviceVisuals({
  storedSettings:storedVisuals,
  device:{cores:navigator.hardwareConcurrency,memoryGiB:navigator.deviceMemory,
    width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio},
});
let visual=deviceSelection.settings;
// In-memory source of truth: input.js reads it on every pointermove, so storage is only touched on load/change.
let controlPrefs = controlSettings();
let editingLayout = false;
let rebinding = null;
let keyMap = loadKeyMap();
try { controlPrefs = controlSettings(JSON.parse(localStorage.getItem(CONTROLS_KEY))); } catch { /* Defaults work without storage. */ }
let inputPrefs = controlPrefs;
let tiltRequest = 0, tiltGranted = false, tiltSeen = false, tiltTimeout;
const getControlSettings = () => inputPrefs;
const controlInputs = [...document.querySelectorAll('[data-controls]')];
const vfxControls = [...document.querySelectorAll('[data-vfx]')];
const airflowHud = $('#airflow-hud');
const boostStatus = document.createElement('span');
boostStatus.id = 'boost-status';
boostStatus.className = 'boost-status';
document.querySelector('.fuel-stat').append(boostStatus);
let previousBoost = false;
const callouts = createCallouts();
const eventCallout = $('#event-callout');
const calloutReports = [$('#maneuver-report'), ui['skill-report'], $('#action-report')];
let shownCallout = null;
let feedbackCar, lastImpact, lastDriftPayout, lastTrickPayout, lastNitroTime = 0;
const motionTokens = getComputedStyle(document.documentElement);
const motionOptions = duration => ({ duration: parseFloat(motionTokens.getPropertyValue(`--dur-${duration}`)), easing: motionTokens.getPropertyValue('--ease-out').trim() });
const calmMotion = () => visual.comfortable || reducedMotion.matches;
function stopPresentationMotion() {
  if (calmMotion()) document.getAnimations().forEach(animation => animation.cancel());
}
function enter(element, from, duration = 'base') {
  element.getAnimations().forEach(animation => animation.cancel());
  if (!calmMotion()) element.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], motionOptions(duration));
}
function leaveIntro() {
  if (calmMotion()) return;
  ui.intro.inert = true;
  const animation = ui.intro.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-36px)' }], motionOptions('base'));
  animation.finished.catch(() => {}).then(() => { ui.intro.inert = false; ui.intro.hidden = race.phase !== 'ready'; });
}
const nitroHud = document.createElement('div');
nitroHud.className = 'nitro-hud';
nitroHud.innerHTML = `<span id="nitro-status">${t('hud.nitroCount', { n: 0 })}</span><div id="nitro-meter" class="nitro-meter" role="meter" aria-label="${t('hud.nitroAria')}" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0">${Array.from({ length: 3 }, () => '<span class="nitro-segment"><i></i></span>').join('')}</div>`;
document.querySelector('.fuel-stat').append(nitroHud);
const nitroSegments = [...nitroHud.querySelectorAll('.nitro-segment')];
const nitroStatus = $('#nitro-status');
const nitroMeter = $('#nitro-meter');

function showVFX() {
  world?.configureVFX(visual);
  for (const control of vfxControls) {
    const key = control.dataset.vfx;
    if (control.type === 'checkbox') control.checked = visual[key];
    else control.value = visual[key];
    if (control.type === 'range') control.previousElementSibling.value = visual[key];
  }
  $('#airflow-toggle').setAttribute('aria-pressed', String(visual.airflow));
  $('#airflow-toggle').disabled = !visual.enabled;
  document.body.classList.toggle('airflow-active', visual.airflow && visual.enabled);
  document.body.classList.toggle('vfx-comfort', visual.comfortable);
  stopPresentationMotion();
  airflowHud.setAttribute('aria-hidden', String(!visual.airflow || !visual.enabled));
  showAeroMode();
  try { localStorage.setItem('skyline-rush-vfx', JSON.stringify(visual)); } catch { /* Settings remain usable in memory. */ }
}
function showAeroMode() { $('#aero-mode').textContent = t(visual.aeroMode === 'downforce' ? 'hud.highDownforce' : 'hud.lowDrag'); }
function toggleAirflow() {
  if (!visual.enabled) return;
  visual.airflow = !visual.airflow;
  showVFX();
}
for (const control of vfxControls) control.addEventListener('input', () => {
  const key = control.dataset.vfx;
  const value = control.type === 'checkbox' ? control.checked : control.type === 'range' ? Number(control.value) : control.value;
  visual = vfxSettings({ ...visual, ...(key === 'preset' ? VFX_PRESETS[value] : {}), [key]: value });
  showVFX();
});
$('#airflow-toggle').addEventListener('click', toggleAirflow);
$('#vfx-reset').addEventListener('click', () => { visual = vfxSettings(); showVFX(); });
showVFX();
const timeString = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;

const performanceNotice=$('#performance-notice');
const performanceNoticeText=$('#performance-notice-text');
const performanceNoticeTitle=$('#performance-notice-title');
const performanceNoticeDismiss=$('#performance-notice-dismiss');
let showedPerformanceNotice=false;
function refreshPerformanceNotice(){
  if(!showedPerformanceNotice)return;
  const message=noticeMessage(getLocale(),deviceSelection.settings.quality);
  performanceNoticeTitle.textContent=message.title;
  performanceNoticeText.textContent=message.body;
  performanceNoticeDismiss.textContent=message.dismiss;
}
function showOneTimePerformanceNotice(){
  if(!deviceSelection.downgraded)return;
  try {
    if(localStorage.getItem(DEVICE_NOTICE_KEY)==='shown')return;
    localStorage.setItem(DEVICE_NOTICE_KEY,'shown');
  } catch { /* Still show once for this page when persistent storage is disabled. */ }
  showedPerformanceNotice=true;
  refreshPerformanceNotice();
  performanceNotice.hidden=false;
}
const hidePerformanceNotice=()=>{ performanceNotice.hidden=true; };
performanceNoticeDismiss.addEventListener('click',hidePerformanceNotice);
// The notice floats over the toolbar panels; opening one means the reader is already in the settings it points to.
$('#vfx-panel').addEventListener('toggle', ({ target: panel }) => {
  if (panel.open) hidePerformanceNotice();
  trackDropdown(panel, panel.open, () => { panel.open = false; });
});
showOneTimePerformanceNotice();
let raceRouteMap;
const trackRouteMaps = new Map();
function ensureRouteMaps() {
  for (const button of document.querySelectorAll('[data-track]')) {
    if (trackRouteMaps.has(button.dataset.track)) continue;
    const map = createRouteMap(button.dataset.track);
    button.querySelector('.track-route-map').append(map.element);
    button.querySelector('.track-route-map').dataset.theme=button.dataset.track;
    trackRouteMaps.set(button.dataset.track, map);
  }
  if (!raceRouteMap || raceRouteMap.trackId !== race.trackId) {
    raceRouteMap?.destroy();
    raceRouteMap = createRouteMap(race.trackId, { live: true });
    raceRouteMap.trackId = race.trackId;
    $('#race-route-map').replaceChildren(raceRouteMap.element);
    $('#race-route-map').dataset.theme=race.trackId;
  }
}
function refreshTrackLabels() {
  for (const button of document.querySelectorAll('[data-track]')) button.querySelector('strong').textContent = trackName(button.dataset.track, getLocale());
  for (const option of $('#history-track').options) option.textContent = trackName(option.value, getLocale());
  $('#locale-select').value = getLocale();
}
// One-off re-render on a language switch (never per frame); world.js repaints its road signs via its own onLocaleChange.
function applyLocale() {
  const locale = getLocale();
  L = CATALOGS[locale];
  applyI18n(); applyDocumentLocale();
  showTracks(); // refreshes the track buttons and History options before the drawn selects re-read them
  refreshCustomSelects();
  for (const map of [...trackRouteMaps.values(), raceRouteMap]) map?.relabel(locale);
  if ($('#history-screen').open) showHistory();
  for (const [element, text] of said) element.textContent = text();
  showAeroMode(); showAudio(); showAssist(); showGarage(); phaseText();
  refreshPerformanceNotice();
  if (tutorial) renderTutorial(true);
  nitroMeter.setAttribute('aria-label', t('hud.nitroAria'));
  if (positionChange.dataset.direction) positionChange.setAttribute('aria-label', t(positionChange.dataset.direction === 'gained' ? 'hud.gained' : 'hud.lost'));
  previousFlight = undefined; // the next HUD tick rewrites the change-gated labels
}
onLocaleChange(applyLocale);
$('#locale-select').addEventListener('change', ({ target }) => { saveLocale(target.value); setLocale(target.value); });
function showTracks() {
  showHomeStatus();
  const track = RACE_TRACKS[race.trackId];
  document.body.dataset.raceMode = race.mode;
  for (const button of document.querySelectorAll('button[data-race-mode]'))
    button.setAttribute('aria-pressed', String(button.dataset.raceMode === selectedMode));
  $('#race-mode-rules').hidden = !['custom', 'free'].includes(selectedMode);
  $('#sprint-stages-setting').hidden = selectedMode !== 'custom';
  $('#gauntlet-rules').hidden = selectedMode !== 'gauntlet';
  $('#time-trial-rules').hidden = selectedMode !== 'time';
  $('#cup-rules').hidden = selectedMode !== 'cup';
  $('#stunt-rules').hidden = selectedMode !== 'stunt';
  const recent = selectedMode === 'custom' ? loadRecentCustom().filter(entry => unlockedTracks.has(entry.trackId)) : [];
  $('#recent-custom').hidden = recent.length === 0;
  $('#recent-custom-runs').replaceChildren(...recent.map((entry,index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.recent = String(index);
    button.textContent = t('mode.recentSetup',{track:trackName(entry.trackId,getLocale()),
      rivals:entry.config.rivals, traffic:t('mode.'+entry.config.traffic)});
    return button;
  }));
  $('#race-mode-rules > summary').textContent = t(selectedMode === 'free' ? 'mode.freeOptions' : 'mode.rules');
  for (const button of document.querySelectorAll('[data-race-preset]'))
    button.setAttribute('aria-pressed', String(Object.entries(RULE_PRESETS[button.dataset.racePreset]).every(([key, value]) => raceRules[key] === value)));

  $('#mode-description').textContent = t('mode.description.' + selectedMode);
  $('.route-drivers').textContent = selectedMode === 'classic' ? t('intro.drivers') : t('mode.driverCount', { n: race.rivals.length + 1 });
  // Solo sessions show elapsed time rather than a false "01 / 04" ranking.
  const solo = race.rivals.length === 0;
  $('.position-stat .stat-label').textContent = t(solo ? 'mode.' + race.mode : 'race.position');
  $('.position-stat > div > span').textContent = solo ? '' : '/ ' + String(race.rivals.length + 1).padStart(2, '0');
  if (race.phase === 'ready') ui.position.textContent = solo ? '—' : String(race.rivals.length + 1).padStart(2, '0');
  ui.leaderboard.hidden = solo;
  ensureRouteMaps(); refreshTrackLabels();
  for (const button of document.querySelectorAll('[data-track]')) {
    const id = button.dataset.track;
    const locked = !unlockedTracks.has(id);
    button.classList.toggle('is-locked', locked);
    button.setAttribute('aria-pressed', String(id === race.trackId));
    button.querySelector('small').textContent = t(locked ? 'track.locked' : id === race.trackId ? 'track.selected' : 'track.open');
    const previous = Object.keys(RACE_TRACKS)[Object.keys(RACE_TRACKS).indexOf(id) - 1];
    button.title = locked ? t('track.unlockHint', { track: trackName(previous, getLocale()) }) : t(`track.note.${id}`);
  }
  ui['start-button'].disabled = !daily && (!unlockedTracks.has(race.trackId) || (selectedMode === 'cup' && unlockedTracks.size < cupCount()));
  ui['start-button'].setAttribute('aria-describedby', 'track-note');
  $('.start-hint').hidden = ui['start-button'].disabled;
  $('#track-length').textContent = t('track.sprint', { km: track.length / 1000 });
  const tracks = Object.keys(RACE_TRACKS);
  const next = tracks[tracks.indexOf(race.trackId) + 1];
  const previous = tracks[tracks.indexOf(race.trackId) - 1];
  $('#track-note').textContent = (selectedMode === 'cup' && unlockedTracks.size < cupCount() ? t('mode.cupLocked', {n:cupCount()}) + ' · ' : '') + (!daily && !unlockedTracks.has(race.trackId) ? t('track.unlockHint', { track: trackName(previous, getLocale()) }) + ' · ' : '') + t(`track.note.${race.trackId}`) + (next && !unlockedTracks.has(next) && race.mode === 'classic' && !race.modifier ? t('track.unlockNext', { track: trackName(race.trackId, getLocale()), next: trackName(next, getLocale()) }) : '');
  const name = trackName(race.trackId, getLocale());
  const route = (race.modifier ? t('route.daily', { track: name, modifier: t(`modifier.${race.modifier}`) }) : race.mode !== 'classic' ? `${t('mode.' + race.mode)} · ${name}` : name).toUpperCase();
  $('.route-heading').textContent = route;
  $('.overlay-route').textContent = `SKYLINE RUSH / ${route}`;
  $('#world').setAttribute('aria-label', t('world.aria', { track: name }));
  showGhost();
}
function showGhost() {
  const ghost = race.mode === 'classic' ? ghostFor(race.trackId) : race.mode === 'time' ? modeGhostFor(race) : null;
  const track = trackName(race.trackId, getLocale());
  $('#ghost-enabled').checked = controlPrefs.ghost;
  $('#ghost-status').textContent = race.modifier ? t('ghost.daily') : race.mode === 'custom' || race.mode === 'free' ? t('mode.ghostUnavailable') : ghost ? t('ghost.ready', { track, time: timeString(ghost.time) }) : t('ghost.none', { track });
}
$('#ghost-enabled').addEventListener('change', ({ target }) => { controlPrefs = controlSettings({ ...controlPrefs, ghost: target.checked }); applyControls(); });
for (const button of document.querySelectorAll('[data-track]')) button.addEventListener('click', () => {
  if (race.phase !== 'ready') return;
  controls.clear();
  race = selectedRace(button.dataset.track); daily = null;
  showTracks();
  button.focus({ preventScroll: true }); // Safari does not focus buttons on click
  centerSelectedTrack(true);
  sound.cue('ui');
});
$('.track-select').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault(); event.stopPropagation();
  const buttons = [...document.querySelectorAll('[data-track]:not(:disabled)')];
  const index = buttons.indexOf(document.activeElement);
  buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].focus();
});
function changeRaceSelection() {
  if (race.phase !== 'ready') return;
  daily = null;
  race = selectedRace(race.trackId);
  showTracks();
  phaseUI();
  sound.cue('ui');
}
for (const button of document.querySelectorAll('button[data-race-mode]')) button.addEventListener('click', () => {
  selectedMode = button.dataset.raceMode;
  changeRaceSelection();
});
for (const button of document.querySelectorAll('[data-race-preset]')) button.addEventListener('click', () => {
  Object.assign(raceRules, RULE_PRESETS[button.dataset.racePreset], { collision: 'normal', hazards: 'off', stages: 1, activeItems: false });
  for (const input of document.querySelectorAll('[data-race-rule]'))
    if (input.type === 'checkbox') input.checked = raceRules[input.dataset.raceRule];
    else input.value = String(raceRules[input.dataset.raceRule]);
  refreshCustomSelects();
  changeRaceSelection();
});
$('#hazard-tier').addEventListener('change', changeRaceSelection);
$('#clean-trial').addEventListener('change', changeRaceSelection);
$('#cup-length').addEventListener('change', changeRaceSelection);
$('#stunt-duration').addEventListener('change', changeRaceSelection);
$('#recent-custom-runs').addEventListener('click', ({target}) => {
  const index = Number(target.closest('button[data-recent]')?.dataset.recent);
  const entry = loadRecentCustom().filter(item => unlockedTracks.has(item.trackId))[index];
  if (!entry || race.phase !== 'ready') return;
  for (const key of Object.keys(raceRules)) if (Object.hasOwn(entry.config, key)) raceRules[key] = entry.config[key];
  raceRules.hazards = entry.config.hazards ?? 'off';
  for (const input of document.querySelectorAll('[data-race-rule]')) {
    const value = raceRules[input.dataset.raceRule];
    if (input.type === 'checkbox') input.checked = value;
    else input.value = String(value);
  }
  refreshCustomSelects();
  race = selectedRace(entry.trackId);
  daily = null; showTracks(); phaseUI(); sound.cue('ui');
});
for (const input of document.querySelectorAll('[data-race-rule]')) input.addEventListener('change', () => {
  raceRules[input.dataset.raceRule] = input.type === 'checkbox' ? input.checked : ['rivals', 'stages'].includes(input.dataset.raceRule) ? Number(input.value) : input.value;
  changeRaceSelection();
});
// Back to home reloads the page; the tab remembers the last raced track so the intro reopens on it.
const LAST_TRACK_KEY = 'skyline-rush-last-track';
try { const last = sessionStorage.getItem(LAST_TRACK_KEY); if (unlockedTracks.has(last)) race = selectedRace(last); } catch { /* Coast stays the default without storage. */ }
// The browser clamps scrollLeft, so the first and last tracks rest at the row's edges instead of the middle.
function centerSelectedTrack(smooth = false) {
  const button = document.querySelector(`[data-track="${race.trackId}"]`), row = button.parentElement;
  row.scrollBy({ left: button.getBoundingClientRect().left + button.offsetWidth / 2 - row.getBoundingClientRect().left - row.clientWidth / 2, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
}
showTracks(); centerSelectedTrack();
refreshCustomSelects(); // showTracks just localized the History options the drawn select copied at construction

const previewObserver = new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.dataset.visible = String(entry.isIntersecting);
}, { root: $('.track-select') });
document.querySelectorAll('.track-preview').forEach(preview => previewObserver.observe(preview));

// Saved dates are untrusted, and Intl throws on an invalid date.
function shortDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? formatDate(date, { month: 'short', day: 'numeric' }) : t('history.noDate');
}
const historyScreen = $('#history-screen');
let historyOpener;
function showHistory() {
  const trackId = $('#history-track').value;
  const runs = sessionHistory.filter(run => run.track === trackId && Number.isFinite(run.time) && run.time > 0).slice(-50);
  const modes = loadModeHistory().filter(run => run.track === trackId).slice(-10).reverse();
  $('#mode-history-empty').hidden = modes.length > 0;
  $('#mode-history-runs').replaceChildren(...modes.map(run => {
    const item = document.createElement('p');
    item.textContent = run.mode === 'stunt'
      ? [t('mode.stunt'), t('mode.stuntPoints') + ': ' + Math.round(run.score || 0),
        run.medal ? t('mode.medal.' + run.medal) : '',
        t('mode.comboSummary', { combo: run.maxCombo || 0, air: Number(run.airTime || 0).toFixed(1) }), shortDate(run.date)].filter(Boolean).join(' · ')
      : `${t('mode.' + run.mode)} · ${timeString(run.time)} · ${shortDate(run.date)}`;
    return item;
  }));
  const stats = careerStats(sessionHistory);
  const count = (key, n) => t(n === 1 ? `${key}.one` : key, { n }); // English singular; zh-TW keys read the same
  $('#career-summary').textContent = t('history.career', { races: count('history.races', stats.races), wins: count('history.wins', stats.wins), km: (stats.totalDistance / 1000).toFixed(1), combo: stats.longestCombo, rings: stats.mostRings });
  const best = Math.min(loadBests()[trackId] ?? Infinity, ...runs.map(run => run.time));
  const recent = runs.slice(-10);
  $('#history-empty').hidden = runs.length > 0;
  $('.history-trend').hidden = recent.length === 0;
  $('#history-trend-label').textContent = count('history.trend', recent.length);
  const low = Math.min(...recent.map(run => run.time));
  const high = Math.max(...recent.map(run => run.time));
  const points = recent.map((run, i) => [recent.length === 1 ? 250 : 10 + i / (recent.length - 1) * 480, high === low ? 40 : 70 - (run.time - low) / (high - low) * 60]);
  $('#history-chart').innerHTML = `<polyline points="${points.map(point => point.join(',')).join(' ')}"/>${points.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3"><title>${timeString(recent[i].time)}</title></circle>`).join('')}`;
  // Storage is untrusted: put saved fields into textContent, never HTML.
  $('#history-runs').replaceChildren(...runs.toReversed().map(run => {
    const row = document.createElement('details'); row.className = 'history-run';
    const summary = document.createElement('summary');
    for (const text of [shortDate(run.date), timeString(run.time), t('history.position', { n: Number.isInteger(run.position) && run.position >= 1 && run.position <= 4 ? run.position : '—' })]) {
      const field = document.createElement('span'); field.textContent = text; summary.append(field);
    }
    if (run.time === best) { const badge = document.createElement('b'); badge.className = 'history-best'; badge.textContent = t('history.best'); summary.append(badge); }
    const detail = document.createElement('p');
    const number = value => Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
    detail.textContent = t('history.detail', { score: number(run.score), contacts: number(run.collisions), near: number(run.nearMisses), rings: number(run.rings), perfect: number(run.perfectLines), nitro: number(run.nitroUses) });
    row.append(summary, detail); return row;
  }));
  const today = dailyChallenge();
  $('#daily-status').textContent = t('daily.status', { track: trackName(today.track, getLocale()), modifier: t(`modifier.${today.modifier}`) });
  $('#daily-start').disabled = !world;
  const board = dailyBoard(sessionDaily, today.id).slice(0, 5);
  const line = text => { const row = document.createElement('p'); row.textContent = text; return row; };
  $('#daily-board').replaceChildren(...board.length ? board.map((run, i) => line(t('daily.line', { rank: i + 1, time: timeString(run.time), position: run.position, score: Math.round(run.score) }))) : [line(t('daily.empty'))]);
  for (const item of document.querySelectorAll('[data-medal]')) {
    const awarded = sessionMedals[item.dataset.medal];
    item.classList.toggle('is-awarded', !!awarded);
    item.querySelector('small').textContent = awarded ? t('medal.awarded', { date: shortDate(awarded) }) : t('medal.notAwarded');
  }
  $('#achievement-status').textContent = t('medal.count', { n: Object.keys(sessionMedals).length });
}
// Home status: today's challenge and the medal tally sit on the start screen instead of inside History.
function showHomeStatus() {
  const today = dailyChallenge();
  const best = dailyBoard(sessionDaily, today.id)[0];
  $('#daily-card-route').textContent = `${trackName(today.track, getLocale())} · ${t(`modifier.${today.modifier}`)}`;
  $('#daily-card-best').textContent = best ? t('daily.best', { time: timeString(best.time), position: best.position }) : t('daily.fresh');
  $('#daily-card-start').disabled = !world;
  const medals = Object.keys(sessionMedals).length;
  $('#medal-count').textContent = `${medals}/${MEDALS.length}`;
  $('#medal-chip').setAttribute('aria-label', t('medal.count', { n: medals }));
  $('#medal-chip').classList.toggle('has-medals', medals > 0);
}
function startDaily() {
  daily = dailyChallenge();
  selectedMode = 'classic';
  historyScreen.close();
  controls.clear(); race = createRace(daily.track, daily.modifier); goUntil = 0; previousFuel = 100; previousNitro = 0;
  showTracks(); phaseUI(); previousPhase = race.phase;
  start();
}
for (const id of ['daily-start', 'daily-card-start']) $(`#${id}`).addEventListener('click', startDaily);
for (const button of document.querySelectorAll('[data-open-history]')) button.addEventListener('click', () => {
  controls.clear(); historyOpener = button; $('#history-track').value = race.trackId;
  showHistory(); historyScreen.showModal();
  if (button.dataset.openHistory === 'medals') $('#achievements-title').scrollIntoView({ block: 'start' });
});
$('#history-track').addEventListener('change', showHistory);
function closeHistory() {
  if (calmMotion()) { historyScreen.close(); return; }
  const animation = historyScreen.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(36px)' }], motionOptions('fast'));
  animation.finished.catch(() => {}).then(() => historyScreen.close());
}
$('#history-close').addEventListener('click', closeHistory);
historyScreen.addEventListener('cancel', event => { event.preventDefault(); closeHistory(); });
historyScreen.addEventListener('close', () => historyOpener?.focus({ preventScroll: true }));
const garageScreen = $('#garage-screen');
let previewing = equippedPaint;
function previewPaint(id) {
  previewing = id;
  world?.previewAppearance(PAINTS[id]);
  document.querySelectorAll('[data-paint]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.paint === id)));
  showGarage();
}
function showGarage(id = previewing) {
  const stars = starTotal(sessionStars);
  const owned = availablePaints(stars).includes(id);
  const name = t(`paint.${id}`); // display name from the catalog; PAINTS keys stay the identity
  const need = PAINTS[id].stars;
  $('#garage-status').textContent = t(id === equippedPaint ? 'garage.status.equipped' : owned ? 'garage.status.owned' : 'garage.status.locked', { name, stars: need, have: stars });
  $('#garage-equip').disabled = !owned || id === equippedPaint;
  $('#garage-equip').textContent = t(id === equippedPaint ? 'garage.btn.equipped' : owned ? 'garage.btn.equip' : 'garage.btn.locked', { name, stars: need });
}
$('#garage-equip').addEventListener('click', () => { equippedPaint = previewing; savePaint(equippedPaint); previewPaint(equippedPaint); });
showGarage();
$('#garage-button').addEventListener('click', () => {
  if (!world || race.phase !== 'ready') return;
  controls.clear(); garageScreen.showModal();
  $('#garage-preview').append($('#world'));
  world.resize(); previewPaint(equippedPaint);
});
document.querySelectorAll('[data-paint]').forEach(button => button.addEventListener('click', () => previewPaint(button.dataset.paint)));
$('#garage-close').addEventListener('click', () => garageScreen.close());
garageScreen.addEventListener('close', () => {
  $('#app').prepend($('#world')); world.resize(); previewPaint(equippedPaint);
  controls.clear(); $('#garage-button').focus({ preventScroll: true });
});
for (const dialog of [historyScreen, garageScreen]) dialog.addEventListener('keydown', event => event.stopPropagation());
function chooseTrack() {
  if (tutorial) { endTutorial(); return; }
  controls.clear(); sprintSeries = null; cup = null; stunt = null; race = selectedRace(unlockedTracks.has(race.trackId) ? race.trackId : 'coast'); daily = null; goUntil = 0;
  previousFuel = 100; previousNitro = 0;
  showTracks(); phaseUI(); previousPhase = race.phase;
  document.querySelector(`[data-track="${race.trackId}"]`).focus({ preventScroll: true });
  centerSelectedTrack();
}
$('#choose-track').addEventListener('click', chooseTrack);

// Brand click mid-race pauses and asks first; on the intro/results screens the link just goes home.
const leaveScreen = $('#leave-screen');
leaveScreen.addEventListener('keydown', event => event.stopPropagation());
document.querySelector('.brand').addEventListener('click', event => {
  if (!['racing', 'countdown', 'paused'].includes(race.phase) || document.querySelector('dialog[open]')) return;
  event.preventDefault();
  if (race.phase !== 'paused') pause();
  controls.clear(); leaveScreen.showModal();
});
$('#leave-keep').addEventListener('click', () => { leaveScreen.close(); if (race.phase === 'paused') pause(); });
$('#leave-end').addEventListener('click', () => { leaveScreen.close(); chooseTrack(); });

// A muted channel shows its slider at zero; its saved level comes back on unmute.
function showChannel(button, on, level) {
  const slider = button.nextElementSibling, percent = `${Math.round(level * 100)}%`;
  button.setAttribute('aria-checked', String(on));
  button.firstElementChild.outerHTML = icon(on ? 'sound' : 'mute');
  button.lastChild.textContent = on ? percent : t('audio.off');
  slider.value = on ? Math.round(level * 100) : 0;
  slider.setAttribute('aria-valuetext', on ? percent : t('audio.muted'));
  slider.style.setProperty('--fill', `${slider.value}%`);
}

function showAudio() {
  for (const button of audioSwitches) showChannel(button, audio[button.dataset.audio], volume[button.dataset.audio]);
  const on = audio.music || audio.sfx;
  ui['settings-button'].innerHTML = icon(on ? 'sound' : 'mute');
  $('#mute-all').firstChild.textContent = t(on ? 'audio.muteAll' : 'audio.unmuteAll');
}

showAudio();

// Driving keys are ignored while a form control has focus, so hand the keyboard back to the race.
function focusRace() {
  $('#vfx-panel').open = false;
  document.activeElement?.blur();
}

function start() {
  if (tutorial) return;
  if (selectedMode === 'cup' && unlockedTracks.size < cupCount()) return;
  if (!world || race.phase !== 'ready' || (!daily && !unlockedTracks.has(race.trackId)) || document.querySelector('dialog[open]')) return;
  if (contextLost) { location.reload(); return; } // a fresh page is the only way back to a live renderer
  // First Start presents the live practice; Skip / completion returns to this selected race.
  if (!guideSeen) { raceAfterTutorial = true; beginTutorial(); sound.cue('ui'); return; }
  if (editingLayout) editLayout(false);
  controls.clear();
  cup = race.mode === 'cup' && unlockedTracks.size >= cupCount() ? createCup([...unlockedTracks],race.trackId,cupCount()) : null;
  stunt = race.mode === 'stunt' ? { duration:race.config.duration, elapsed:0, score:0, heats:0, maxCombo:0, airTime:0, trackId:race.trackId } : null;
  sprintSeries = race.mode === 'custom' && race.config.stages ? createSprintSeries(race.config.stages) : null;
  if (race.mode === 'custom') saveRecentCustom(undefined, race.trackId, race.config);
  try { sessionStorage.setItem(LAST_TRACK_KEY, race.trackId); } catch { /* The intro falls back to Coast after a reload. */ }
  leaveIntro();
  startRace(race);
  sound.cue('ui');
  focusRace();
}

function restart(trackId = race.trackId) {
  if (tutorial) { beginTutorial(); return; }
  if (!world || (!daily && !unlockedTracks.has(trackId))) return;
  if (contextLost) { location.reload(); return; }
  if (editingLayout) editLayout(false);
  controls.clear();
  const wipe = $('#race-wipe');
  wipe.getAnimations().forEach(animation => animation.cancel());
  wipe.hidden = calmMotion();
  if (!wipe.hidden) {
    const animation = wipe.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)', offset: 0.45 }, { transform: 'translateX(100%)' }], motionOptions('slow'));
    animation.finished.catch(() => {}).then(() => { if (!wipe.getAnimations().length) wipe.hidden = true; });
  }
  race = createRace(trackId, race.modifier ?? (race.mode === 'classic' ? null : race.config));
  if (stunt && race.mode === 'stunt') race.stuntLimit = Math.max(.01, stunt.duration - stunt.elapsed);
  previousFuel = 100; previousNitro = 0;
  goUntil = 0;
  startRace(race);
  sound.update(race);
  focusRace();
}

function pause() {
  if (tutorial?.complete) return;
  if (editingLayout) editLayout(false);
  if (race.phase === 'paused') {
    race.phase = pausedPhase;
    controls.clear();
    focusRace();
  } else if (race.phase === 'racing' || race.phase === 'countdown') {
    pausedPhase = race.phase;
    race.phase = 'paused';
    controls.clear();
    sound.update(race);
  }
  goUntil = 0;
  sound.cue(race.phase === 'paused' ? 'pause' : 'ui');
}

function showAssist() {
  ui['assist-button'].setAttribute('aria-pressed', String(autoThrottle));
  ui['assist-button'].title = t(autoThrottle ? 'assist.titleOn' : 'assist.titleOff');
}

function toggleAssist() {
  if (tutorial) return;
  autoThrottle = !autoThrottle;
  showAssist();
  sound.cue('ui');
}

function setAudio(kind, on, level = volume[kind]) {
  volume[kind] = level;
  audio[kind] = kind === 'music' ? sound.setMusic(on, level) : sound.setEnabled(on, level);
  const name = AUDIO_COOKIES[kind];
  try {
    for (const pair of [`${name}=${audio[kind] ? 'on' : 'off'}`, `${name}-volume=${Math.round(level * 100)}`, AUDIO_VERSION]) document.cookie = `${pair}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch { /* Audio still works when cookies are unavailable. */ }
  showAudio();
}

function toggleSound() {
  const on = !(audio.music || audio.sfx);
  setAudio('music', on);
  setAudio('sfx', on);
  sound.cue('ui');
}

function toggleSettings(open = ui['settings-panel'].hidden) {
  ui['settings-panel'].hidden = !open;
  if (open) hidePerformanceNotice();
  ui['settings-button'].setAttribute('aria-expanded', String(open));
  trackDropdown($('.settings'), open, () => toggleSettings(false));
}

// Touch layout is tuned between races only, so the panel never opens mid-race.
function toggleControls(open = ui['controls-panel'].hidden) {
  open &&= race.phase === 'ready' || race.phase === 'paused';
  if (!open) rebinding = null;
  ui['controls-panel'].hidden = !open;
  if (open) hidePerformanceNotice();
  ui['controls-button'].setAttribute('aria-expanded', String(open));
  trackDropdown($('.controls-menu'), open, () => toggleControls(false));
}

function applyControls(persist = true) {
  inputPrefs = { ...controlPrefs, mode: tutorial && controlPrefs.mode === 'tilt' && !tiltGranted ? 'slide' : controlPrefs.mode, editing: editingLayout };
  const touch = ui['touch-controls'];
  touch.dataset.steerMode = inputPrefs.mode;
  touch.dataset.hand = controlPrefs.hand;
  touch.dataset.size = controlPrefs.size;
  touch.style.setProperty('--touch-scale', String(TOUCH_SCALE[controlPrefs.size]));
  touch.style.setProperty('--touch-opacity', String(controlPrefs.opacity));
  controls.setFlyMode(controlPrefs.flyMode);
  $('#tilt-enable').hidden = controlPrefs.mode !== 'tilt';
  if (controlPrefs.mode !== 'tilt') { controls.setTilt(false); tiltGranted = false; clearTimeout(tiltTimeout); }
  for (const button of touchButtons) {
    const point = tutorial ? undefined : controlPrefs.layout[button.dataset.control];
    button.classList.toggle('is-positioned', !!point);
    if (point) {
      const halfWidth = button.offsetWidth / 2 || 32;
      const halfHeight = button.offsetHeight / 2 || 35;
      const x = (controlPrefs.hand === 'right' ? 1 - point.x : point.x) * innerWidth;
      button.style.left = `clamp(calc(env(safe-area-inset-left, 0px) + ${halfWidth + 8}px), ${x}px, calc(100vw - env(safe-area-inset-right, 0px) - ${halfWidth + 8}px))`;
      button.style.top = `clamp(calc(env(safe-area-inset-top, 0px) + ${halfHeight + 8}px), ${point.y * innerHeight}px, calc(100dvh - env(safe-area-inset-bottom, 0px) - ${halfHeight + 8}px))`;
    } else { button.style.removeProperty('left'); button.style.removeProperty('top'); }
  }
  for (const input of controlInputs) {
    const value = controlPrefs[input.dataset.controls];
    if (input.type === 'radio') input.checked = input.value === String(value);
    else { input.value = String(value); input.previousElementSibling.value = `${Math.round(value * 100)}%`; }
  }
  if (persist) try { localStorage.setItem(CONTROLS_KEY, JSON.stringify(controlPrefs)); } catch { /* Settings remain usable in memory. */ }
}

// Browsers that block autoplay start audio only after a user gesture, so saved choices are applied on the first one.
function unlockAudio() {
  if (!sound.running() && (audio.music || audio.sfx)) {
    setAudio('music', audio.music);
    setAudio('sfx', audio.sfx);
  }
}

function changeCamera() {
  if (!world) return;
  sound.cue('ui');
  const mode = world.cycleCamera();
  ui['camera-button'].setAttribute('aria-pressed', String(mode === 1));
}

function triggerItem() {
  if (useHeldItem(race)) sound.cue('pickup');
}
const controls = createControls(window, action => {
  if (document.querySelector('dialog[open]')) { controls.clear(); return; }
  if (action === 'pause') toggleSettings(false);
  if (action === 'pause') $('#vfx-panel').open = false;
  if (action === 'pause') toggleControls(false);
  ({ start, restart, pause, item: triggerItem, sound: toggleSound, camera: changeCamera, assist: toggleAssist, airflow: toggleAirflow })[action]?.();
}, { getSettings: getControlSettings, getKeyMap: () => keyMap, onTilt: () => {
  if (tiltSeen) return;
  tiltSeen = true; clearTimeout(tiltTimeout);
  say($('#tilt-status'), () => t('tilt.ready'));
} });
const pad = $('.touch-pad');
controls.bindSlidePad(pad, { getSettings: getControlSettings });
$('#activate-item').addEventListener('click', triggerItem);
// input.js keeps the slide-pad state private, so the ring/knob mirror it from the same pointer events (same follow-the-thumb rule as slide-pad.js).
const PAD_BRAKE_PX = 40;
const PAD_HINT_SECONDS = 4;
const padRing = $('.pad-ring');
const padKnob = $('.pad-knob');
let padTouch = null;
let padHint = false;
const clampPad = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Ring/knob sit at the pad's top-left in CSS; transform alone moves them (percentages centre each on its point).
function placePad(el, x, y, opacity) {
  el.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`;
  el.style.opacity = opacity;
  el.style.transition = reducedMotion.matches ? 'none' : 'opacity 0.6s ease';
}
function drawPad() {
  const rect = pad.getBoundingClientRect();
  const brake = !!padTouch && padTouch.y - padTouch.oy >= PAD_BRAKE_PX;
  if (brake) ui['touch-controls'].dataset.padBrake = 'true'; else delete ui['touch-controls'].dataset.padBrake;
  if (padTouch) {
    const lock = controlPrefs.fullLock;
    placePad(padRing, padTouch.ox - rect.left, padTouch.oy - rect.top, '0.35');
    placePad(padKnob, clampPad(padTouch.x, padTouch.ox - lock, padTouch.ox + lock) - rect.left, clampPad(padTouch.y, padTouch.oy - lock, padTouch.oy + lock) - rect.top, '0.6');
  } else {
    placePad(padRing, rect.width / 2, rect.height / 2, padHint ? '0.25' : '0');
    placePad(padKnob, rect.width / 2, rect.height / 2, padHint ? '0.45' : '0');
  }
}
pad.addEventListener('pointerdown', event => {
  if (padTouch) return;
  padTouch = { id: event.pointerId, ox: event.clientX, oy: event.clientY, x: event.clientX, y: event.clientY };
  drawPad();
});
pad.addEventListener('pointermove', event => {
  if (event.pointerId !== padTouch?.id) return;
  padTouch.x = event.clientX; padTouch.y = event.clientY;
  const dx = padTouch.x - padTouch.ox;
  if (Math.abs(dx) > controlPrefs.fullLock) padTouch.ox = padTouch.x - Math.sign(dx) * controlPrefs.fullLock;
  drawPad();
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  pad.addEventListener(type, event => {
    if (event.pointerId !== padTouch?.id) return;
    padTouch = null;
    drawPad();
  });
}
applyControls();
if (controlPrefs.mode === 'tilt') say($('#tilt-status'), () => t('tilt.saved'));
showAssist();
ui['controls-button'].addEventListener('click', () => { toggleControls(); sound.cue('ui'); });
ui['controls-panel'].addEventListener('input', ({ target }) => {
  const key = target.dataset.controls;
  if (!key) return;
  tiltRequest++;
  controls.clear();
  if (key === 'mode' && target.value === 'tilt') { enableTilt(); return; }
  controlPrefs = controlSettings({ ...controlPrefs, [key]: ['fullLock', 'opacity', 'sensitivity'].includes(key) ? Number(target.value) : target.value });
  applyControls();
});
async function enableTilt() {
  const request = ++tiltRequest;
  const status = $('#tilt-status');
  try {
    if (!window.isSecureContext || !window.DeviceOrientationEvent) throw new Error('unavailable');
    const permission = DeviceOrientationEvent.requestPermission;
    const result = permission ? await permission.call(DeviceOrientationEvent) : 'granted';
    if (request !== tiltRequest || !['ready', 'paused'].includes(race.phase)) return;
    if (result !== 'granted') throw new Error('denied');
    controls.clear(); tiltGranted = true; tiltSeen = false;
    controlPrefs = { ...controlPrefs, mode: 'tilt' }; applyControls(); controls.setTilt(true);
    say(status, () => t('tilt.waiting'));
    clearTimeout(tiltTimeout);
    tiltTimeout = setTimeout(() => {
      if (!tiltSeen && tiltGranted) {
        controlPrefs = { ...controlPrefs, mode: 'slide' }; applyControls();
        say(status, () => t('tilt.none'));
      }
    }, 2500);
  } catch (error) {
    if (request !== tiltRequest) return;
    controlPrefs = { ...controlPrefs, mode: 'slide' }; applyControls();
    say(status, () => t(error.message === 'denied' ? 'tilt.denied' : 'tilt.unavailable'));
  }
}
$('#tilt-enable').addEventListener('click', enableTilt);
$('#controls-reset').addEventListener('click', () => { tiltRequest++; controls.clear(); controlPrefs = controlSettings(); applyControls(); sound.cue('ui'); });
const ARROWS = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
const keyLabel = code => ARROWS[code] ?? code.replace(/^Key|^Digit/, '').replace('ShiftLeft', 'Left Shift').replace('ShiftRight', 'Right Shift');
function showKeyMap() {
  // Start-screen legend: one kbd group per key slot (W A S D, then ↑ ← ↓ →), "/" between groups; Left/Right Shift read as one Shift.
  for (const keys of document.querySelectorAll('.intro-controls [data-keys], #guide-screen [data-keys], #tutorial-input[data-keys]')) {
    const actions = keys.dataset.keys.split(' ');
    const seen = new Set();
    const groups = Array.from({ length: Math.max(...actions.map(action => keyMap[action].length)) }, (_, slot) => actions
      .map(action => keyMap[action][slot]).filter(Boolean).map(code => keyLabel(code).replace(/^(Left|Right) Shift$/, 'Shift'))
      .filter(label => !seen.has(label) && seen.add(label))).filter(group => group.length);
    keys.replaceChildren(...groups.flatMap((group, i) => [...(i ? ['/'] : []), ...group.map(label => {
      const key = document.createElement('kbd'); key.textContent = label; return key;
    })]));
  }
  for (const button of document.querySelectorAll('[data-rebind]')) {
    button.lastElementChild.textContent = keyMap[button.dataset.rebind].map(keyLabel).join(' / ');
    button.setAttribute('aria-pressed', String(rebinding === button.dataset.rebind));
  }
}
for (const button of document.querySelectorAll('[data-rebind]')) button.addEventListener('click', () => {
  controls.clear();
  rebinding = button.dataset.rebind;
  const action = rebinding;
  say($('#keymap-status'), () => t('keymap.press', { action: t(`keymap.${action}`) }));
  showKeyMap();
});
$('#keymap-reset').addEventListener('click', () => {
  controls.clear(); rebinding = null; keyMap = resetKeyMap(); saveKeyMap(keyMap); showKeyMap();
  say($('#keymap-status'), () => t('keymap.restored'));
});
showKeyMap();
function editLayout(editing) {
  editingLayout = editing;
  controls.clear(); padTouch = null; drawPad();
  document.body.classList.toggle('layout-editing', editing);
  $('#layout-toolbar').hidden = !editing;
  toggleControls(false);
  phaseUI();
  applyControls();
}
$('#layout-edit').addEventListener('click', () => editLayout(true));
$('#layout-done').addEventListener('click', () => editLayout(false));
$('#layout-reset').addEventListener('click', () => { controlPrefs = { ...controlPrefs, layout: {} }; applyControls(); });
for (const button of touchButtons) {
  let drag = null;
  button.addEventListener('pointerdown', event => {
    if (!editingLayout) return;
    event.preventDefault();
    drag = { id: event.pointerId, dx: event.clientX - (button.getBoundingClientRect().left + button.offsetWidth / 2), dy: event.clientY - (button.getBoundingClientRect().top + button.offsetHeight / 2) };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', event => {
    if (!editingLayout || event.pointerId !== drag?.id) return;
    const x = Math.min(innerWidth - button.offsetWidth / 2 - 8, Math.max(button.offsetWidth / 2 + 8, event.clientX - drag.dx));
    const y = Math.min(innerHeight - button.offsetHeight / 2 - 8, Math.max(button.offsetHeight / 2 + 8, event.clientY - drag.dy));
    controlPrefs = { ...controlPrefs, layout: { ...controlPrefs.layout, [button.dataset.control]: { x: controlPrefs.hand === 'right' ? 1 - x / innerWidth : x / innerWidth, y: y / innerHeight } } };
    applyControls(false);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => { if (event.pointerId === drag?.id) { drag = null; applyControls(); } });
}
window.addEventListener('resize', applyControls);
// Capture phase so Escape only closes the panel and never reaches input.js as a pause/resume.
document.addEventListener('keydown', event => {
  if (editingLayout && event.code === 'Escape') {
    event.preventDefault(); event.stopImmediatePropagation(); editLayout(false); return;
  }
  if (rebinding) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.repeat) return;
    if (event.code === 'Escape') { rebinding = null; showKeyMap(); say($('#keymap-status'), () => t('keymap.cancelled')); return; }
    const action = rebinding;
    const result = rebind(keyMap, action, event.code);
    if (result.error) {
      const key = keyLabel(event.code);
      say($('#keymap-status'), () => result.error === 'reserved' ? t('keymap.reserved', { key }) : t('keymap.unavailable'));
      return;
    }
    controls.clear(); keyMap = result.map; saveKeyMap(keyMap); rebinding = null; showKeyMap();
    const key = keyLabel(event.code);
    say($('#keymap-status'), () => result.swapped ? t('keymap.swapped', { action: t(`keymap.${action}`), other: t(`keymap.${result.swapped}`) }) : t('keymap.assigned', { action: t(`keymap.${action}`), key }));
    return;
  }
  if (event.code !== 'Escape' || ui['controls-panel'].hidden) return;
  event.preventDefault();
  event.stopPropagation();
  toggleControls(false);
  ui['controls-button'].focus({ preventScroll: true });
}, { capture: true });
// Every event that grants user activation (a tap, drag, click or key) starts audio, so blocked autoplay never waits on a prompt.
for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(type, unlockAudio, { capture: true });
unlockAudio(); // plays at once where the browser allows autoplay
document.querySelectorAll('[data-control]').forEach(button => controls.bindButton(button, button.dataset.control));
ui['start-button'].addEventListener('click', start);
ui['restart-button'].addEventListener('click', () => restart());
ui['again-button'].addEventListener('click', () => {
  if (sprintSeries) sprintSeries = createSprintSeries(sprintSeries.count);
  if (cup) { cup = createCup([...unlockedTracks], cup.tracks[0], cup.tracks.length); restart(cup.tracks[0]); }
  else if (stunt) {
    stunt = { ...stunt, elapsed:0, score:0, heats:0, maxCombo:0, airTime:0 };
    restart(stunt.trackId);
  } else restart();
});
$('#next-stage').addEventListener('click', () => {
  if (sprintSeries && race.phase === 'finished' && sprintSeries.results.length < sprintSeries.count) restart();
  else if (cup && race.phase === 'finished' && !cupComplete(cup)) restart(cup.tracks[cup.results.length]);
  else if (stunt && race.phase === 'finished' && race.result.endReason === 'route' && stunt.elapsed < stunt.duration) restart(stunt.trackId);
});
$('#next-button').addEventListener('click', ({ currentTarget }) => { restart(currentTarget.dataset.next); showTracks(); });
ui['pause-button'].addEventListener('click', pause);
ui['resume-button'].addEventListener('click', pause);
const photoDialog = $('#photo-screen');
const updatePhotoView = () => world?.setPhotoView({
  angle:Number($('#photo-orbit').value), fov:Number($('#photo-fov').value),
  sky:$('#photo-sky').value,
});
$('#photo-open').addEventListener('click', () => {
  if (race.mode !== 'free' || race.phase !== 'paused' || !world) return;
  updatePhotoView();
  photoDialog.showModal();
  $('#photo-status').textContent=t('photo.status');
  sound.cue('ui');
});
for (const id of ['photo-orbit','photo-fov','photo-sky']) $('#'+id).addEventListener('input', updatePhotoView);
$('#photo-close').addEventListener('click',()=>photoDialog.close());
photoDialog.addEventListener('close',()=>{ world?.setPhotoView(null); sound.cue('ui'); });
$('#photo-save').addEventListener('click', async () => {
  const button=$('#photo-save'); button.disabled=true;
  try {
    const blob=await world.capturePhoto();
    const url=URL.createObjectURL(blob);
    const download=document.createElement('a');
    download.href=url; download.download=photoFilename(race.trackId);
    download.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    $('#photo-status').textContent=t('photo.ready');
    sound.cue('photo');
  } catch { $('#photo-status').textContent=t('photo.error'); }
  finally { button.disabled=false; }
});
ui['settings-button'].addEventListener('click', () => { toggleSettings(); sound.cue('ui'); });
audioSwitches.forEach(button => {
  const kind = button.dataset.audio, slider = button.nextElementSibling;
  button.addEventListener('click', () => {
    setAudio(kind, !audio[kind]);
    sound.cue('ui');
  });
  // Heard live while dragging but saved on release, so a drag through zero still unmutes to the level before it.
  slider.addEventListener('input', () => {
    const level = slider.value / 100;
    if (kind === 'music') sound.setMusic(level > 0, level); else sound.setEnabled(level > 0, level);
    showChannel(button, level > 0, level || volume[kind]);
  });
  slider.addEventListener('change', () => {
    const next = setVolume(volume[kind], slider.value / 100);
    setAudio(kind, next.on, next.volume);
    if (kind === 'sfx') sound.cue('ui');
  });
});
$('#mute-all').addEventListener('click', toggleSound);
ui['camera-button'].addEventListener('click', changeCamera);
ui['assist-button'].addEventListener('click', toggleAssist);
document.querySelector('.toolbar').addEventListener('click', event => {
  if (event.detail > 0) event.target.closest('button')?.blur();
});
window.addEventListener('blur', () => {
  clearButtonPresses();
  if (race.phase === 'racing' || race.phase === 'countdown') pause();
});
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('page-hidden', document.hidden);
  if (document.hidden && (race.phase === 'racing' || race.phase === 'countdown')) pause();
  if (!document.hidden) pickUpNewBuild();
});
// Only refresh an idle session after reload, resume or bfcache restore; don't interrupt a race.
const pickUpNewBuild = () => refreshIfStale(() => race.phase === 'ready');
window.addEventListener('pageshow', event => { if (event.persisted) pickUpNewBuild(); });
pickUpNewBuild();

function phaseUI() {
  const phase = race.phase;
  const ready = phase === 'ready';
  const overlay = phase === 'paused' || phase === 'finished';
  if (ready || overlay) clearButtonPresses();
  document.body.dataset.phase = phase;
  if (!['racing', 'countdown'].includes(phase)) { padTouch = null; drawPad(); } // controls.clear() reset the real pad; drop the mirror with it
  ui.intro.hidden = !ready && !ui.intro.getAnimations().length;
  if (ready) { ui.intro.inert = false; ui.intro.getAnimations().forEach(animation => animation.cancel()); }
  ui['race-info'].hidden = ready;
  ui['race-overlay'].hidden = !overlay || editingLayout || phase === 'finished';
  ui['touch-controls'].hidden = !editingLayout && (ready || overlay);
  ui.intro.hidden ||= editingLayout;
  ui['controls-button'].disabled = !(ready || phase === 'paused');
  if (ui['controls-button'].disabled) toggleControls(false);
  ui['pause-button'].disabled = ready || phase === 'finished';
  ui['restart-button'].hidden = ready;
  if (tutorial) {
    ui['race-overlay'].hidden = true;
    ui['controls-button'].disabled = true;
    ui['restart-button'].hidden = true;
    ui['pause-button'].disabled = tutorial.complete;
  }
  ui['assist-button'].disabled = !!tutorial;
  $('#photo-open').hidden = !!tutorial || phase !== 'paused' || race.mode !== 'free';
  if (phase === 'paused') {
    $('#new-best').hidden = true;
    enter($('.overlay-content'), 'translateY(12px)');
    ui['resume-button'].hidden = false;
    $('#next-button').hidden = true;
    $('#next-stage').hidden = true;
    ui['result-stats'].hidden = true;
    $('#result-style').hidden = true;
    $('#result-links').hidden = true;
  } else if (phase === 'finished') {
    controls.clear();
    if (sprintSeries && race.mode === 'custom') sprintSeries = addSprintStage(sprintSeries, race);
    if (cup && race.mode === 'cup') cup = addCupResult(cup, race);
    if (stunt && race.mode === 'stunt') {
      stunt.elapsed += race.result.time;
      stunt.score += race.result.score;
      stunt.heats++;
      stunt.airTime += race.styleAttack.airTime;
      stunt.maxCombo = Math.max(stunt.maxCombo, race.styleAttack.maxCombo);
    }
    const medals = (race.mode === 'classic' ? recordMedals(race.result) : []).filter(id => !sessionMedals[id]); // history.js swallows storage failures
    sessionMedals = { ...sessionMedals, ...Object.fromEntries(medals.map(id => [id, new Date().toISOString()])) };
    const trackId = race.trackId ?? 'coast';
    let best, record;
    $('#next-button').hidden = true;
    const intermediateStage = (sprintSeries && sprintSeries.results.length < sprintSeries.count) || (cup && !cupComplete(cup)) ||
      (stunt && race.result.endReason === 'route' && stunt.elapsed < stunt.duration);
    $('#next-stage').hidden = !intermediateStage;
    if (intermediateStage) {
      best = 0; record = false; // A partial series never writes a misleading individual best.
    } else if (race.result.success === false && race.mode !== 'classic') {
      best = race.elapsed; record = false; // A missed gate or expired clock is a retry, not a saved best.
    } else if (race.mode === 'stunt' && stunt) {
      ({best,record} = recordModeRace({ ...race, result:{...race.result, time:stunt.elapsed, score:Math.round(stunt.score), maxCombo:stunt.maxCombo, airTime:stunt.airTime} }));
    } else if (race.mode !== 'classic') {
      const total = cup ? cupTotalTime(cup) : sprintSeries ? sprintTotal(sprintSeries) : race.result.time;
      const modeRace = cup ? { ...race, trackId: cup.tracks[0], result: { ...race.result, time: total,
        score: cupStandings(cup).find(entry => entry.name === 'YOU').points } } : sprintSeries ? { ...race, result: { ...race.result, time: total,
        score: sprintSeries.results.reduce((score, stage) => score + stage.score, 0) } } : race;
      ({ best, record } = recordModeRace(modeRace));
      if (race.mode === 'time' && record) {
        const candidate = { time: race.elapsed, samples: trace };
        if (traceRace === race && validGhost(candidate, trackId)) {
          saveModeGhost(trackId, race.config, candidate);
          modeGhosts.set(modeGhostKey(race), candidate);
        }
      }
    } else if (race.modifier) {
      const run = recordDaily(daily, race);
      sessionDaily = [...sessionDaily, run].slice(-50);
      const board = dailyBoard(sessionDaily, daily.id);
      best = board[0].time; record = board[0] === run;
    } else {
      const recordRun = recordRace(race);
      sessionHistory = [...sessionHistory, recordRun].slice(-50);
      const tracks = Object.keys(RACE_TRACKS);
      const next = tracks[tracks.indexOf(race.trackId) + 1];
      // NEXT drives progression only: hidden once every track was already open before this run.
      const campaignDone = tracks.every(id => unlockedTracks.has(id));
      if (next && race.result.position <= 3) unlockedTracks.add(next);
      if (next && !campaignDone && unlockedTracks.has(next)) {
        $('#next-button').hidden = false;
        $('#next-button').dataset.next = next;
      }
      const saved = recordBest(trackId, race.elapsed);
      // Session bests keep "personal best" honest when storage is blocked.
      best = Math.min(saved.best, sessionBests[trackId] ?? Infinity);
      record = saved.record && !(sessionBests[trackId] <= race.elapsed);
      sessionBests[trackId] = best;
      // The pre-tracks key stays readable for coast (older builds, browser test).
      if (record && trackId === 'coast') try { localStorage.setItem(LEGACY_BEST_KEY, String(best)); } catch { /* A blocked personal-best store never blocks the results. */ }
      recordStars(trackId, race.result.stars);
      sessionStars[trackId] = Math.max(sessionStars[trackId] ?? 0, race.result.stars);
      const ghost = { time: race.elapsed, samples: trace };
      if (record && traceRace === race && validGhost(ghost, trackId)) { saveGhost(trackId, ghost); ghosts[trackId] = ghost; }
    }
    showTracks();
    ui['resume-button'].hidden = true;
    ui['result-stats'].hidden = false;
    $('#new-best').hidden = !record;
    $('#result-style').hidden = race.mode !== 'classic';
    $('#result-links').hidden = false;
    lastResult = { race, best, record, medals, series: sprintSeries, cup, stunt };
  }
  phaseText();
}
let lastResult;
// Text only, so a language switch re-renders the current phase without replaying its side effects (records, medals).
function phaseText() {
  const phase = race.phase;
  ui['race-status'].textContent = t(`phase.${phase}`);
  ui['pause-button'].setAttribute('aria-label', t(phase === 'paused' ? 'resume.aria' : 'pause.aria'));
  if (phase === 'paused') {
    ui['overlay-title'].textContent = t('overlay.pausedTitle');
    ui['overlay-copy'].textContent = t('overlay.pausedCopy');
  }
  if (phase !== 'finished' || lastResult?.race !== race) return;
  const { best, record, medals, series, cup: finishedCup, stunt: finishedStunt } = lastResult;
  const { result } = race;
  if (race.mode === 'elimination') {
    ui['overlay-title'].textContent = t(result.success ? 'mode.eliminationWon' : 'mode.eliminationLost');
    ui['overlay-copy'].textContent = t('mode.eliminationSummary',{n:race.elimination.eliminated.length});
    ui['result-stats'].innerHTML = `<div><span>${t('mode.eliminationPosition')}</span><strong>${result.position} / 4</strong></div>
      <div><span>${t('mode.totalTime')}</span><strong>${timeString(result.time)}</strong></div>`;
    resultCounts=[];return;
  }
  if (finishedStunt) {
    const continuing = finishedStunt.elapsed < finishedStunt.duration && result.endReason === 'route';
    const left = Math.max(0, finishedStunt.duration - finishedStunt.elapsed);
    ui['overlay-title'].textContent = t(continuing ? 'mode.stuntHeatEnd' : 'mode.stuntComplete');
    ui['overlay-copy'].textContent = t('mode.stuntSummary', {
      heats:finishedStunt.heats, max:finishedStunt.maxCombo, air:finishedStunt.airTime.toFixed(1),
    });
    if (continuing) $('#next-stage').textContent = t('mode.stuntNext', {sec:Math.ceil(left)});
    const medal = continuing ? null : stuntMedal(finishedStunt.score, finishedStunt.duration);
    ui['result-stats'].innerHTML = `<div><span>${t('mode.stuntPoints')}</span><strong>${Math.round(finishedStunt.score)}</strong></div><div><span>${t('mode.stuntTime')}</span><strong>${Math.floor(finishedStunt.elapsed)} / ${finishedStunt.duration} s</strong></div>${continuing?'':`<div><span>${t('mode.stuntBest')}</span><strong>${Math.round(best)}</strong></div><div><span>${t('mode.stuntMedal')}</span><strong>${medal ? t('mode.medal.' + medal) : t('mode.medal.none')}</strong></div>`}`;
    resultCounts=[];
    return;
  }
  if (finishedCup) {
    const standings = cupStandings(finishedCup);
    const complete = cupComplete(finishedCup);
    const you = standings.find(entry => entry.name === 'YOU');
    ui['overlay-title'].textContent = t(complete ? standings[0].name === 'YOU' ? 'mode.cupWon' : 'mode.cupComplete' : 'mode.cupStage', {
      n: finishedCup.results.length, total: finishedCup.tracks.length,
    });
    ui['overlay-copy'].textContent = standings.map(({name,points},i) =>
      `${i+1}. ${name} · ${points} ${t('mode.cupPts')}`).join('  ·  ');
    $('#next-stage').textContent = complete ? '' : t('mode.cupNext', { track: trackName(finishedCup.tracks[finishedCup.results.length],getLocale()) });
    ui['result-stats'].innerHTML = `<div><span>${t('mode.cupPts')}</span><strong>${you.points}</strong></div><div><span>${t('mode.totalTime')}</span><strong>${timeString(cupTotalTime(finishedCup))}</strong></div>`;
    resultCounts = [];
    return;
  }
  if (series && series.results.length < series.count) {
    const index = series.results.length;
    ui['overlay-title'].textContent = t('mode.stageComplete', { n: index, total: series.count });
    ui['overlay-copy'].textContent = t('mode.stageContinue');
    $('#next-stage').textContent = t('mode.nextStage', { n: index + 1, total: series.count });
    ui['result-stats'].innerHTML = `<div><span>${t('mode.stageTime')}</span><strong>${timeString(race.elapsed)}</strong></div><div><span>${t('mode.totalTime')}</span><strong>${timeString(sprintTotal(series))}</strong></div>`;
    resultCounts = [];
    return;
  }
  if (race.mode === 'time' && !result.success) {
    ui['overlay-title'].textContent = t('mode.cleanFailed');
    ui['overlay-copy'].textContent = t('mode.cleanFailedCopy',{n:result.collisions});
    ui['result-stats'].innerHTML = `<div><span>${t('mode.collision')}</span><strong>${result.collisions}</strong></div><div><span>${t('result.yourTime')}</span><strong>${timeString(race.elapsed)}</strong></div>`;
    resultCounts = [];
    return;
  }
  if (race.mode === 'checkpoint' && !result.success) {
    ui['overlay-title'].textContent = t('mode.checkpointFailed');
    ui['overlay-copy'].textContent = t('mode.checkpointFailedCopy', { n: race.checkpoint.passed, total: race.checkpoint.gates.length });
    ui['result-stats'].innerHTML = `<div><span>${t('mode.gates')}</span><strong>${race.checkpoint.passed} / ${race.checkpoint.gates.length} · ${t('mode.perfect')}: ${race.checkpoint.perfect}</strong></div><div><span>${t('mode.totalTime')}</span><strong>${timeString(race.elapsed)}</strong></div>`;
    resultCounts = [];
    return;
  }
  const displayedTime = series ? sprintTotal(series) : race.elapsed;
  if (!$('#next-button').hidden) $('#next-track').textContent = trackName($('#next-button').dataset.next, getLocale());
  ui['overlay-title'].textContent = series ? t('mode.seriesComplete') : race.mode !== 'classic' ? t('mode.resultTitle') : t(result.position === 1 ? 'overlay.winTitle' : 'overlay.finishTitle');
  ui['overlay-copy'].textContent = t(record ? 'overlay.recordCopy' : 'overlay.againCopy') + t('overlay.summary', { near: result.nearMisses, contacts: result.collisions })
    + (race.mode === 'gauntlet' ? ' ' + t('mode.hazardResult', { n: race.hazards.filter(h => h.passed).length, total: race.hazards.length }) : '')
    + (medals.length ? t('overlay.medal', { list: medals.map(id => t(`medal.${id}`)).join(t('list.separator')) }) : '');
  ui['result-stats'].innerHTML = `<div><span>${t('race.position')}</span><strong>${race.rivals.length ? result.position : t('mode.solo')}<small> / ${race.rivals.length + 1}</small></strong></div><div><span>${t('result.yourTime')}</span><strong>${timeString(displayedTime)}</strong></div><div><span>${t('result.best')}</span><strong>${timeString(best)}</strong></div>`;
  $('#result-style').setAttribute('aria-label', t('result.starsAria', { n: result.stars }));
  $('#result-style').innerHTML = `<div class="style-stars" aria-hidden="true">${Array.from({ length: 3 }, (_, i) => `<span class="${i < result.stars ? 'earned' : ''}">${icon('star')}</span>`).join('')}</div><strong>${t('result.style', { score: result.score })}</strong><small>${t('result.styleHelp')}<br>${t('result.styleStars', { two: race.length * 0.25, three: race.length * 0.5 })}</small>`;
  resultCounts = [
    { element: ui['result-stats'].children[1].querySelector('strong'), value: displayedTime, format: timeString },
    { element: ui['result-stats'].children[2].querySelector('strong'), value: best, format: timeString },
    { element: $('#result-style > strong'), value: result.score, format: value => interpolate(L['result.style'], { score: Math.round(value) }) },
  ];
}

function updateUI(now, input) {
  if (raceRouteMap?.trackId !== race.trackId) ensureRouteMaps();
  raceRouteMap.updateDrivers([{ id: 'YOU', distance: race.player.distance, player: true }, ...race.rivals.map(r => ({ id: r.name, distance: r.distance }))]);
  if (previousPhase !== race.phase) {
    if (previousPhase === 'countdown' && race.phase === 'racing') goUntil = now + 0.8;
    phaseUI();
    if (race.phase === 'countdown' && previousPhase !== 'paused') enter(ui.countdown, 'translateY(-24px)');
    if (race.phase === 'countdown') hidePerformanceNotice(); // never over the race view
    previousPhase = race.phase;
  }
  if (race.phase === 'finished' && presentationState.results) {
    if (ui['race-overlay'].hidden) {
      ui['race-overlay'].hidden = false;
      enter($('.overlay-content'), 'translateX(48px)', 'slow');
      ui['again-button'].focus({ preventScroll: true });
    }
    resultCounts.forEach(({ element, value, format }, i) => {
      const progress = Math.max(0, Math.min(1, presentationState.count * 3 - i));
      element.textContent = format(value * (1 - (1 - progress) ** 3));
    });
  }
  const cleanTrialHud = $('#clean-trial-hud');
  cleanTrialHud.hidden = race.mode !== 'time' || !race.config.clean || race.phase === 'ready';
  if (!cleanTrialHud.hidden) {
    cleanTrialHud.textContent = t(race.player.collisions ? 'mode.cleanBroken' : 'mode.cleanActive');
    cleanTrialHud.dataset.broken = String(race.player.collisions > 0);
  }
  const hazardWarning = $('#hazard-warning');
  const hazardAhead = race.hazards.length ? race.hazards.find(h => !h.passed && !h.hit && h.distance > race.player.distance) : null;
  const hazardDistance = hazardAhead ? Math.ceil(hazardAhead.distance - race.player.distance) : Infinity;
  hazardWarning.hidden = !hazardAhead || hazardDistance > 170 || race.phase !== 'racing';
  if (!hazardWarning.hidden) hazardWarning.textContent = t('mode.hazardWarning', { n: hazardDistance });
  const eliminationHud=$('#elimination-hud');
  eliminationHud.hidden = !race.elimination || race.phase === 'ready';
  if (race.elimination) {
    eliminationHud.textContent=t('mode.eliminationHud',{
      active:race.rivals.length+1,
      seconds:Math.max(0,Math.ceil(race.elimination.nextAt-race.elapsed)),
    });
    eliminationHud.dataset.urgent=String(race.elimination.nextAt-race.elapsed <= 3);
  }
  const checkpointHud = $('#checkpoint-hud');
  checkpointHud.hidden = !race.checkpoint || race.phase === 'ready';
  if (race.checkpoint) {
    const next = race.checkpoint.gates.find(g => !g.passed && !g.missed);
    checkpointHud.textContent = t('mode.checkpointHud', {
      n: race.checkpoint.passed, total: race.checkpoint.gates.length,
      seconds: race.checkpoint.timeLeft.toFixed(1),
      distance: next ? Math.max(0,Math.ceil(next.distance - race.player.distance)) : 0,
      direction: next ? t('mode.direction.' + checkpointDirection(race.player, next)) : '—',
      perfect: race.checkpoint.perfect,
    });
    checkpointHud.dataset.urgent = String(race.checkpoint.timeLeft < 10);
  }
  const counter = $('#sprint-stage');
  counter.hidden = !sprintSeries && !cup;
  if (cup) counter.textContent = t('mode.cupHeat', { n: Math.min(cup.tracks.length, cup.results.length + (race.phase === 'finished' ? 0 : 1)), total: cup.tracks.length });
  if (sprintSeries) counter.textContent = t('mode.stageCounter', {
    n: Math.min(sprintSeries.count, sprintSeries.results.length + (race.phase === 'finished' ? 0 : 1)),
    total: sprintSeries.count,
  });
  const slot = $('#item-slot'), carItem = race.player.heldItem;
  slot.hidden = !race.config.activeItems || race.phase === 'ready';
  if (!slot.hidden) {
    $('#item-status').textContent = carItem ? t('mode.itemReady',{item:t('mode.item.'+carItem)}) : t('mode.itemEmpty');
    $('#activate-item').disabled = !carItem || race.phase !== 'racing' || race.player.itemCooldown > 0;
  }
  const stuntHud = $('#stunt-hud');
  stuntHud.hidden = !stunt || race.phase === 'ready';
  if (stunt) {
    const active = race.phase === 'finished' ? 0 : race.elapsed;
    stuntHud.textContent = t('mode.stuntHud', {
      time:Math.ceil(Math.max(0, stunt.duration - stunt.elapsed - active)),
      score:Math.round(stunt.score + (race.phase === 'finished' ? 0 : race.player.score)),
      combo:race.styleAttack?.combo ?? 0, heat:stunt.heats + (race.phase === 'finished' ? 0 : 1),
    });
  }
  const practiceHud = $('#practice-hud');
  practiceHud.hidden = !race.practice || !!tutorial;
  if (race.practice) practiceHud.textContent = t('mode.practiceTelemetry', {
    km: (race.practice.travelled / 1000).toFixed(2),
    max: Math.round(race.practice.maxSpeed * 3.6),
    air: race.practice.airTime.toFixed(1),
    near: race.practice.nearMisses,
    combo: race.player.combo,
    tricks: race.practice.tricks,
  });
  const car = race.player;
  const impactAge = car.impact ? race.elapsed - car.impact.time : 10;
  const calm = visual.comfortable || reducedMotion.matches;
  const flying = car.altitude > 0.25;
  ui.speed.textContent = String(Math.round(car.speed * 3.6));
  speedNeedle.style.transform = `rotate(${-70 + Math.min(1, car.speed / (MAX_SPEED + 30)) * 140}deg)`;
  const position = racePosition(race);
  if (previousPosition !== position) {
    ui.position.textContent = race.rivals.length ? String(position).padStart(2, '0') : '—';
    if (race.rivals.length && previousPosition !== null && race.phase === 'racing') {
      const gained = position < previousPosition;
      positionChange.textContent = gained ? '↑' : '↓';
      positionChange.dataset.direction = ui.position.dataset.direction = gained ? 'gained' : 'lost';
      positionChange.setAttribute('aria-label', L[gained ? 'hud.gained' : 'hud.lost']);
      positionUntil = now + 1.2;
      ui.position.getAnimations().forEach(animation => animation.cancel());
      positionChange.getAnimations().forEach(animation => animation.cancel());
      if (!calm) {
        ui.position.animate([{ opacity: .4, transform: `rotateX(${gained ? '-' : ''}65deg)` }, { opacity: 1, transform: 'rotateX(0)' }], motionOptions('base'));
        positionChange.animate([{ opacity: .35 }, { opacity: 1 }], motionOptions('slow'));
      }
    }
    previousPosition = position;
  }
  positionChange.hidden = race.phase !== 'racing' || now >= positionUntil;
  if (positionChange.hidden) delete ui.position.dataset.direction;
  if (calm || race.phase !== 'racing') for (const element of [ui.position, positionChange]) element.getAnimations().forEach(animation => animation.cancel());
  ui.timer.textContent = timeString(race.elapsed);
  ui.distance.textContent = (car.distance / 1000).toFixed(2);
  ui['progress-fill'].style.width = `${car.distance / race.length * 100}%`;
  $('#race-length').textContent = (race.length / 1000).toFixed(2);
  const timeGhost = race.mode === 'time' && controlPrefs.ghost ? modeGhostFor(race) : null;
  const split = $('#ghost-split');
  split.hidden = !timeGhost || race.phase !== 'racing';
  if (!split.hidden) {
    const delta = car.distance - ghostAt(timeGhost, race.elapsed).distance;
    split.textContent = t(delta >= 0 ? 'mode.ahead' : 'mode.behind', { n: Math.abs(Math.round(delta)) });
    split.dataset.ahead = String(delta >= 0);
  }
  ui['fuel-value'].textContent = String(Math.round(car.fuel));
  ui['fuel-fill'].style.transform = `scaleX(${car.fuel / 100})`;
  ui['fuel-meter'].setAttribute('aria-valuenow', String(Math.round(car.fuel)));
  ui['fuel-meter'].setAttribute('aria-valuetext', `${car.fuel < 20 ? L['hud.lowCharge'] : ''}${Math.round(car.fuel)}%`);
  ui['fuel-meter'].dataset.refilling = String(race.phase === 'racing' && car.fuel > previousFuel && car.fuel < 100);
  previousFuel = car.fuel;
  $('#style-score').textContent = race.mode === 'gauntlet' ? t('mode.hazardHud', { n: race.hazards.filter(h => h.passed).length, total: race.hazards.length, score: Math.floor(car.score) }) : interpolate(L['hud.style'], { n: Math.floor(car.score) });
  ui.altitude.textContent = car.altitude.toFixed(1);
  const tap = touchPreference.matches && controlPrefs.flyMode === 'toggle';
  // A toggle latch would keep the empty thruster held and block recharge (game.js only clears exhausted when fly is off).
  if (controlPrefs.flyMode === 'toggle' && input.fly && (car.exhausted || car.fuel <= 0)) controls.setFly(false);
  const flyKey = touchPreference.matches ? '' : keyLabel(keyMap.fly[0]).toUpperCase();
  const hold = touchPreference.matches ? L[tap ? 'hud.tapFly' : 'hud.holdFly'] : interpolate(L['hud.holdKey'], { key: flyKey });
  const release = touchPreference.matches ? L['hud.releaseFly'] : interpolate(L['hud.releaseKey'], { key: flyKey });
  const touchdown = car.landing && race.elapsed - car.landing.time < 1.1;
  const depleted = car.exhausted || car.fuel <= 0;
  const state = L[car.thrusting ? car.verticalSpeed > 0.2 ? 'hud.ascending' : 'hud.cruise' : car.altitude > 0.25 ? 'hud.descending' : touchdown ? 'hud.touchdown' : depleted ? 'hud.recharging' : car.speed >= 18 ? 'hud.readyToFly' : 'hud.buildSpeed'];
  const nitroActive = car.nitroTime > 0 && race.phase === 'racing';
  const airDash = car.thrusting && car.boosting;
  ui['flight-state'].textContent = car.thrusting && car.nitroTime > 0 ? L['hud.airDashNitro'] : airDash ? L['hud.airDash'] : nitroActive ? L['hud.nitroActive'] : car.trick && !car.trick.done ? L['hud.trick'] : car.inShortcut ? L['callout.shortcut']
    : car.drift ? interpolate(L['callout.drift'], { tier: L[car.drift.time >= 3 ? 'callout.drift.tier.3' : car.drift.time >= 2 ? 'callout.drift.tier.2' : car.drift.time >= 1 ? 'callout.drift.tier.1' : 'hud.driftBuilding'] }) : car.miniBoost > 0 && !touchdown ? L['hud.miniBoost'] : state;
  nitroMeter.setAttribute('aria-valuenow', String(Math.round(car.nitro * 100) / 100));
  nitroMeter.classList.toggle('is-max', car.nitro >= 3);
  nitroMeter.classList.toggle('is-low', car.nitro > 0 && car.nitro < .6);
  if (car.nitro > previousNitro && race.phase === 'racing') nitroRefillUntil = now + .6;
  nitroMeter.dataset.refilling = String(race.phase === 'racing' && now < nitroRefillUntil);
  nitroStatus.textContent = nitroActive ? L['hud.nitroActive'] : car.nitro >= 3 ? L['hud.nitroMax'] : interpolate(L['hud.nitroCount'], { n: car.nitro.toFixed(2) });
  for (const [index, segment] of nitroSegments.entries()) {
    const fill = Math.min(1, Math.max(0, car.nitro - index));
    segment.firstElementChild.style.transform = `scaleX(${fill})`;
    segment.classList.toggle('is-full', fill === 1);
    if (fill === 1 && previousNitro < index + 1 && race.phase === 'racing' && !visual.comfortable && !reducedMotion.matches) {
      segment.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 450 });
    }
  }
  previousNitro = car.nitro;
  const callout = callouts.update(race, impactAge <= 1.1);
  if (!callout || calm) eventCallout.getAnimations().forEach(animation => animation.cancel());
  eventCallout.hidden = !callout;
  if (callout !== shownCallout) {
    for (const report of calloutReports) report.hidden = true;
    if (callout) {
      const report = calloutReports[callout.kind === 'perfect' ? 0 : callout.kind === 'near' ? 1 : 2];
      const detail = document.createElement('span');
      detail.textContent = callout.detail;
      report.replaceChildren(document.createTextNode(callout.title), detail);
      report.hidden = false;
      eventCallout.dataset.kind = callout.kind;
      eventCallout.getAnimations().forEach(animation => animation.cancel());
      if (!visual.comfortable && !reducedMotion.matches) eventCallout.animate([
        { opacity: 0, transform: 'scale(.88)', offset: 0 },
        { opacity: 1, transform: 'scale(1)', offset: .2 },
        { opacity: 1, transform: 'scale(1)', offset: .85 },
        { opacity: 0, transform: 'scale(1)', offset: 1 },
      ], { ...motionOptions('slow'), duration: motionOptions('slow').duration * 2.5 });
    }
    shownCallout = callout;
  }
  document.body.classList.toggle('nitro-active', nitroActive);
  // Inside a shortcut only BOOST drains (3/s); plain flight there is free.
  ui['flight-budget'].textContent = car.inShortcut && !airDash ? '∞' : `${(car.fuel / (car.inShortcut ? 3 : airDash ? 22 : 19)).toFixed(1)}s`;
  ui['flight-instruction'].textContent = car.thrusting ? interpolate(L['hud.steerAir'], { action: L[tap ? 'hud.tapLand' : 'hud.releaseDescend'] }) : car.altitude > 0.25 ? depleted ? L['hud.autoLand'] : interpolate(L['hud.climbAgain'], { hold })
    : car.exhausted ? interpolate(L['hud.rechargeRoad'], { action: tap ? L['hud.tapLand'] : release }) : car.speed < 18 ? interpolate(L['hud.reachLift'], { hold }) : depleted ? L['hud.charging'] : interpolate(L[tap ? 'hud.lift' : 'hud.liftLand'], { hold });
  ui['fuel-caption'].textContent = car.exhausted ? interpolate(L['hud.toRecharge'], { action: tap ? L['hud.land'] : release }) : L[car.boosting ? 'hud.sharedCharge' : car.thrusting ? 'hud.thrustersOn' : flying ? !input.fly && car.fuel < 100 ? 'hud.glideRecharge' : 'hud.descendRoad' : 'hud.groundRecharge'];
  ui['climb-rate'].textContent = `${car.verticalSpeed >= 0 ? '+' : ''}${car.verticalSpeed.toFixed(1)} M/S`;
  ui['height-indicator'].style.transform = `translateY(${-car.altitude / 12 * 110}px)`;
  document.body.classList.toggle('low-charge', car.fuel < 20);
  document.body.classList.toggle('boosting', (car.boosting || nitroActive || (car.miniBoost > 0 && car.boostTunnelEvent)) && race.phase === 'racing');
  const tunnelBoost = car.miniBoost > 0 && car.boostTunnelEvent &&
    race.elapsed - car.boostTunnelEvent.time < 3.6;
  const boost = (car.boosting || nitroActive || tunnelBoost) && race.phase === 'racing';
  boostStatus.textContent = L[tunnelBoost ? 'hud.hyperdrive' : boost ? 'hud.thrustActive' : car.fuel === 0 ? 'hud.chargeEmpty' : car.fuel < 100 && !flying ? 'hud.recharging' : 'hud.boostReady'];
  boostStatus.dataset.state = boost ? 'active' : car.fuel === 0 ? 'empty' : 'ready';
  if (boost && !previousBoost && visual.enabled && !calm) {
    boostStatus.animate([{ opacity: 0.4, transform: 'translateX(-5px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 180 });
  }
  if (feedbackCar === car && race.phase === 'racing' && touchPreference.matches && visual.haptics && !calm) {
    const hit = car.impact && car.impact !== lastImpact;
    const burst = car.nitroTime > lastNitroTime || (boost && !previousBoost);
    const driftPaid = car.driftPayout && car.driftPayout !== lastDriftPayout;
    const trickPaid = car.trickPayout?.nitro > 0 && car.trickPayout !== lastTrickPayout;
    if (hit || burst || driftPaid || trickPaid) {
      try { navigator.vibrate?.(hit ? [18, 30, 18] : trickPaid ? [12, 20, 12] : burst ? 25 : 15); } catch { /* Unsupported haptics never interrupt a race. */ }
    }
  }
  feedbackCar = car; lastImpact = car.impact; lastNitroTime = car.nitroTime;
  lastDriftPayout = car.driftPayout;
  lastTrickPayout = car.trickPayout;
  previousBoost = boost;
  $('#aero-flow').textContent = L[boost ? 'hud.highVelocity' : 'hud.streamlines'];
  $('#aero-floor').textContent = L[flying ? 'hud.downwash' : visual.aeroMode === 'downforce' ? 'hud.suction' : 'hud.lowDrag'];
  $('#aero-jet').textContent = L[boost ? 'hud.thrustActive' : race.phase === 'ready' ? 'hud.demo' : 'hud.standby'];
  document.body.style.setProperty('--flight-bank', `${-car.steering * 5}deg`);
  document.body.style.setProperty('--streak-opacity', visual.enabled && !calm && race.phase === 'racing' ? String(boost ? visual.speedLines : 0) : '0');
  ui['impact-report'].hidden = race.phase !== 'racing' || impactAge > 1.1;
  if (!ui['impact-report'].hidden) {
    ui['impact-title'].textContent = L[car.impact.kind === 'barrier' ? 'hud.barrier' : 'hud.vehicle'];
    ui['impact-loss'].textContent = String(Math.round(car.impact.speedLost * 3.6));
  }
  touchButtons.forEach(button => {
    const control = button.dataset.control;
    const active = control === 'left' ? input.steer < 0 : control === 'right' ? input.steer > 0 : !!input[control];
    button.classList.toggle('is-held', active);
    button.setAttribute('aria-pressed', String(active));
    // Only toggle mode varies the label; written only when it changes (applyI18n resets it to 'hint.fly').
    if (control === 'fly') {
      const label = L[tap ? active ? 'hud.tapToLand' : 'hud.tapToFly' : 'hint.fly'];
      if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
    }
  });
  const hint = !padTouch && race.phase === 'racing' && race.elapsed < PAD_HINT_SECONDS && controlPrefs.mode === 'slide';
  if (hint !== padHint) { padHint = hint; drawPad(); }
  ui['speed-caption'].textContent = L[race.phase === 'ready' ? 'hud.readyTakeoff' : car.boosting ? 'hud.boostEngaged' : autoThrottle ? 'hud.autoOverride' : 'hud.tagline'];
  document.body.classList.toggle('airborne', flying);
  document.body.classList.toggle('collision', impactAge < 0.45 && race.phase === 'racing');
  if (previousFlight !== flying) {
    ui['flight-mode'].textContent = L[flying ? 'hud.flightMode' : 'hud.roadMode'];
    ui['mode-icon'].innerHTML = icon(flying ? 'fly' : 'road');
    previousFlight = flying;
  }
  const countdown = race.phase === 'countdown';
  ui.countdown.hidden = !(countdown || (race.phase === 'racing' && now < goUntil));
  const step = countdown ? String(Math.ceil(race.countdown)) : 'GO'; // the step stays a CSS hook; only the shown text is translated
  const countdownText = countdown ? step : L['hud.go'];
  if (countdownNumber.textContent !== countdownText) {
    countdownNumber.textContent = countdownText;
    ui.countdown.dataset.step = step;
    if (!calm) countdownNumber.animate([{ opacity: 0.4, transform: `scale(${countdown ? 1.3 : 0.65})` }, { opacity: 1, transform: 'scale(1)' }], motionOptions(countdown ? 'base' : 'slow'));
  }
  countdownLabel.textContent = L[countdown ? autoThrottle ? 'hud.autoReady' : 'hud.holdReady' : 'hud.goSkyline'];
  const length = race.length;
  let status = L[`phase.${race.phase}`];
  if (race.mode === 'free' && car.distance >= length) status = L['mode.endOfRoad'];
  else if (race.phase === 'racing' && race.mode === 'classic' && car.distance >= length - 500) {
    const { ahead, behind } = sprintGaps(race);
    status = `${L['hud.final']}${ahead !== null ? ` · +${Math.round(ahead)} m` : ''}${behind !== null ? ` · −${Math.round(behind)} m` : ''}`;
  }
  ui['race-status'].textContent = status;
  const gapWarning = race.phase === 'racing' ? gapChargeWarning(race) : null;
  ui['driving-message'].textContent = race.phase !== 'racing' || impactAge < 1.1 ? '' : input.fly && car.speed < 18 ? L['hud.reachLiftOff'] : car.exhausted && input.fly ? L['hud.releaseRecharge']
    : gapWarning ? interpolate(L['hud.gapCharge'], { n: Math.ceil(gapWarning.need) }) : '';
  if (gapWarning) ui['driving-message'].dataset.tone = 'warning'; else delete ui['driving-message'].dataset.tone;
  const racers = [{ name: 'YOU', distance: car.distance, player: true }, ...race.rivals].sort((a, b) => b.distance - a.distance);
  const order = racers.map(racer => racer.name).join(',');
  if (calm || race.phase !== 'racing') leaderboardRows.forEach(row => row.getAnimations().forEach(animation => animation.cancel()));
  if (order !== leaderboardOrder) {
    // FLIP reads geometry only on a rank change, with all reads batched before writes.
    const before = !calm && race.phase === 'racing' && leaderboardOrder ? new Map(leaderboardRows.map(row => [row, row.getBoundingClientRect().top])) : null;
    leaderboardRows.forEach(row => row.getAnimations().forEach(animation => animation.cancel()));
    ui.leaderboard.replaceChildren(...racers.map(racer => racerRows.get(racer.name)));
    const moves = before ? leaderboardRows.map(row => [row, before.get(row) - row.getBoundingClientRect().top]) : [];
    for (const [row, delta] of moves) if (delta) row.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], motionOptions('base'));
    leaderboardOrder = order;
  }
  racers.forEach((racer, i) => {
    const row = racerRows.get(racer.name);
    row.classList.toggle('is-player', !!racer.player);
    row.children[0].textContent = String(i + 1);
    row.children[2].textContent = racer.player ? L['hud.you'] : racer.name; // 'YOU' stays the row key
    row.children[3].textContent = racer.player ? L['hud.you'] : `${racer.distance >= car.distance ? '+' : '−'}${Math.abs(racer.distance - car.distance).toFixed(0)} m`;
  });
  speedTicks.forEach((tick, i) => tick.classList.toggle('active', i / 24 < car.speed / 102));
}

try {
  world = createWorld($('#world'));
  showHomeStatus(); // the daily card can start a race now
  world.configureVFX(visual);
  world.previewAppearance(PAINTS[equippedPaint]);
  window.addEventListener('resize', world.resize);
  let previousTime = performance.now();
  let accumulator = 0;
  let hudElapsed = 0;
  let wasCalm = calmMotion();
  const perfOverlay = new URLSearchParams(location.search).has('perf') && document.body.appendChild(Object.assign(document.createElement('output'), { id: 'perf-overlay', className: 'perf-overlay' }));
  const perfFrames = [];
  let perfShownAt = 0;
  function frame(now) {
    const rawDelta = (now - previousTime) / 1000;
    previousTime = now;
    const dt = Math.max(0, Math.min(rawDelta, 0.05));
    // The 0.05s clamp already keeps a tab-switch gap from becoming unseen racing (hiding also pauses);
    // never drop slow frames outright, or a device rendering under 4 fps stops advancing at all.
    accumulator += dt;
    const input = controls.read();
    if (tutorial) {
      if (!['throttle', 'brake'].includes(tutorial.step) && !input.brake) input.throttle = true;
    } else if (autoThrottle && !input.brake) input.throttle = true;
    input.laneAssist = tutorial ? true : autoThrottle;
    if (!tutorial && traceRace !== race) { traceRace = race; trace = []; }
    while (accumulator >= 1 / 60) {
      stepRace(race, input, 1 / 60);
      if (tutorial) {
        tutorial.update(input, 1 / 60);
        if (tutorial.complete && race.phase === 'racing') {
          race.phase = 'paused'; controls.clear();
          try { localStorage.setItem('skyline-rush-tutorial-completed', '1'); } catch { /* Practice works without storage. */ }
        }
      }
      if (!race.modifier && (race.mode === 'classic' || race.mode === 'time')) recordGhost(trace, race);
      accumulator -= 1 / 60;
    }
    const calm = calmMotion();
    // Watched per frame, not via a change listener: Chrome can drop that event when .matches is read every frame.
    if (calm && !wasCalm) stopPresentationMotion();
    wasCalm = calm;
    presentationState = presentation.update(race, dt, calm);
    const ghost = controlPrefs.ghost && !race.modifier && race.phase !== 'ready' ? race.mode === 'classic' ? ghostFor(race.trackId) : race.mode === 'time' ? modeGhostFor(race) : null : null;
    world.render(race, dt, race.phase === 'ready' ? now / 1000 : 0, input, presentationState, ghost && ghostAt(ghost, race.elapsed));
    sound.update(race);
    hudElapsed += dt;
    if (hudElapsed >= 0.075 || previousPhase !== race.phase) {
      updateUI(now / 1000, input);
      if (tutorial) renderTutorial();
      hudElapsed = 0;
    }
    if (perfOverlay && race.phase === 'racing' && rawDelta <= 0.25) {
      perfFrames.push({ at: now, ms: rawDelta * 1000 });
      while (now - perfFrames[0].at > PERF_WINDOW * 1000) perfFrames.shift();
      if (now - perfShownAt >= 500) {
        perfShownAt = now;
        const stats = frameStats(perfFrames.map(frame => frame.ms));
        perfOverlay.textContent = `FRAME p50 ${stats.p50.toFixed(1)} ms · p95 ${stats.p95.toFixed(1)} ms · ${stats.fps} fps · ${Math.round((now - perfFrames[0].at) / 1000)} s`;
      }
    }
    animationId = requestAnimationFrame(frame);
  }
  animationId = requestAnimationFrame(frame);
} catch (error) {
  ui['start-button'].disabled = true;
  $('#error-message').hidden = false;
  say($('#error-message'), () => t('error.webgl'));
  console.error('3D renderer initialization failed:', error);
  // No render loop to write the HUD: one text pass now and one per language switch (after applyLocale swaps L).
  const hudPass = () => updateUI(performance.now() / 1000, controls.read());
  hudPass(); onLocaleChange(hudPass);
}

$('#world').addEventListener('webglcontextlost', event => {
  event.preventDefault();
  if (race.phase === 'racing' || race.phase === 'countdown') pause();
  $('#error-message').hidden = false;
  say($('#error-message'), () => t('error.contextLost'));
  contextLost = true;
});
$('#world').addEventListener('webglcontextrestored', () => {
  contextLost = false;
  $('#error-message').hidden = true;
});
function beginTutorial() {
  if (!world || contextLost || (!tutorial && !['ready', 'paused'].includes(race.phase))) return;
  if (!tutorial) tutorialReturn = { race, pausedPhase, goUntil, previousFuel, previousNitro };
  closeGuide(); // marks this player as having seen the guide, even for first-start practice
  if (editingLayout) editLayout(false);
  controls.clear(); clearButtonPresses(); toggleControls(false); toggleSettings(false);
  $('#tutorial-exit').dataset.i18n = raceAfterTutorial ? 'tutorial.skip' : 'tutorial.exit';
  $('#tutorial-done').dataset.i18n = raceAfterTutorial ? 'start.race' : 'tutorial.done';
  applyI18n($('#tutorial-coach'));
  tutorial = createInteractiveTutorial(); race = tutorial.race;
  applyControls(false);
  goUntil = 0; previousFuel = 100; previousNitro = 0; previousFlight = undefined;
  document.body.dataset.tutorial = 'active';
  $('#tutorial-coach').hidden = false;
  hidePerformanceNotice();
  if (!ui.intro.hidden) leaveIntro();
  showTracks(); phaseUI(); previousPhase = race.phase;
  renderTutorial(true); focusRace();
}
function endTutorial() {
  if (!tutorial) return;
  ({ race, pausedPhase, goUntil, previousFuel, previousNitro } = tutorialReturn);
  tutorial = null; tutorialReturn = null; tutorialView = '';
  controls.clear(); clearButtonPresses();
  delete document.body.dataset.tutorial;
  applyControls(false);
  $('#tutorial-coach').hidden = true;
  for (const target of document.querySelectorAll('.tutorial-target')) target.classList.remove('tutorial-target');
  previousFlight = undefined;
  showTracks(); phaseUI(); previousPhase = race.phase; showAssist();
  (race.phase === 'paused' ? ui['resume-button'] : ui['start-button']).focus({ preventScroll: true });
  if (raceAfterTutorial) { raceAfterTutorial = false; start(); }
}
function renderTutorial(force = false) {
  if (!tutorial) return;
  $('#tutorial-progress').value = tutorial.index + (tutorial.complete ? 0 : tutorial.progress);
  const view = `${tutorial.step}/${race.phase}/${touchPreference.matches}/${inputPrefs.mode}/${controlPrefs.flyMode}`;
  if (!force && tutorialView === view) return;
  tutorialView = view;
  const step = tutorial.step;
  const done = tutorial.complete;
  const action = step === 'land' ? 'fly' : step;
  $('#tutorial-coach').dataset.step = step ?? 'complete';
  $('#tutorial-title').textContent = done ? t('tutorial.complete') : t('tutorial.step', { n: tutorial.index + 1, total: TUTORIAL_STEPS.length, action: t(step === 'land' ? 'tutorial.landTitle' : `keymap.${step}`) });
  $('#tutorial-instruction').textContent = t(done ? 'tutorial.completedCopy' : race.phase === 'paused' ? 'tutorial.paused' : `tutorial.${step}`);
  $('#tutorial-pause').textContent = t(race.phase === 'paused' ? 'tutorial.resume' : 'tutorial.pause');
  $('#tutorial-pause').hidden = done;
  $('#tutorial-complete-actions').hidden = !done;
  $('#tutorial-assist').hidden = done;
  const hint = $('#tutorial-input');
  hint.removeAttribute('data-keys'); hint.replaceChildren();
  for (const target of document.querySelectorAll('.tutorial-target')) target.classList.remove('tutorial-target');
  if (done) return;
  if (!touchPreference.matches) {
    hint.dataset.keys = action;
    showKeyMap();
  } else {
    let target = $(`#touch-controls [data-control="${action}"]`);
    let hintKey = 'tutorial.touch.' + action;
    if (['left', 'right', 'brake'].includes(step) && inputPrefs.mode === 'slide') {
      target = $('.touch-pad'); hintKey = 'tutorial.slide.' + step;
    } else if (['left', 'right'].includes(step) && inputPrefs.mode === 'tilt') hintKey = 'tutorial.tilt.' + step;
    else if (step === 'land') hintKey = controlPrefs.flyMode === 'toggle' ? 'tutorial.touch.landToggle' : 'tutorial.touch.land';
    else if (step === 'fly' && controlPrefs.flyMode === 'toggle') hintKey = 'tutorial.touch.flyToggle';
    hint.textContent = t(hintKey);
    target?.classList.add('tutorial-target');
  }
}
for (const id of ['guide-practice', 'tutorial-open', 'tutorial-retry']) $(`#${id}`).addEventListener('click', beginTutorial);
for (const id of ['tutorial-exit', 'tutorial-done']) $(`#${id}`).addEventListener('click', endTutorial);
$('#tutorial-pause').addEventListener('click', () => { pause(); renderTutorial(true); });
window.addEventListener('resize', () => { if (tutorial) renderTutorial(true); });
const guideScreen = $('#guide-screen');
guideScreen.addEventListener('keydown', event => {
  // Keep driving shortcuts inside the modal; input.js otherwise consumes Escape.
  event.stopPropagation();
  if (event.code === 'Escape') { event.preventDefault(); closeGuide(); }
});
let guideOpener;
function selectGuideDevice(device) {
  for (const button of document.querySelectorAll('[data-guide-device]')) {
    const selected = button.dataset.guideDevice === device;
    button.setAttribute('aria-pressed', String(selected));
    $(`#guide-${button.dataset.guideDevice}-panel`).hidden = !selected;
  }
}
function openGuide(opener) {
  try {
    const key = localStorage.getItem('skyline-rush-tutorial-completed') === '1' ? 'tutorial.retry' : 'tutorial.start';
    $('#guide-practice').dataset.i18n = key;
    $('#guide-practice').textContent = t(key);
  } catch { /* Keep the default invitation without storage. */ }
  guideOpener = opener;
  if (editingLayout) editLayout(false);
  controls.clear(); toggleControls(false); toggleSettings(false);
  hidePerformanceNotice();
  selectGuideDevice(touchPreference.matches ? 'mobile' : 'desktop');
  showKeyMap();
  guideScreen.showModal();
}
for (const button of document.querySelectorAll('[data-guide-device]')) button.addEventListener('click', () => selectGuideDevice(button.dataset.guideDevice));
$('#guide-open').addEventListener('click', () => openGuide(ui['controls-button']));
// The home Practice entry lands on the practice call to action; the illustrations stay one scroll above it.
$('#practice-button').addEventListener('click', ({ currentTarget }) => {
  openGuide(currentTarget);
  $('#guide-practice').focus();
});
let guideSeen = false;
try { guideSeen = localStorage.getItem('skyline-rush-guide-seen') === '1'; } catch { /* Offer practice once per page when storage is unavailable. */ }
function closeGuide() {
  guideSeen = true;
  try { localStorage.setItem('skyline-rush-guide-seen', '1'); } catch { /* Closing stays usable when storage is blocked. */ }
  guideScreen.close();
}
$('#guide-close').addEventListener('click', closeGuide);
guideScreen.addEventListener('cancel', event => { event.preventDefault(); closeGuide(); });
guideScreen.addEventListener('close', () => {
  if (tutorial) return;
  controls.clear(); guideOpener?.focus({ preventScroll: true });
});

window.addEventListener('pagehide', event => {
  // A cached page resumes the same animation, renderer and controls on back navigation.
  if (event.persisted) return;
  cancelAnimationFrame(animationId);
  previewObserver.disconnect();
  controls.destroy();
  sound.dispose();
  world?.dispose();
}, { once: true });
