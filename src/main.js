import './style.css';
import { createApp } from 'vue';
import App from './App.vue';
import { icon } from './icons.js';
import { createRace, startRace, stepRace, racePosition, sprintGaps, dailyChallenge, gapChargeWarning, RACE_TRACKS, MAX_SPEED } from './game.js';
import { createControls } from './input.js';
import { createWorld } from './world.js';
import { createSound } from './audio.js';
import { AUDIO_COOKIES, readAudio, setVolume } from './audio-settings.js';
import { vfxSettings, VFX_PRESETS } from './vfx-settings.js';
import { initialDeviceVisuals,noticeMessage,DEVICE_NOTICE_KEY,QUALITY_STORAGE_KEY } from './device-quality.js';
import { controlSettings, CONTROLS_KEY } from './control-settings.js';
import { loadKeyMap, rebind, resetKeyMap, saveKeyMap } from './key-map.js';
import { recordRace, recordBest, recordModeRace, loadHistory, loadBests, careerStats, recordMedals, loadMedals, recordStars, loadStars, starTotal,
  loadPaint, savePaint, loadGhost, saveGhost, recordDaily, loadDaily, dailyBoard, LEGACY_BEST_KEY } from './history.js';
import { recordGhost, validGhost, ghostAt } from './ghost.js';
import { createCallouts } from './callouts.js';
import { createPresentation } from './presentation.js';
import { PAINTS } from './appearance.js';
import { frameStats, PERF_WINDOW } from './perf.js';
import { createRouteMap } from './route-map.js';
import { trackName, saveLocale, resolveInitialLocale, getLocale, setLocale, onLocaleChange, applyI18n, applyDocumentLocale, t, interpolate, formatDate, CATALOGS } from './i18n.js';
import { availableTracks, availablePaints } from '@progression-access';
import { customSelect, refreshCustomSelects } from './custom-select.js';

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
let race = createRace();
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
let trace = [], traceRace = null;
let sessionDaily = loadDaily();
let daily = null; // the challenge being raced; its modifier lives on race.modifier
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
$('#aero-start').addEventListener('click', start);
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
performanceNoticeDismiss.addEventListener('click',()=>{ performanceNotice.hidden=true;});
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
  nitroMeter.setAttribute('aria-label', t('hud.nitroAria'));
  if (positionChange.dataset.direction) positionChange.setAttribute('aria-label', t(positionChange.dataset.direction === 'gained' ? 'hud.gained' : 'hud.lost'));
  previousFlight = undefined; // the next HUD tick rewrites the change-gated labels
}
onLocaleChange(applyLocale);
$('#locale-select').addEventListener('change', ({ target }) => { saveLocale(target.value); setLocale(target.value); });
function showTracks() {
  const track = RACE_TRACKS[race.trackId];
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
  ui['start-button'].disabled = !daily && !unlockedTracks.has(race.trackId);
  ui['start-button'].setAttribute('aria-describedby', 'track-note');
  $('.start-hint').hidden = ui['start-button'].disabled;
  $('#track-length').textContent = t('track.sprint', { km: track.length / 1000 });
  const tracks = Object.keys(RACE_TRACKS);
  const next = tracks[tracks.indexOf(race.trackId) + 1];
  const previous = tracks[tracks.indexOf(race.trackId) - 1];
  $('#track-note').textContent = (!daily && !unlockedTracks.has(race.trackId) ? t('track.unlockHint', { track: trackName(previous, getLocale()) }) + ' · ' : '') + t(`track.note.${race.trackId}`) + (race.config?.mode === 'classic' && next && !unlockedTracks.has(next) ? t('track.unlockNext', { track: trackName(race.trackId, getLocale()), next: trackName(next, getLocale()) }) : '');
  const mode = race.config?.mode || 'classic';
  $('#selected-race-mode').textContent = t(`mode.${mode}`);
  $('#mode-description').textContent = t(`mode.desc.${mode}`);
  $('#custom-rules').hidden = mode !== 'custom';
  $('.route-drivers').textContent = t(race.rivals.length ? 'mode.drivers' : 'mode.driver', { n: race.rivals.length + 1 });
  const startLabel = t(mode === 'free' ? 'mode.startFree' : mode === 'time' ? 'mode.startTime' : 'start.race');
  $('#start-button > span').textContent = startLabel;
  $('#start-button').setAttribute('aria-label', startLabel);
  const name = trackName(race.trackId, getLocale());
  const route = (race.modifier ? t('route.daily', { track: name, modifier: t(`modifier.${race.modifier}`) }) : name).toUpperCase();
  $('.route-heading').textContent = route;
  $('.overlay-route').textContent = `SKYLINE RUSH / ${route}`;
  $('#world').setAttribute('aria-label', t('world.aria', { track: name }));
  showGhost();
}
function showGhost() {
  const ghost = ghostFor(race.trackId);
  const track = trackName(race.trackId, getLocale());
  $('#ghost-enabled').checked = controlPrefs.ghost;
  $('#ghost-status').textContent = race.modifier ? t('ghost.daily') : ghost ? t('ghost.ready', { track, time: timeString(ghost.time) }) : t('ghost.none', { track });
}
$('#ghost-enabled').addEventListener('change', ({ target }) => { controlPrefs = controlSettings({ ...controlPrefs, ghost: target.checked }); applyControls(); });
const selectedRaceOptions = () => {
  const mode = $('#race-mode').value;
  if (mode === 'classic') return null;
  if (mode === 'time') return { mode, trafficDensity: 'off', itemsEnabled: false };
  if (mode === 'free') return { mode };
  return { mode, rivalCount: Number($('#race-rivals').value),
    aiDifficulty: $('#race-difficulty').value, trafficDensity: $('#race-traffic').value,
    collisionRule: $('#race-collision').value, itemsEnabled: $('#race-items').checked,
    ghostEnabled: $('#race-ghost').checked };
};
function chooseRaceSettings(trackId = race.trackId) {
  if (race.phase !== 'ready') return;
  controls.clear();
  race = createRace(trackId, selectedRaceOptions()); daily = null;
  leaderboardOrder = ''; previousPosition = null; goUntil = 0;
  showTracks();
}
$('#race-setup').addEventListener('change', ({ target }) => {
  if (target.matches('select, input')) { chooseRaceSettings(); sound.cue('ui'); }
});
for (const button of document.querySelectorAll('[data-track]')) button.addEventListener('click', () => {
  if (race.phase !== 'ready') return;
  chooseRaceSettings(button.dataset.track);
  sound.cue('ui');
});
$('.track-select').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault(); event.stopPropagation();
  const buttons = [...document.querySelectorAll('[data-track]:not(:disabled)')];
  const index = buttons.indexOf(document.activeElement);
  buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].focus();
});
showTracks();
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
$('#daily-start').addEventListener('click', () => {
  daily = dailyChallenge();
  historyScreen.close();
  controls.clear(); race = createRace(daily.track, daily.modifier); goUntil = 0; previousFuel = 100; previousNitro = 0;
  showTracks(); phaseUI(); previousPhase = race.phase;
  start();
});
for (const button of document.querySelectorAll('[data-open-history]')) button.addEventListener('click', () => {
  controls.clear(); historyOpener = button; $('#history-track').value = race.trackId;
  showHistory(); historyScreen.showModal();
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
  controls.clear(); race = createRace(unlockedTracks.has(race.trackId) ? race.trackId : 'coast', selectedRaceOptions()); daily = null; goUntil = 0;
  leaderboardOrder = ''; previousPosition = null;
  previousFuel = 100; previousNitro = 0;
  showTracks(); phaseUI(); previousPhase = race.phase;
  document.querySelector(`[data-track="${race.trackId}"]`).focus({ preventScroll: true });
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
  if (!world || race.phase !== 'ready' || (!daily && !unlockedTracks.has(race.trackId)) || document.querySelector('dialog[open]')) return;
  if (contextLost) { location.reload(); return; } // a fresh page is the only way back to a live renderer
  if (editingLayout) editLayout(false);
  controls.clear();
  $('#race-setup').open = false;
  leaveIntro();
  startRace(race);
  sound.cue('ui');
  focusRace();
}

function restart(trackId = race.trackId) {
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
  race = createRace(trackId, race.modifier ?? race.config);
  leaderboardOrder = ''; previousPosition = null;
  previousFuel = 100; previousNitro = 0;
  goUntil = 0;
  startRace(race);
  sound.update(race);
  focusRace();
}

function pause() {
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
  autoThrottle = !autoThrottle;
  showAssist();
  sound.cue('ui');
}

function setAudio(kind, on, level = volume[kind]) {
  volume[kind] = level;
  audio[kind] = kind === 'music' ? sound.setMusic(on, level) : sound.setEnabled(on, level);
  const name = AUDIO_COOKIES[kind];
  try {
    for (const pair of [`${name}=${audio[kind] ? 'on' : 'off'}`, `${name}-volume=${Math.round(level * 100)}`]) document.cookie = `${pair}; Max-Age=31536000; Path=/; SameSite=Lax`;
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
  ui['settings-button'].setAttribute('aria-expanded', String(open));
}

// Touch layout is tuned between races only, so the panel never opens mid-race.
function toggleControls(open = ui['controls-panel'].hidden) {
  open &&= race.phase === 'ready' || race.phase === 'paused';
  if (!open) rebinding = null;
  ui['controls-panel'].hidden = !open;
  ui['controls-button'].setAttribute('aria-expanded', String(open));
}

function applyControls(persist = true) {
  inputPrefs = { ...controlPrefs, editing: editingLayout };
  const touch = ui['touch-controls'];
  touch.dataset.steerMode = controlPrefs.mode;
  touch.dataset.hand = controlPrefs.hand;
  touch.style.setProperty('--touch-scale', String(TOUCH_SCALE[controlPrefs.size]));
  touch.style.setProperty('--touch-opacity', String(controlPrefs.opacity));
  controls.setFlyMode(controlPrefs.flyMode);
  $('#tilt-enable').hidden = controlPrefs.mode !== 'tilt';
  if (controlPrefs.mode !== 'tilt') { controls.setTilt(false); tiltGranted = false; clearTimeout(tiltTimeout); }
  for (const button of touchButtons) {
    const point = controlPrefs.layout[button.dataset.control];
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
let gestured = false;
function unlockAudio(event) {
  if (event) {
    gestured = true;
    $('#music-prompt').hidden = true;
  }
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

const controls = createControls(window, action => {
  if (document.querySelector('dialog[open]')) { controls.clear(); return; }
  if (action === 'pause') toggleSettings(false);
  if (action === 'pause') $('#vfx-panel').open = false;
  if (action === 'pause') toggleControls(false);
  ({ start, restart, pause, sound: toggleSound, camera: changeCamera, assist: toggleAssist, airflow: toggleAirflow })[action]?.();
}, { getSettings: getControlSettings, getKeyMap: () => keyMap, onTilt: () => {
  if (tiltSeen) return;
  tiltSeen = true; clearTimeout(tiltTimeout);
  say($('#tilt-status'), () => t('tilt.ready'));
} });
const pad = $('.touch-pad');
controls.bindSlidePad(pad, { getSettings: getControlSettings });
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
  for (const keys of document.querySelectorAll('.intro-controls [data-keys]')) {
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
document.addEventListener('click', event => {
  if (!event.target.closest('.controls-menu')) toggleControls(false);
});
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
for (const type of ['click', 'keydown']) window.addEventListener(type, unlockAudio, { capture: true });
// Try autoplay; where the browser blocks it, ask instead. The answer is itself the unlocking gesture.
unlockAudio();
setTimeout(() => { $('#music-prompt').hidden = gestured || !audio.music || sound.running(); }, 600);
$('#music-yes').addEventListener('click', () => setAudio('music', true));
$('#music-no').addEventListener('click', () => setAudio('music', false));
document.querySelectorAll('[data-control]').forEach(button => controls.bindButton(button, button.dataset.control));
ui['start-button'].addEventListener('click', start);
$('#exit-free').addEventListener('click', chooseTrack);
ui['restart-button'].addEventListener('click', () => restart());
ui['again-button'].addEventListener('click', () => restart());
$('#next-button').addEventListener('click', ({ currentTarget }) => { restart(currentTarget.dataset.next); showTracks(); });
ui['pause-button'].addEventListener('click', pause);
ui['resume-button'].addEventListener('click', pause);
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
document.addEventListener('click', event => {
  if (!event.target.closest('.settings')) toggleSettings(false);
});
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
});

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
  if (phase === 'paused') {
    $('#exit-free').hidden = race.config?.mode !== 'free';
    $('#new-best').hidden = true;
    enter($('.overlay-content'), 'translateY(12px)');
    ui['resume-button'].hidden = race.endOfRoute;
    $('#next-button').hidden = true;
    ui['result-stats'].hidden = true;
    $('#result-style').hidden = true;
    $('#result-links').hidden = true;
  } else if (phase === 'finished') {
    controls.clear();
    $('#exit-free').hidden = true;
    const official = race.config?.mode === 'classic';
    const medals = official && !race.modifier ? recordMedals(race.result).filter(id => !sessionMedals[id]) : []; // history.js swallows storage failures
    sessionMedals = { ...sessionMedals, ...Object.fromEntries(medals.map(id => [id, new Date().toISOString()])) };
    const trackId = race.trackId ?? 'coast';
    let best, record;
    $('#next-button').hidden = true;
    if (race.modifier) {
      const run = recordDaily(daily, race);
      sessionDaily = [...sessionDaily, run].slice(-50);
      const board = dailyBoard(sessionDaily, daily.id);
      best = board[0].time; record = board[0] === run;
    } else if (!official) {
      ({ best, record } = recordModeRace(race));
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
    $('#result-style').hidden = !official;
    $('#result-links').hidden = false;
    lastResult = { race, best, record, medals };
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
    ui['overlay-title'].textContent = t(race.endOfRoute ? 'mode.endTitle' : 'overlay.pausedTitle');
    ui['overlay-copy'].textContent = t(race.endOfRoute ? 'mode.endCopy' : 'overlay.pausedCopy');
  }
  if (phase !== 'finished' || lastResult?.race !== race) return;
  const { best, record, medals } = lastResult;
  const { result } = race;
  if (!$('#next-button').hidden) $('#next-track').textContent = trackName($('#next-button').dataset.next, getLocale());
  ui['overlay-title'].textContent = t(race.config?.mode === 'time' ? 'mode.timeComplete' : race.config?.mode === 'custom' ? 'mode.customComplete' : result.position === 1 ? 'overlay.winTitle' : 'overlay.finishTitle');
  ui['overlay-copy'].textContent = (race.config?.mode === 'classic' ? t(record ? 'overlay.recordCopy' : 'overlay.againCopy') : t('mode.unrankedFinish')) + t('overlay.summary', { near: result.nearMisses, contacts: result.collisions })
    + (medals.length ? t('overlay.medal', { list: medals.map(id => t(`medal.${id}`)).join(t('list.separator')) }) : '');
  ui['result-stats'].innerHTML = `<div><span>${t('race.position')}</span><strong>${result.position}<small> / ${race.rivals.length + 1}</small></strong></div><div><span>${t('result.yourTime')}</span><strong>${timeString(race.elapsed)}</strong></div><div><span>${t('result.best')}</span><strong>${timeString(best)}</strong></div>`;
  $('#result-style').setAttribute('aria-label', t('result.starsAria', { n: result.stars }));
  $('#result-style').innerHTML = `<div class="style-stars" aria-hidden="true">${Array.from({ length: 3 }, (_, i) => `<span class="${i < result.stars ? 'earned' : ''}">${icon('star')}</span>`).join('')}</div><strong>${t('result.style', { score: result.score })}</strong><small>${t('result.styleHelp')}<br>${t('result.styleStars', { two: race.length * 0.25, three: race.length * 0.5 })}</small>`;
  resultCounts = [
    { element: ui['result-stats'].children[1].querySelector('strong'), value: race.elapsed, format: timeString },
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
  if (race.config?.mode === 'free' && race.endOfRoute && race.phase === 'racing') pause();
  const car = race.player;
  const impactAge = car.impact ? race.elapsed - car.impact.time : 10;
  const calm = visual.comfortable || reducedMotion.matches;
  const flying = car.altitude > 0.25;
  ui.speed.textContent = String(Math.round(car.speed * 3.6));
  speedNeedle.style.transform = `rotate(${-70 + Math.min(1, car.speed / (MAX_SPEED + 30)) * 140}deg)`;
  $('#position-total').textContent = `/ ${String(race.rivals.length + 1).padStart(2, '0')}`;
  const position = racePosition(race);
  if (previousPosition !== position) {
    ui.position.textContent = String(position).padStart(2, '0');
    if (previousPosition !== null && race.phase === 'racing') {
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
  ui['fuel-value'].textContent = String(Math.round(car.fuel));
  ui['fuel-fill'].style.transform = `scaleX(${car.fuel / 100})`;
  ui['fuel-meter'].setAttribute('aria-valuenow', String(Math.round(car.fuel)));
  ui['fuel-meter'].setAttribute('aria-valuetext', `${car.fuel < 20 ? L['hud.lowCharge'] : ''}${Math.round(car.fuel)}%`);
  ui['fuel-meter'].dataset.refilling = String(race.phase === 'racing' && car.fuel > previousFuel && car.fuel < 100);
  previousFuel = car.fuel;
  $('#style-score').textContent = interpolate(L['hud.style'], { n: Math.floor(car.score) });
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
  if (race.config?.mode !== 'free' && race.phase === 'racing' && car.distance >= length - 500) {
    const { ahead, behind } = sprintGaps(race);
    status = `${L['hud.final']}${ahead !== null ? ` · +${Math.round(ahead)} m` : ''}${behind !== null ? ` · −${Math.round(behind)} m` : ''}`;
  }
  ui['race-status'].textContent = status;
  const gapWarning = race.phase === 'racing' ? gapChargeWarning(race) : null;
  ui['driving-message'].textContent = race.phase !== 'racing' || impactAge < 1.1 ? '' : input.fly && car.speed < 18 ? L['hud.reachLiftOff'] : car.exhausted && input.fly ? L['hud.releaseRecharge']
    : gapWarning ? interpolate(L['hud.gapCharge'], { n: Math.ceil(gapWarning.need) }) : '';
  if (gapWarning) ui['driving-message'].dataset.tone = 'warning'; else delete ui['driving-message'].dataset.tone;
  const racers = [{ name: 'YOU', distance: car.distance, player: true }, ...race.rivals].sort((a, b) => b.distance - a.distance);
  for (const [name, row] of racerRows) row.hidden = !racers.some(racer => racer.name === name);
  const order = racers.map(racer => racer.name).join(',');
  if (calm || race.phase !== 'racing') leaderboardRows.forEach(row => row.getAnimations().forEach(animation => animation.cancel()));
  if (order !== leaderboardOrder) {
    // FLIP reads geometry only on a rank change, with all reads batched before writes.
    const before = !calm && race.phase === 'racing' && leaderboardOrder ? new Map(leaderboardRows.map(row => [row, row.getBoundingClientRect().top])) : null;
    leaderboardRows.forEach(row => row.getAnimations().forEach(animation => animation.cancel()));
    ui.leaderboard.append(...racers.map(racer => racerRows.get(racer.name)));
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
    // Discard background gaps; do not turn a tab switch into seconds of unseen racing.
    accumulator += rawDelta > 0.25 ? 0 : dt;
    const input = controls.read();
    if (autoThrottle && !input.brake) input.throttle = true;
    input.laneAssist = autoThrottle;
    if (traceRace !== race) { traceRace = race; trace = []; }
    while (accumulator >= 1 / 60) {
      stepRace(race, input, 1 / 60);
      if (!race.modifier && race.config?.mode === 'classic') recordGhost(trace, race);
      accumulator -= 1 / 60;
    }
    const calm = calmMotion();
    // Watched per frame, not via a change listener: Chrome can drop that event when .matches is read every frame.
    if (calm && !wasCalm) stopPresentationMotion();
    wasCalm = calm;
    presentationState = presentation.update(race, dt, calm);
    const ghost = controlPrefs.ghost && race.config?.ghostEnabled && !race.modifier && ['classic', 'time'].includes(race.config.mode) && race.phase !== 'ready' ? ghostFor(race.trackId) : null;
    world.render(race, dt, race.phase === 'ready' ? now / 1000 : 0, input, presentationState, ghost && ghostAt(ghost, race.elapsed));
    sound.update(race);
    hudElapsed += dt;
    if (hudElapsed >= 0.075 || previousPhase !== race.phase) {
      updateUI(now / 1000, input);
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
window.addEventListener('pagehide', event => {
  // A cached page resumes the same animation, renderer and controls on back navigation.
  if (event.persisted) return;
  cancelAnimationFrame(animationId);
  previewObserver.disconnect();
  controls.destroy();
  sound.dispose();
  world?.dispose();
}, { once: true });
