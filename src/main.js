import './style.css';
import { setupGarageUI } from './garage-ui.ts';
import { createHistoryView } from './history-ui.ts';
import { setupCloudUI } from './cloud-ui.ts';
import { setupGuideUI } from './guide-ui.ts';
import { setupAudioUI } from './audio-ui.ts';
import { setupControlPanels } from './controls-panels-ui.ts';
import { setupTutorialUI } from './tutorial-ui.ts';
import { updateCoachView } from './tutorial-coach-state.ts';
import { createApp } from 'vue';
import App from './App.vue';
import { icon } from './icons.ts';
import { createRace as createBareRace, startRace, stepRace, useHeldItem, dailyChallenge, RACE_TRACKS } from './game.js';
import { createControls } from './input.ts';
import { createSprintSeries } from './sprint-series.ts';
import { createCheckpointRush } from './checkpoint-rush.ts';
import { saveRecentCustom } from './recent-custom.ts';
import { createCup, cupComplete } from './championship-cup.ts';
import { createWorld } from './world.js';
import { roadObstacles } from './world-tour-scene.js';
import { createSound } from './audio.js';
import { readAudio } from './audio-settings.ts';
import { setupVfxUI } from './vfx-ui.ts';
import { createMotion } from './motion.ts';
import { setupPerformanceNotice } from './performance-notice-ui.ts';
import { createInteractiveTutorial, prepareTutorialInput, TUTORIAL_STEPS } from './interactive-tutorial.ts';
import { setupKeyMapUI, keyLabel } from './keymap-ui.ts';
import { setupTouchControlsUI } from './touch-controls-ui.ts';
import { starTotal, loadPaint, savePaint } from './history.ts';
import { recordGhost, ghostAt } from './ghost.ts';
import { createPresentation } from './presentation.ts';
import { PAINTS } from './appearance.ts';
import { createPerfOverlay } from './perf-overlay.ts';
import { setupFpsUI } from './fps-ui.ts';
import { trackPressedButtons } from './pressed-buttons.ts';
import { setupHistoryDialog } from './history-dialog-ui.ts';
import { setupPhotoUI } from './photo-ui.ts';
import { saveLocale, resolveInitialLocale, getLocale, setLocale, onLocaleChange, applyI18n, applyDocumentLocale, t, formatDate } from './i18n.ts';
import { availableTracks, availablePaints } from '@progression-access';
import { customSelect, refreshCustomSelects } from './custom-select.ts';
import { trackDropdown } from './dropdown.ts';
import { setupTrackSwipeUI } from './track-swipe-ui.ts';
import { refreshIfStale } from './update-check.ts';
import { setupReleaseNotesUI } from './release-notes-ui.ts';
import { watchCloudUser, signInToCloud, signOutOfCloud, syncCloudProgress, deleteCloudProgress, syncGoogleAccountDetails } from './cloud-save.ts';
import { loadSessionProgress, adoptProgress, progressSnapshot } from './session-progress.ts';
import { settleRace } from './race-results.ts';
import { resultView, setupResultScreen } from './result-screen.ts';
import { createRaceHud } from './race-hud.ts';
import { setupRaceSelectUI } from './race-select-ui.ts';
import { timeString } from './time-format.ts';
import { createGhostStore } from './ghost-store.ts';

/** @typedef {import('./game-types.js').RaceSnapshot} RaceSnapshot */
/** @typedef {import('./game-types.js').PlayerSnapshot} PlayerSnapshot */
/** @typedef {import('./game-types.js').RivalSnapshot} RivalSnapshot */

// mount() renders synchronously, so the DOM queries below find the App.vue markup.
createApp(App).mount('#app');
// Saved choice > system language > English; only a click on the switch persists (saveLocale below).
setLocale(resolveInitialLocale());
applyI18n(); applyDocumentLocale(); // before customSelect, so the drawn selects copy translated text
for (const select of document.querySelectorAll('select')) customSelect(select);

const $ =selector => document.querySelector(selector);
// Event messages (tilt, key map, errors) remember how to re-render, so a language switch translates the live text.
const said = new Map();
function say(element, text) { said.set(element, text); element.textContent = text(); }
const ui = Object.fromEntries(['intro', 'race-info', 'race-status', 'speed', 'position', 'timer', 'distance', 'progress-fill', 'fuel-value', 'fuel-fill', 'fuel-caption', 'fuel-meter', 'altitude', 'flight-mode', 'mode-icon', 'flight-state', 'flight-budget', 'flight-instruction', 'climb-rate', 'height-indicator', 'impact-report', 'impact-title', 'impact-loss', 'countdown', 'driving-message', 'race-overlay', 'overlay-title', 'overlay-copy', 'result-stats', 'resume-button', 'again-button', 'start-button', 'pause-button', 'restart-button', 'settings-button', 'settings-panel', 'camera-button', 'controls-button', 'controls-panel', 'touch-controls', 'leaderboard', 'speed-caption'].map(id => [id, $(`#${id}`)]));
ui['assist-button'] = $('#assist-button');
ui['skill-report'] = $('#skill-report');
const clearButtonPresses = trackPressedButtons();
const touchPreference = matchMedia('(pointer: coarse)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// World Tour scenery that reaches into the road is solid in the simulation too.
const createRace = (...args) => {
  const created = createBareRace(...args);
  created.props = roadObstacles(created.trackId);
  if (created.checkpoint && created.props.length)
    created.checkpoint = createCheckpointRush(RACE_TRACKS[created.trackId], created.props);
  return created;
};
let race = createRace();
let tutorial = null, tutorialReturn = null, raceAfterTutorial = false;
let world;
let contextLost = false; // iOS drops WebGL on lock/app switch and may never restore it
let previousPhase;
let goUntil = 0;
let { audio, volume } = readAudio();
// AUTO starts on for every device; only a player's own toggle is remembered.
const AUTO_KEY = 'skyline-rush-auto';
let autoThrottle = true;
try { autoThrottle = localStorage.getItem(AUTO_KEY) !== 'off'; } catch { /* AUTO stays on without storage. */ }
let animationId;
let pausedPhase = 'racing';
const progress = loadSessionProgress(availableTracks());
const unlockedTracks = progress.unlocked; // one Set for the session; merges add to it in place
let equippedPaint = loadPaint(availablePaints(starTotal(progress.stars)));
const ghosts = createGhostStore();
let trace = [], traceRace = null;
let daily = null; // the challenge being raced; its modifier lives on race.modifier
let sprintSeries = null; // Aggregated Custom heats; never career progress or genuine circuit laps.
let cup = null; // Three unlocked point-to-point heats, with rival points carried between heats.
let stunt = null; // Timed score run composed of explicit point-to-point heats, never fake laps.
const presentation = createPresentation();
let presentationState = presentation.update(race, 0);
let resultCounts = [];
try { ({ audio, volume } = readAudio(localStorage)); } catch { /* Audio defaults to on when storage is blocked. */ }
const sound = createSound();
const keymap = setupKeyMapUI({ clearControls: () => controls.clear(), say });
// Its action callback only runs on input, so the handlers declared further down are ready by then.
const controls = createControls(window, action => {
  if (document.querySelector('dialog[open]')) { controls.clear(); return; }
  if (action === 'pause') toggleSettings(false);
  if (action === 'pause') $('#vfx-panel').open = false;
  if (action === 'pause') toggleControls(false);
  ({ start, restart, pause, item: triggerItem, sound: toggleSound, camera: changeCamera, assist: toggleAssist, airflow: vfx.toggleAirflow })[action]?.();
}, { getSettings: () => touchUI.inputPrefs(), getKeyMap: () => keymap.getKeyMap(), onTilt: () => touchUI.onTilt() });
// Touch layout, slide pad, tilt and the Controls form live in touch-controls-ui.ts; showTracks() reads its ghost preference.
const touchUI = setupTouchControlsUI({
  controls,
  getRacePhase: () => race.phase,
  isTutorialActive: () => !!tutorial,
  say,
  cueUi: () => sound.cue('ui'),
  closeControlsPanel: () => toggleControls(false),
  refreshPhase: () => phaseUI(),
  reducedMotion,
});
const vfx = setupVfxUI({ getWorld: () => world, onAirflowShown: () => showSwipeHint(), onPanelOpen: () => notice.hide(), reducedMotion });
const calmMotion = vfx.calm;
const { motionOptions, enter } = createMotion(calmMotion);
const hud = createRaceHud({
  ui,
  getRace: () => race,
  getSprintSeries: () => sprintSeries,
  getCup: () => cup,
  getStunt: () => stunt,
  isTutorialActive: () => !!tutorial,
  getControlPrefs: () => touchUI.prefs(),
  flyKeyLabel: () => keyLabel(keymap.getKeyMap().fly[0]),
  getVisual: () => vfx.settings(),
  timeTrialGhost: race => ghosts.mode(race),
  isAutoThrottle: () => autoThrottle,
  getGoUntil: () => goUntil,
  setFly: on => controls.setFly(on),
  updatePadHint: (phase, elapsed) => touchUI.updatePadHint(phase, elapsed),
  motionOptions,
  touchPreference,
  reducedMotion,
});
function leaveIntro() {
  if (calmMotion()) return;
  ui.intro.inert = true;
  const animation = ui.intro.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-36px)' }], motionOptions('base'));
  animation.finished.catch(() => {}).then(() => { ui.intro.inert = false; ui.intro.hidden = race.phase !== 'ready'; });
}

const renderResult = setupResultScreen();

const notice = setupPerformanceNotice({ downgraded: vfx.deviceSelection.downgraded, quality: vfx.deviceSelection.settings.quality });

const { renderReleaseNotes, maybeShowReleaseNotes } = setupReleaseNotesUI({
  canOpen: () => race.phase === 'ready' && !tutorial,
  canAutoOpen: () => !!world && !document.hidden,
  beforeOpen: () => { controls.clear(); toggleControls(false); toggleSettings(false); notice.hide(); },
  afterClose: () => notice.restore(race.phase === 'ready'),
  reducedMotion,
});

// One-off re-render on a language switch (never per frame); world.js repaints its road signs via its own onLocaleChange.
function applyLocale() {
  const locale = getLocale();
  applyI18n(); applyDocumentLocale();
  showTracks(); // refreshes the track buttons and History options before the drawn selects re-read them
  refreshCustomSelects();
  raceSelect.relabelRouteMaps(locale);
  if (historyDialog.isOpen()) showHistory();
  for (const [element, text] of said) element.textContent = text();
  cloud.relabel(); // Vue-owned account name/identity are localized on each language switch.
  vfx.relabel(); showAudio(); showAssist(); showGarage(); phaseText();
  syncDailyFlightControl();
  notice.refresh();
  renderReleaseNotes();
  if (tutorial) renderTutorial(true);
  hud.relabel();
}
onLocaleChange(applyLocale);
$('#locale-select').addEventListener('change', ({ target }) => { saveLocale(target.value); setLocale(target.value); });
const raceSelect = setupRaceSelectUI({
  ui,
  getRace: () => race,
  setRace: next => { race = next; },
  getDaily: () => daily,
  clearDaily: () => { daily = null; },
  createRace,
  unlockedTracks,
  ghostFor: race => ghosts.forRace(race),
  ghostEnabled: () => touchUI.prefs().ghost,
  showHomeStatus: () => showHomeStatus(),
  refreshPhase: () => phaseUI(),
  clearControls: () => controls.clear(),
  cueUi: () => sound.cue('ui'),
  reducedMotion,
});
const { showTracks, centerSelectedTrack, selectedRace, cupCount } = raceSelect;
$('#ghost-enabled').addEventListener('change', ({ target }) => touchUI.setGhost(target.checked));
// The first showTracks() calls showHomeStatus(), so initialize this controller first.
// Its callbacks read live session data rather than capturing an old snapshot.
const { showHistory, showHomeStatus } = createHistoryView({
  getData: () => ({ sessionHistory: progress.history, sessionModeHistory: progress.modeHistory, sessionBests: progress.bests,
    sessionDaily: progress.daily, sessionMedals: progress.medals, world }),
  timeString,
});
showTracks(); centerSelectedTrack();
refreshCustomSelects(); // showTracks just localized the History options the drawn select copied at construction

const currentProgress = () => progressSnapshot(progress);
// Cloud Save lives in cloud-ui.ts; this boundary owns the session copies it merges into.
const cloud = setupCloudUI({
  services: { watchCloudUser, signInToCloud, signOutOfCloud, syncCloudProgress, deleteCloudProgress, syncGoogleAccountDetails },
  getProgress: currentProgress,
  applyProgress: merged => {
    adoptProgress(progress, merged);
    showTracks();
    if (historyDialog.isOpen()) showHistory();
    showGarage();
  },
});

const previewObserver = new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.dataset.visible = String(entry.isIntersecting);
}, { root: $('.track-select') });
document.querySelectorAll('.track-preview').forEach(preview => previewObserver.observe(preview));

function startDaily() {
  daily = dailyChallenge();
  raceSelect.selectClassic();
  historyDialog.close();
  controls.clear(); race = createRace(daily.track, daily.modifier); goUntil = 0; hud.resetMemory();
  showTracks(); phaseUI(); previousPhase = race.phase;
  start();
}
for (const id of ['daily-start', 'daily-card-start']) $(`#${id}`).addEventListener('click', startDaily);
const historyDialog = setupHistoryDialog({
  getTrackId: () => race.trackId,
  showHistory: () => showHistory(),
  clearControls: () => controls.clear(),
  calm: calmMotion,
  motionOptions,
});
const { showGarage } = setupGarageUI({
  getWorld: () => world,
  canOpen: () => race.phase === 'ready',
  clearControls: () => controls.clear(),
  getEquippedPaint: () => equippedPaint,
  setEquippedPaint: id => { equippedPaint = id; savePaint(id); },
  getStars: () => starTotal(progress.stars),
});
function chooseTrack() {
  if (tutorial) { endTutorial(); return; }
  controls.clear(); sprintSeries = null; cup = null; stunt = null; race = selectedRace(unlockedTracks.has(race.trackId) ? race.trackId : 'coast'); daily = null; goUntil = 0;
  hud.resetMemory();
  showTracks(); phaseUI(); previousPhase = race.phase;
  document.querySelector(`[data-track="${race.trackId}"]`).focus({ preventScroll: true });
  centerSelectedTrack();
}
$('#choose-track').addEventListener('click', chooseTrack);

const { showSwipeHint, cancelSwipe } = setupTrackSwipeUI({
  getRace: () => race,
  getWorld: () => world,
  selectedRace,
  calmMotion,
  motionOptions,
  isTutorialActive: () => !!tutorial,
  isEditingLayout: () => touchUI.isEditing(),
  touchMatches: () => touchPreference.matches,
});
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

const { showAudio, toggleSound } = setupAudioUI({ audio, volume, sound });

// Driving keys are ignored while a form control has focus, so hand the keyboard back to the race.
function focusRace() {
  $('#vfx-panel').open = false;
  document.activeElement?.blur();
}

function start() {
  if (tutorial) return;
  if (raceSelect.selectedMode() === 'cup' && unlockedTracks.size < cupCount()) return;
  if (!world || race.phase !== 'ready' || (!daily && !unlockedTracks.has(race.trackId)) || document.querySelector('dialog[open]')) return;
  if (contextLost) { location.reload(); return; } // a fresh page is the only way back to a live renderer
  // First Start presents the live practice; Skip / completion returns to this selected race.
  if (!hasSeenGuide()) { raceAfterTutorial = true; beginTutorial(); sound.cue('ui'); return; }
  if (touchUI.isEditing()) touchUI.editLayout(false);
  controls.clear();
  cup = race.mode === 'cup' && unlockedTracks.size >= cupCount() ? createCup([...unlockedTracks],race.trackId,cupCount()) : null;
  stunt = race.mode === 'stunt' ? { duration:race.config.duration, elapsed:0, score:0, heats:0, maxCombo:0, airTime:0, trackId:race.trackId } : null;
  sprintSeries = race.mode === 'custom' && race.config.stages ? createSprintSeries(race.config.stages) : null;
  if (race.mode === 'custom') saveRecentCustom(undefined, race.trackId, race.config);
  raceSelect.rememberTrack(race.trackId);
  leaveIntro();
  startRace(race);
  sound.cue('ui');
  focusRace();
}

function restart(trackId = race.trackId) {
  if (tutorial) { beginTutorial(); return; }
  if (!world || (!daily && !unlockedTracks.has(trackId))) return;
  if (contextLost) { location.reload(); return; }
  if (touchUI.isEditing()) touchUI.editLayout(false);
  controls.clear();
  const wipe = $('#race-wipe');
  wipe.getAnimations().forEach(animation => animation.cancel());
  wipe.hidden = calmMotion();
  if (!wipe.hidden) {
    const animation = wipe.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)', offset: 0.45 }, { transform: 'translateX(100%)' }], motionOptions('slow'));
    animation.finished.catch(() => {}).then(() => { if (!wipe.getAnimations().length) wipe.hidden = true; });
  }
  race = createRace(trackId, race.modifier ?? (race.mode === 'classic' ? null : race.config), race.session.presentation);
  if (stunt && race.mode === 'stunt') race.stuntLimit = Math.max(.01, stunt.duration - stunt.elapsed);
  hud.resetMemory();
  goUntil = 0;
  startRace(race);
  sound.update(race);
  focusRace();
}

function pause() {
  if (tutorial?.complete) return;
  if (touchUI.isEditing()) touchUI.editLayout(false);
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
  try { localStorage.setItem(AUTO_KEY, autoThrottle ? 'on' : 'off'); } catch { /* The toggle lasts for this page without storage. */ }
  showAssist();
  sound.cue('ui');
}

const { toggleSettings, toggleControls } = setupControlPanels({
  getRacePhase: () => race.phase,
  clearRebinding: () => keymap.cancelRebinding(),
  hidePerformanceNotice: () => notice.hide(),
  trackDropdown,
});

function changeCamera() {
  if (!world) return;
  sound.cue('ui');
  const mode = world.cycleCamera();
  ui['camera-button'].setAttribute('aria-pressed', String(mode === 1));
}

function triggerItem() {
  if (useHeldItem(race)) sound.cue('pickup');
}
$('#activate-item').addEventListener('click', triggerItem);
showAssist();
ui['controls-button'].addEventListener('click', () => { toggleControls(); sound.cue('ui'); });
// Capture phase so Escape only closes the panel and never reaches input.js as a pause/resume.
document.addEventListener('keydown', event => {
  if (touchUI.isEditing() && event.code === 'Escape') {
    event.preventDefault(); event.stopImmediatePropagation(); touchUI.editLayout(false); return;
  }
  if (keymap.handleRebindKey(event)) return;
  if (event.code !== 'Escape' || ui['controls-panel'].hidden) return;
  event.preventDefault();
  event.stopPropagation();
  toggleControls(false);
  ui['controls-button'].focus({ preventScroll: true });
}, { capture: true });
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
setupPhotoUI({ getRace: () => race, getWorld: () => world, cue: name => sound.cue(name) });
ui['settings-button'].addEventListener('click', () => { toggleSettings(); sound.cue('ui'); });
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
  sound.setHidden(document.hidden);
  if (document.hidden && (race.phase === 'racing' || race.phase === 'countdown')) pause();
  if (!document.hidden) pickUpNewBuild();
});
// Only refresh an idle session after reload, resume or bfcache restore; don't interrupt a race.
const pickUpNewBuild = () => refreshIfStale(() => race.phase === 'ready');
window.addEventListener('pageshow', event => { if (event.persisted) pickUpNewBuild(); });
pickUpNewBuild();

function syncDailyFlightControl() {
  const blocked = race.modifier === 'no-flight';
  controls.setFlyEnabled(!blocked);
  const button = document.querySelector('#touch-controls [data-control="fly"]');
  button.disabled = blocked;
  button.setAttribute('aria-label', t(blocked ? 'daily.flightDisabled.aria' : 'hint.fly'));
  button.title = blocked ? t('daily.flightDisabled.reason') : '';
  if (blocked) button.setAttribute('aria-pressed', 'false');
}

function phaseUI() {
  syncDailyFlightControl();
  const phase = race.phase;
  const ready = phase === 'ready';
  const overlay = phase === 'paused' || phase === 'finished';
  if (ready || overlay) clearButtonPresses();
  document.body.dataset.phase = phase;
  if (!['racing', 'countdown'].includes(phase)) touchUI.resetPad();
  if (!ready) cancelSwipe();
  ui.intro.hidden = !ready && !ui.intro.getAnimations().length;
  if (ready) { ui.intro.inert = false; ui.intro.getAnimations().forEach(animation => animation.cancel()); }
  ui['race-info'].hidden = ready;
  const editingLayout = touchUI.isEditing();
  ui['race-overlay'].hidden = !overlay || editingLayout || phase === 'finished';
  ui['touch-controls'].hidden = !editingLayout && (ready || overlay);
  ui.intro.hidden ||= editingLayout;
  ui['controls-button'].disabled = !(ready || phase === 'paused');
  if (ui['controls-button'].disabled) toggleControls(false);
  ui['pause-button'].disabled = ready || phase === 'finished';
  ui['restart-button'].hidden = ready;
  if (ready) queueMicrotask(maybeShowReleaseNotes);
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
    const settled = settleRace(race, { series: { sprintSeries, cup, stunt }, progress, ghosts, daily, trace: traceRace === race ? trace : null });
    ({ sprintSeries, cup } = settled.series);
    const { best, record, medals } = settled;
    $('#next-button').hidden = !settled.next;
    if (settled.next) $('#next-button').dataset.next = settled.next;
    $('#next-stage').hidden = !settled.intermediateStage;
    cloud.saveCloudProgress();
    showTracks();
    ui['resume-button'].hidden = true;
    ui['result-stats'].hidden = false;
    $('#new-best').hidden = !record;
    $('#result-style').hidden = race.mode !== 'classic';
    $('#result-links').hidden = false;
    lastResult = { race, best, record, medals, series: sprintSeries, cup, stunt, next: settled.next };
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
  resultCounts = renderResult(resultView(race, lastResult));
}

function updateUI(now, input) {
  raceSelect.raceRouteMap().updateDrivers([{ id: 'YOU', distance: race.player.distance, player: true }, ...race.rivals.map(r => ({ id: r.name, distance: r.distance }))]);
  if (previousPhase !== race.phase) {
    if (previousPhase === 'countdown' && race.phase === 'racing') goUntil = now + 0.8;
    phaseUI();
    if (race.phase === 'countdown' && previousPhase !== 'paused') enter(ui.countdown, 'translateY(-24px)');
    if (race.phase === 'countdown') notice.hide(); // never over the race view
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
  hud.update(now, input);
}

try {
  world = createWorld($('#world'));
  requestAnimationFrame(maybeShowReleaseNotes);
  showHomeStatus(); // the daily card can start a race now
  world.configureVFX(vfx.settings());
  world.previewAppearance(PAINTS[equippedPaint]);
  let previousTime = performance.now(), accumulator = 0, hudElapsed = 0, wasCalm = calmMotion();
  const perfOverlay = createPerfOverlay(location.search, () => world.inspectRenderLoad());
  const fps = setupFpsUI(scale => world.setRenderScale(scale));
  function frame(now) {
    const rawDelta = (now - previousTime) / 1000; previousTime = now;
    const dt = Math.max(0, Math.min(rawDelta, 0.05));
    // The 0.05s clamp already keeps a tab-switch gap from becoming unseen racing (hiding also pauses);
    // never drop slow frames outright, or a device rendering under 4 fps stops advancing at all.
    accumulator += dt;
    const input = controls.read();
    if (tutorial) prepareTutorialInput(input, tutorial.step);
    else {
      if (autoThrottle && !input.brake) input.throttle = true;
      input.laneAssist = autoThrottle;
    }
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
      if (!race.modifier && (race.mode === 'classic' || race.mode === 'time' || race.mode === 'custom')) recordGhost(trace, race);
      accumulator -= 1 / 60;
    }
    const calm = calmMotion();
    // Watched per frame, not via a change listener: Chrome can drop that event when .matches is read every frame.
    if (calm && !wasCalm) vfx.stopMotionIfCalm(); wasCalm = calm;
    presentationState = presentation.update(race, dt, calm);
    const ghost = touchUI.prefs().ghost && race.session.presentation.ghostEnabled && race.phase !== 'ready' ? ghosts.forRace(race) : null;
    const shouldRender = fps.shouldRender(now, dt, race.phase === 'racing', document.hidden);
    if (shouldRender) {
      const renderStarted = performance.now();
      world.render(race, fps.takeElapsed(), race.phase === 'ready' ? now / 1000 : 0, input, presentationState, ghost && ghostAt(ghost, race.elapsed));
      fps.completeRender(performance.now() - renderStarted);
    }
    sound.update(race);
    hudElapsed += dt; if (hudElapsed >= 0.075 || previousPhase !== race.phase) {
      updateUI(now / 1000, input); if (tutorial) renderTutorial();
      hudElapsed = 0;
    }
    perfOverlay?.record(now, rawDelta, race.phase === 'racing', shouldRender);
    animationId = requestAnimationFrame(frame);
  }
  animationId = requestAnimationFrame(frame);
} catch (error) {
  ui['start-button'].disabled = true;
  $('#error-message').hidden = false;
  say($('#error-message'), () => t('error.webgl'));
  console.error('3D renderer initialization failed:', error);
  // No render loop to write the HUD: one text pass now and one per language switch (after applyLocale relabels the HUD).
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
  if (!tutorial) tutorialReturn = { race, pausedPhase, goUntil, hud: hud.memory() };
  closeGuide(); // marks this player as having seen the guide, even for first-start practice
  if (touchUI.isEditing()) touchUI.editLayout(false);
  controls.clear(); clearButtonPresses(); toggleControls(false); toggleSettings(false);
  $('#tutorial-exit').dataset.i18n = raceAfterTutorial ? 'tutorial.skip' : 'tutorial.exit';
  $('#tutorial-done').dataset.i18n = raceAfterTutorial ? 'start.race' : 'tutorial.done';
  applyI18n($('#tutorial-coach'));
  tutorial = createInteractiveTutorial(); race = tutorial.race;
  touchUI.applyControls(false);
  goUntil = 0; hud.resetMemory(); hud.forgetFlightMode();
  document.body.dataset.tutorial = 'active';
  updateCoachView({ visible: true });
  notice.hide();
  if (!ui.intro.hidden) leaveIntro();
  showTracks(); phaseUI(); previousPhase = race.phase;
  renderTutorial(true); focusRace();
}
function endTutorial() {
  if (!tutorial) return;
  ({ race, pausedPhase, goUntil } = tutorialReturn); hud.restoreMemory(tutorialReturn.hud);
  tutorial = null; tutorialReturn = null; resetTutorialView();
  controls.clear(); clearButtonPresses();
  delete document.body.dataset.tutorial;
  touchUI.applyControls(false);
  updateCoachView({ visible: false });
  for (const target of document.querySelectorAll('.tutorial-target')) target.classList.remove('tutorial-target');
  hud.forgetFlightMode();
  showTracks(); phaseUI(); previousPhase = race.phase; showAssist();
  (race.phase === 'paused' ? ui['resume-button'] : ui['start-button']).focus({ preventScroll: true });
  if (raceAfterTutorial) { raceAfterTutorial = false; start(); }
}
const { renderTutorial, resetTutorialView } = setupTutorialUI({
  getTutorial: () => tutorial,
  getRace: () => race,
  getTouchMatches: () => touchPreference.matches,
  getInputPrefs: () => touchUI.inputPrefs(),
  getControlPrefs: () => touchUI.prefs(),
  showKeyMap: () => keymap.showKeyMap(),
});
for (const id of ['guide-practice', 'tutorial-open', 'tutorial-retry']) $(`#${id}`).addEventListener('click', beginTutorial);
for (const id of ['tutorial-exit', 'tutorial-done']) $(`#${id}`).addEventListener('click', endTutorial);
$('#tutorial-pause').addEventListener('click', () => { pause(); renderTutorial(true); });
window.addEventListener('resize', () => { if (tutorial) renderTutorial(true); });
const { closeGuide, hasSeenGuide } = setupGuideUI({
  beforeOpen: () => {
    if (touchUI.isEditing()) touchUI.editLayout(false);
    controls.clear(); toggleControls(false); toggleSettings(false);
    notice.hide();
  },
  touchMatches: () => touchPreference.matches,
  renderKeyMap: () => keymap.showKeyMap(),
  isTutorialActive: () => !!tutorial,
  clearControls: () => controls.clear(),
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
