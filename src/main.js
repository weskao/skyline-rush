import './style.css';
import { setupGarageUI } from './garage-ui.ts';
import { createHistoryView } from './history-ui.ts';
import { setupCloudUI } from './cloud-ui.ts';
import { setupGuideUI } from './guide-ui.ts';
import { setupAudioUI } from './audio-ui.ts';
import { setupControlPanels } from './controls-panels-ui.ts';
import { setupTutorialUI, updateTutorialActions } from './tutorial-ui.ts';
import { updateCoachView } from './tutorial-coach-state.ts';
import { createApp } from 'vue';
import App from './App.vue';
import { icon } from './icons.ts';
import { startRace as startSimulation, stepRace, dailyChallenge, gapChargeWarning, requestRaceReset } from './game.js';
import { createRace } from './race-factory.ts';
import { createControls } from './input.ts';
import { createSprintSeries, nextSprintGrid } from './sprint-series.ts';
import { saveRecentCustom } from './recent-custom.ts';
import { nextCupGrid, cupComplete, cupRivalVisualSeed } from './championship-cup.ts';
import { createWorld } from './world.js';
import { readAudio } from './audio-settings.ts';
import { setupVfxUI } from './vfx-ui.ts';
import { createMotion } from './motion.ts';
import { setupPerformanceNotice } from './performance-notice-ui.ts';
import { createInteractiveTutorial, prepareTutorialInput, TUTORIAL_STEPS } from './interactive-tutorial.ts';
import { setupKeyMapUI, keyLabel } from './keymap-ui.ts';
import { setupTouchControlsUI } from './touch-controls-ui.ts';
import { starTotal } from './history.ts';
import { recordGhost, ghostAt } from './ghost.ts';
import { createPresentation } from './presentation.ts';
import { updateRaceHalfwayView } from './race-halfway-view.ts';
import { equippedCar, loadCarPaint, saveCarPaint } from './car-catalog.ts';
import { createPerfOverlay } from './perf-overlay.ts';
import { setupFpsUI } from './fps-ui.ts';
import { advanceCountdown, drainSteps, skipsCountdown, SIM_STEP } from './frame-pacing.ts';
import { captureRaceMotion } from './vehicle-render-motion.js';
import { createStuntRun, stuntHeatContinues, stuntHeatLimit } from './stunt-attack.ts';
import { trackPressedButtons } from './pressed-buttons.ts';
import { setupHistoryDialog } from './history-dialog-ui.ts';
import { setupPhotoUI } from './photo-ui.ts';
import { setupAssistUI } from './assist-ui.ts';
import { saveLocale, resolveInitialLocale, getLocale, setLocale, onLocaleChange, applyI18n, applyDocumentLocale, t, formatDate } from './i18n.ts';
import { availableTracks, availablePaints, isUpcomingEnterable } from '@progression-access';
import { customSelect, refreshCustomSelects } from './custom-select.ts';
import { setupTrackSwipeUI } from './track-swipe-ui.ts';
import { refreshIfStale } from './update-check.ts';
import { setupReleaseNotesUI } from './release-notes-ui.ts';
import { watchCloudUser, signInToCloud, signOutOfCloud, syncCloudProgress, deleteCloudProgress, syncGoogleAccountDetails } from './cloud-save.ts';
import { loadSessionProgress, adoptProgress, progressSnapshot } from './session-progress.ts';
import { settleRaceAndDemo, captureWave3RaceTelemetry } from './race-results.ts';
import { deferWave3RaceStart, forgetWave3DemoAccount } from '#wave3-demo-race';
import { resultView, setupResultScreen, setupOverlayActions, animateResultCounts } from './result-screen.ts';
import { presentRaceAcquisitions } from './acquisition-race-reveal.ts';
import { renderWave3DemoResults } from './wave3-demo-results-integration.ts';
import { createRaceHud } from './race-hud.ts';
import { setupItemUI } from './item-ui.ts';
import { setupRaceSelectUI } from './race-select-ui.ts';
import { isUpcomingTrack } from './upcoming-tracks.ts';
const isUpcomingBlocked = id => isUpcomingTrack(id) && !isUpcomingEnterable(id); // the build's access module decides
import { timeString } from './time-format.ts';
import { createGhostStore } from './ghost-store.ts';
import { setupCupRecovery } from './cup-recovery-ui.ts';
import { focusRace, setupRaceNavigation } from './race-navigation-ui.ts';
import { startup } from './startup-screen.ts';
startup.step(1);
// mount() renders synchronously, so the DOM queries below find the App.vue markup.
const sound = startup.sound;
sound.setGapWarning(race => gapChargeWarning(race)?.from ?? null);
createApp(App).provide('game-audio-cue', sound.cue).provide('acquisition-garage', () => acquisitionGarage).mount('#app');
// Saved choice > system language > English; only a click on the switch persists (saveLocale below).
setLocale(resolveInitialLocale());
applyI18n(); applyDocumentLocale(); // before customSelect, so the drawn selects copy translated text
for (const select of document.querySelectorAll('select:not([data-native-select])')) customSelect(select);
const $ =selector => document.querySelector(selector);
// Event messages (tilt, key map, errors) remember how to re-render, so a language switch translates the live text.
const said = new Map();
function say(element, text) { said.set(element, text); element.textContent = text(); }
const ui = Object.fromEntries(['intro', 'race-info', 'race-status', 'speed', 'position', 'timer', 'distance', 'fuel-value', 'fuel-fill', 'fuel-caption', 'fuel-meter', 'altitude', 'flight-mode', 'mode-icon', 'flight-state', 'flight-budget', 'flight-instruction', 'climb-rate', 'height-indicator', 'impact-report', 'impact-title', 'impact-loss', 'countdown', 'driving-message', 'race-overlay', 'overlay-title', 'overlay-copy', 'result-stats', 'resume-button', 'again-button', 'start-button', 'pause-button', 'restart-button', 'settings-button', 'camera-button', 'controls-panel', 'touch-controls', 'leaderboard', 'speed-caption'].map(id => [id, $(`#${id}`)]));
ui['assist-button'] = $('#assist-button');
ui['skill-report'] = $('#skill-report');
const clearButtonPresses = trackPressedButtons();
const touchPreference = matchMedia('(pointer: coarse)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let race = createRace();
let tutorial = null, tutorialReturn = null, raceAfterTutorial = false;
let world;
let contextLost = false; // iOS drops WebGL on lock/app switch and may never restore it
let previousPhase;
let goUntil = 0;
let { audio, volume } = readAudio();
const autoAssist = setupAssistUI({ button: ui['assist-button'], cue: () => sound.cue('ui') });
let animationId;
if (import.meta.env.VITE_DIAG) import('./diag-relay.ts').then(({ startDiag }) => startDiag(window, localStorage, $('#error-message'), () => ({ phase: race.phase, track: race.trackId, mode: race.mode, quality: vfx.settings().ultra ? 'ultra' : vfx.settings().quality, audio: sound.diagnostics() }))); // diagnostic builds only; production drops the module
let pausedPhase = 'racing';
const progress = loadSessionProgress(availableTracks());
const unlockedTracks = progress.unlocked; // one Set for the session; merges add to it in place
let equippedPaint = loadCarPaint(equippedCar(), availablePaints(starTotal(progress.stars)));
const ghosts = createGhostStore();
let trace = [], traceRace = null;
let daily = null; // the challenge being raced; its modifier lives on race.modifier
let sprintSeries = null; // Aggregated Custom heats; never career progress or genuine circuit laps.
let cup = null; // Three unlocked point-to-point heats, with rival points carried between heats.
let stunt = null; // Timed score run composed of explicit point-to-point heats, never fake laps.
const presentation = createPresentation(updateRaceHalfwayView);
let presentationState = presentation.update(race, 0);
let resultCounts = [];
try { ({ audio, volume } = readAudio(localStorage)); } catch { /* Audio defaults to on when storage is blocked. */ }
const keymap = setupKeyMapUI({ clearControls: () => controls.clear(), say });
// Its action callback only runs on input, so the handlers declared further down are ready by then.
const controls = createControls(window, action => {
  if (!startup.entered || document.querySelector('dialog[open]')) { controls.clear(); return; }
  ({ start, restart, pause, item: itemUI.activate, reset: resetVehicle, sound: toggleSound, camera: changeCamera, assist: autoAssist.toggle, airflow: vfx.toggleAirflow })[action]?.();
}, { getSettings: () => touchUI.inputPrefs(), getKeyMap: () => keymap.getKeyMap(), onTilt: () => touchUI.onTilt() });
const touchUI = setupTouchControlsUI({
  controls,
  getRacePhase: () => race.phase,
  isTutorialActive: () => !!tutorial,
  say,
  cueUi: () => sound.cue('ui'),
  closeControlsPanel: () => toggleSettings(false),
  refreshPhase: () => phaseUI(),
  clearButtonPresses,
  reducedMotion,
});
const vfx = setupVfxUI({ getWorld: () => world, onAirflowShown: () => showSwipeHint(), reducedMotion, deviceSelection: startup.deviceSelection });
const calmMotion = vfx.calm;
const { motionOptions, enter } = createMotion(calmMotion);
const hud = createRaceHud({
  ui,
  getRace: () => race,
  updateItem: race => itemUI.update(race),
  getSprintSeries: () => sprintSeries,
  getCup: () => cup,
  getStunt: () => stunt,
  isTutorialActive: () => !!tutorial,
  getControlPrefs: () => touchUI.prefs(),
  flyKeyLabel: () => keyLabel(keymap.getKeyMap().fly[0]),
  getVisual: () => vfx.settings(),
  onSprintReady: sound.cue,
  timeTrialGhost: race => ghosts.mode(race),
  isAutoThrottle: autoAssist.isOn,
  getGoUntil: () => goUntil,
  waitingForScenery: () => world?.raceFramePending(race) ?? false,
  setFly: on => controls.setFly(on),
  updatePadHint: (phase, elapsed) => touchUI.updatePadHint(phase, elapsed),
  motionOptions, touchPreference, reducedMotion,
});
function leaveIntro() {
  world.resetRaceCamera(); ui['camera-button'].setAttribute('aria-pressed', 'false');
  if (calmMotion()) return;
  ui.intro.inert = true;
  const animation = ui.intro.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-36px)' }], motionOptions('base'));
  animation.finished.catch(() => {}).then(() => { ui.intro.inert = false; ui.intro.hidden = race.phase !== 'ready'; });
}
const renderResult = setupResultScreen(() => renderWave3DemoResults(race, getLocale()), () => { chooseTrack(); $('#garage-button').click(); });
const overlayActions = setupOverlayActions();
const notice = setupPerformanceNotice({ downgraded: vfx.deviceSelection.downgraded, quality: vfx.deviceSelection.settings.quality });

const { renderReleaseNotes, maybeShowReleaseNotes, finishStartupReleaseNotes } = setupReleaseNotesUI({
  canOpen: () => race.phase === 'ready' && !tutorial,
  canAutoOpen: () => startup.entered && !!world && !document.hidden,
  beforeOpen: () => { controls.clear(); toggleSettings(false); notice.hide(); },
  afterClose: () => notice.restore(race.phase === 'ready'),
  reducedMotion, startsAtStartup: !startup.entered,
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
  vfx.relabel(); showAudio(); autoAssist.show(); showGarage(); phaseText();
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
  setRace: next => { race = next; world?.preloadTrackAssets(next.trackId); },
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
  reducedMotion, getGraphics: () => ({ quality: vfx.settings().quality, ultra: vfx.settings().ultra }), onTrackChange: () => { world?.invalidateFrame(); }, showUpcoming3D: id => world?.setUpcomingTrack(id) ?? false, isUpcomingEnterable,
});
const { applyTrack, selectedRace, cupCount, focusLobbyTrack } = raceSelect;
const cupRecovery = setupCupRecovery({ unlocked: () => [...unlockedTracks], cue: () => sound.cue('ui'),
  canResume: () => !!world && race.phase === 'ready' && !contextLost && !document.querySelector('dialog[open]'),
  resume: async function resume(saved) {
    if (!await raceSelect.requireUpdated(saved.tracks[saved.results.length] ?? race.trackId) || deferWave3RaceStart(() => race.phase === 'ready' && resume(saved))) return;
    cup = saved; daily = null; sprintSeries = null; stunt = null;
    raceSelect.restoreCup(saved);
    race.rivalVisualSeed = cupRivalVisualSeed(saved);
    controls.clear(); leaveIntro(); startRace(race); focusRace(); sound.cue('ui');
  },
});
const showTracks = () => { raceSelect.showTracks(); cupRecovery.refresh(); };
$('#ghost-enabled').addEventListener('change', ({ target }) => touchUI.setGhost(target.checked));
// The first showTracks() calls showHomeStatus(), so initialize this controller first.
// Its callbacks read live session data rather than capturing an old snapshot.
const { showHistory, showHomeStatus } = createHistoryView({
  getData: () => ({ sessionHistory: progress.history, sessionModeHistory: progress.modeHistory, sessionBests: progress.bests,
    sessionDaily: progress.daily, sessionMedals: progress.medals, sessionChallengeMedals: progress.challengeMedals, world }),
  timeString,
});
showTracks();
refreshCustomSelects(); // showTracks just localized the History options the drawn select copied at construction

const currentProgress = () => progressSnapshot(progress);
// Cloud Save lives in cloud-ui.ts; this boundary owns the session copies it merges into.
const cloud = setupCloudUI({
  services: { watchCloudUser, signInToCloud, signOutOfCloud, syncCloudProgress, syncGoogleAccountDetails,
    // Invalidate trial settlements first, so one in flight cannot recreate the deleted save.
    deleteCloudProgress: uid => { forgetWave3DemoAccount(uid); return deleteCloudProgress(uid); } },
  getProgress: currentProgress, getLocalChallengeMedals: () => progress.challengeMedals,
  applyProgress: (merged, localChallengeMedals) => {
    adoptProgress(progress, merged, localChallengeMedals);
    showTracks();
    if (historyDialog.isOpen()) showHistory();
    adoptCar();
  },
});

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
const { showGarage, adoptCar, syncSkins, previewPaint, startRace, acquisitionGarage } = setupGarageUI({
  getWorld: () => world, canOpen: () => race.phase === 'ready',
  clearControls: () => controls.clear(),
  getEquippedPaint: () => equippedPaint,
  setEquippedPaint: id => { equippedPaint = id; saveCarPaint(equippedCar(), id); },
  getStars: () => starTotal(progress.stars), availablePaints, subscribeAccount: cloud.subscribeAccount, cue: sound.cue,
  startSimulation: race => startSimulation(race, true), syncProgress: cloud.syncProgress, // Free Drive waits for its first grid frame too.
});
function chooseTrack(/** @type {string | undefined} */ trackId = undefined) {
  if (tutorial) { endTutorial(false); return; }
  controls.clear(); sprintSeries = null; cup = null; stunt = null; daily = null; goUntil = 0; raceSelect.restoreLastTrack(trackId);
  hud.resetMemory();
  showTracks(); phaseUI(); previousPhase = race.phase;
  focusLobbyTrack();
}
$('#choose-track').addEventListener('click', () => chooseTrack());

const { showSwipeHint, cancelSwipe } = setupTrackSwipeUI({
  getRace: () => race,
  getWorld: () => world,
  selectedRace, applyTrack,
  getSelectedTrackId: () => raceSelect.currentTrackId(),
  calmMotion,
  motionOptions,
  isTutorialActive: () => !!tutorial,
  isEditingLayout: () => touchUI.isEditing(),
  touchMatches: () => touchPreference.matches,
});
const { resetVehicle } = setupRaceNavigation({ phase: () => race.phase, pause, clearControls: () => controls.clear(), chooseTrack, isPracticing: () => !!tutorial, requestVehicleReset: () => requestRaceReset(race) });

const { showAudio, toggleSound } = setupAudioUI({ audio, volume, sound });

async function start() {
  if (raceSelect.isUpcomingSelected() || isUpcomingBlocked(race.trackId)) return; // preview selection cannot START, including Daily/unlocked
  if (tutorial) return;
  if (raceSelect.selectedMode() === 'cup' && unlockedTracks.size < cupCount()) return;
  if (!world || race.phase !== 'ready' || (!daily && !raceSelect.canRace(race.trackId)) || document.querySelector('dialog[open]')) return;
  if (contextLost) { location.reload(); return; } // a fresh page is the only way back to a live renderer
  if (!await raceSelect.requireUpdated(race.trackId) || deferWave3RaceStart(start)) return; // refuse a stale installed track
  if (offerFirstStart()) return;
  if (touchUI.isEditing()) touchUI.editLayout(false);
  controls.clear();
  cup = race.mode === 'cup' && unlockedTracks.size >= cupCount() ? cupRecovery.start(race.trackId,cupCount()) : null;
  if (cup) race.rivalVisualSeed = cupRivalVisualSeed(cup);
  stunt = race.mode === 'stunt' ? createStuntRun(race.trackId, race.config.duration) : null;
  sprintSeries = race.mode === 'custom' && race.config.stages ? createSprintSeries(race.config.stages) : null;
  if (race.mode === 'custom') saveRecentCustom(undefined, race.trackId, race.config);
  raceSelect.rememberTrack(race.trackId);
  leaveIntro();
  startRace(race);
  sound.cue('ui');
  focusRace();
}

async function restart(trackId = race.trackId) {
  if (raceSelect.isUpcomingSelected() || isUpcomingBlocked(trackId)) return;
  if (tutorial) { beginTutorial(); return; }
  if (!world || (!daily && !raceSelect.canRace(trackId))) return;
  if (contextLost) { location.reload(); return; }
  if (!await raceSelect.requireUpdated(trackId) || deferWave3RaceStart(() => restart(trackId))) return;
  if (touchUI.isEditing()) touchUI.editLayout(false);
  controls.clear();
  const wipe = $('#race-wipe');
  const nextGrid = cup && cup.results.length && cup.tracks[cup.results.length] === trackId ? nextCupGrid(cup) : sprintSeries?.results.length ? nextSprintGrid(sprintSeries) : null;
  if (cup) cup = cupRecovery.retry(cup, trackId);
  wipe.getAnimations().forEach(animation => animation.cancel());
  wipe.hidden = calmMotion();
  if (!wipe.hidden) {
    const animation = wipe.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)', offset: 0.45 }, { transform: 'translateX(100%)' }], motionOptions('slow'));
    animation.finished.catch(() => {}).then(() => { if (!wipe.getAnimations().length) wipe.hidden = true; });
  }
  race = race.eventCourse ? raceSelect.recreate(race, trackId) : createRace(trackId, race.modifier ?? (race.mode === 'classic' ? null : race.config), race.session.presentation, nextGrid ?? undefined);
  if (cup) race.rivalVisualSeed = cupRivalVisualSeed(cup);
  if (stunt && race.mode === 'stunt') race.stuntLimit = stuntHeatLimit(stunt);
  hud.resetMemory();
  goUntil = 0;
  startRace(race);
  sound.update(race, false, world.raceFramePending(race));
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

const { toggleSettings } = setupControlPanels({
  getRacePhase: () => race.phase,
  clearRebinding: () => keymap.cancelRebinding(),
  hidePerformanceNotice: () => notice.hide(),
  restorePerformanceNotice: () => notice.restore(race.phase === 'ready'),
  clearControls: () => controls.clear(),
});

function changeCamera() {
  if (!world) return;
  sound.cue('ui');
  const mode = world.cycleCamera();
  ui['camera-button'].setAttribute('aria-pressed', String(mode === 1));
}

const itemUI = setupItemUI({ getRace: () => race, cue: name => sound.cue(name), calm: calmMotion });
autoAssist.show();
// Capture phase so Escape only closes the panel and never reaches input.js as a pause/resume.
document.addEventListener('keydown', event => {
  if (touchUI.isEditing() && event.code === 'Escape') {
    event.preventDefault(); event.stopImmediatePropagation(); touchUI.editLayout(false); return;
  }
  if (keymap.handleRebindKey(event)) return;
}, { capture: true });
document.querySelectorAll('[data-control]').forEach(button => controls.bindButton(button, button.dataset.control));
ui['start-button'].addEventListener('click', start);
ui['restart-button'].addEventListener('click', () => restart());
ui['again-button'].addEventListener('click', () => {
  if (sprintSeries) sprintSeries = createSprintSeries(sprintSeries.count);
  if (cup) { cup = cupRecovery.start(cup.tracks[0], cup.tracks.length); restart(cup.tracks[0]); }
  else if (stunt) {
    stunt = createStuntRun(stunt.trackId, stunt.duration);
    restart(stunt.trackId);
  } else restart();
});
$('#next-stage').addEventListener('click', () => {
  if (sprintSeries && race.phase === 'finished' && sprintSeries.results.length < sprintSeries.count) restart();
  else if (cup && race.phase === 'finished' && !cupComplete(cup)) restart(cup.tracks[cup.results.length]);
  else if (stunt && race.phase === 'finished' && stuntHeatContinues(stunt, race.result.endReason)) restart(stunt.trackId);
});
$('#next-button').addEventListener('click', ({ currentTarget }) => { restart(currentTarget.dataset.next); showTracks(); });
ui['pause-button'].addEventListener('click', pause);
ui['resume-button'].addEventListener('click', pause);
setupPhotoUI({ getRace: () => race, getWorld: () => world, cue: name => sound.cue(name) });
ui['settings-button'].addEventListener('click', () => { toggleSettings(); sound.cue('ui'); });
ui['camera-button'].addEventListener('click', changeCamera);
$('.toolbar').addEventListener('click', event => {
  if (event.detail > 0 && !event.target.closest('#settings-panel')) event.target.closest('button:not([role="combobox"])')?.blur();
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
  if (phase === 'racing' || phase === 'countdown') toggleSettings(false);
  ui['pause-button'].disabled = ready || phase === 'finished';
  ui['restart-button'].hidden = ready;
  if (ready) queueMicrotask(maybeShowReleaseNotes);
  if (tutorial) {
    ui['race-overlay'].hidden = phase !== 'paused'; // the shared pause screen shows how to resume
    ui['restart-button'].hidden = true;
    ui['pause-button'].disabled = tutorial.complete;
  }
  if (phase === 'paused') {
    $('#new-best').hidden = true;
    enter($('.overlay-content'), 'translateY(12px)');
    overlayActions.pause(!!tutorial, race.mode);
    ui['result-stats'].hidden = true;
    $('#result-style').hidden = true;
  } else if (phase === 'finished') {
    controls.clear();
    const settled = settleRaceAndDemo(race, { series: { sprintSeries, cup, stunt }, progress, ghosts, daily, trace: traceRace === race ? trace : null });
    ({ sprintSeries, cup } = settled.series);
    if (cup) cupRecovery.remember(cup);
    const { best, record, medals } = settled;
    overlayActions.finish(settled, race.mode);
    cloud.saveRaceProgress(settled.recorded);
    showTracks();
    ui['result-stats'].hidden = false;
    $('#new-best').hidden = !record;
    lastResult = { race, best, record, medals, challengeMedals: settled.challengeMedals, unlockedGt: settled.unlockedCars.includes('crimson-gt') || undefined, series: sprintSeries, cup, stunt, next: settled.next, settled };
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
    ui['overlay-copy'].textContent = t(tutorial ? 'tutorial.paused' : 'overlay.pausedCopy');
  }
  if (phase !== 'finished' || lastResult?.race !== race) return;
  resultCounts = renderResult(resultView(race, lastResult));
}

function updateUI(now, input) {
  raceSelect.raceRouteMap().updateDrivers([{ id: 'YOU', distance: race.player.distance, x: race.player.x, player: true }, ...race.rivals.map(r => ({ id: r.name, distance: r.distance, x: r.x }))], race.course);
  if (previousPhase !== race.phase) {
    if (previousPhase === 'countdown' && race.phase === 'racing' && !skipsCountdown(race)) goUntil = now + 0.8;
    phaseUI();
    if (race.phase === 'countdown' && previousPhase !== 'paused') enter(ui.countdown, 'translateY(-24px)');
    if (race.phase === 'countdown') notice.hide(); // never over the race view
    previousPhase = race.phase;
  }
  if (race.phase === 'finished' && presentationState.results) {
    if (ui['race-overlay'].hidden) {
      ui['race-overlay'].hidden = false;
      enter($('.overlay-content'), 'translateX(48px)', 'slow');
      overlayActions.focus();
      void presentRaceAcquisitions(race, lastResult.settled, sound.cue, calmMotion(), chooseTrack);
    }
    animateResultCounts(resultCounts, presentationState.count);
  }
  hud.update(now, input);
}
try {
  startup.step(2); world = createWorld($('#world'), vfx.settings()); world.preloadTrackAssets(race.trackId); syncSkins();
  requestAnimationFrame(maybeShowReleaseNotes);
  showHomeStatus(); // the daily card can start a race now
  previewPaint(equippedPaint);
  let previousTime = performance.now(), accumulator = 0, hudElapsed = 0, wasCalm = calmMotion();
  const perfOverlay = createPerfOverlay(location.search, () => world.inspectRenderLoad(), !!import.meta.env.VITE_DIAG);
  const fps = setupFpsUI(scale => world.setRenderScale(scale));
  let motionRace = null; const previousMotion = {}, renderMotion = { previous: previousMotion, alpha: 1 };
  function frame(now) {
    // Requested first: a frame that throws still reports its error, but never freezes the game for good.
    animationId = requestAnimationFrame(frame);
    const rawDelta = (now - previousTime) / 1000; previousTime = now;
    const dt = Math.max(0, Math.min(rawDelta, 0.05));
    if (motionRace !== race) { motionRace = race; accumulator = 0; captureRaceMotion(race, previousMotion); }
    const countingDown = race.phase === 'countdown';
    const due = drainSteps(accumulator, countingDown ? 0 : dt); accumulator = due.accumulator;
    // Count elapsed seconds after the track scene has attached and warmed on a rendered frame.
    if (countingDown && previousPhase === 'countdown' && !document.hidden && !world.raceFramePending(race)) advanceCountdown(race, Math.max(0, rawDelta));
    const input = controls.read();
    if (tutorial) prepareTutorialInput(input, autoAssist.isOn());
    else {
      if (autoAssist.isOn() && !input.brake) input.throttle = true;
      input.laneAssist = autoAssist.isOn();
    }
    if (!tutorial && traceRace !== race) { traceRace = race; trace = []; }
    for (let step = 0; step < due.steps; step++) {
      captureRaceMotion(race, previousMotion); stepRace(race, input, SIM_STEP); if (!tutorial) captureWave3RaceTelemetry(race);
      if (tutorial) {
        // Completion keeps the race live as a free cruise: pausing it froze the world and read as a crash.
        const wasComplete = tutorial.complete; tutorial.update(input, SIM_STEP);
        if (!wasComplete && tutorial.complete) {
          phaseUI(); try { localStorage.setItem('skyline-rush-tutorial-completed', '1'); } catch { /* Practice works without storage. */ }
        }
      }
      if (!race.modifier && (['classic', 'time', 'custom', 'circuit'].includes(race.mode))) recordGhost(trace, race);
    }
    const calm = calmMotion();
    // Watched per frame, not via a change listener: Chrome can drop that event when .matches is read every frame.
    if (calm && !wasCalm) vfx.stopMotionIfCalm(); wasCalm = calm;
    presentationState = presentation.update(race, dt, calm, Math.max(0, rawDelta));
    const ghost = touchUI.prefs().ghost && race.session.presentation.ghostEnabled && race.phase !== 'ready' ? ghosts.forRace(race) : null;
    const shouldRender = fps.shouldRender(now, dt, race.phase === 'racing', document.hidden);
    let drawn = false;
    if (shouldRender) {
      const renderStarted = performance.now();
      renderMotion.alpha = Math.max(0, Math.min(1, accumulator / SIM_STEP));
      try {
        drawn = world.render(race, fps.takeElapsed(), race.phase === 'ready' ? now / 1000 : 0, input, presentationState, ghost && ghostAt(ghost, race.elapsed), renderMotion);
      } catch (error) {
        if (!startup.waitingForFrame) throw error;
        startup.fail('renderer'); cancelAnimationFrame(animationId);
        console.error('First 3D frame failed:', error); return;
      }
      if (drawn && startup.waitingForFrame) {
        cancelAnimationFrame(animationId); // The opaque startup screen only needs the first lobby frame.
        startup.ready(() => { controls.clear(); sound.cue('ui'); finishStartupReleaseNotes(); animationId = requestAnimationFrame(frame); });
      }
      if (drawn) fps.completeRender(performance.now() - renderStarted);
    }
    sound.update(race, presentationState.halfwayStarted, countingDown && world.raceFramePending(race));
    hudElapsed += dt; if (hudElapsed >= 0.075 || previousPhase !== race.phase) {
      updateUI(now / 1000, input); if (tutorial) renderTutorial();
      hudElapsed = 0;
    }
    perfOverlay?.record(now, rawDelta, race.phase === 'racing', drawn);
  }
  animationId = requestAnimationFrame(frame);
} catch (error) {
  ui['start-button'].disabled = true;
  $('#error-message').hidden = false;
  say($('#error-message'), () => t('error.webgl'));
  if (startup.waitingForFrame) startup.fail('renderer');
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
  if (!startup.entered) startup.fail('renderer');
});
$('#world').addEventListener('webglcontextrestored', () => {
  contextLost = false;
  $('#error-message').hidden = true;
});
function beginTutorial(firstStart = raceAfterTutorial) {
  if (!world || contextLost || (!tutorial && !['ready', 'paused'].includes(race.phase))) return;
  raceAfterTutorial = firstStart;
  if (!tutorial) tutorialReturn = { race, pausedPhase, goUntil, hud: hud.memory() };
  closeGuide(); // marks this player as having seen the guide, even for first-start practice
  if (touchUI.isEditing()) touchUI.editLayout(false);
  controls.clear(); clearButtonPresses(); toggleSettings(false);
  updateTutorialActions(raceAfterTutorial);
  tutorial = createInteractiveTutorial(autoAssist.isOn); race = tutorial.race;
  race.phase = 'countdown'; // the same 3-2-1 → GO as a race, so equipped Launch Flare charges and bursts here too
  touchUI.applyControls(false);
  goUntil = 0; hud.resetMemory(); hud.forgetFlightMode();
  document.body.dataset.tutorial = 'active';
  updateCoachView({ visible: true });
  notice.hide();
  if (!ui.intro.hidden) leaveIntro();
  showTracks(); phaseUI(); previousPhase = race.phase;
  renderTutorial(true); focusRace();
}
function endTutorial(continueToRace) {
  if (!tutorial) return;
  ({ race, pausedPhase, goUntil } = tutorialReturn); hud.restoreMemory(tutorialReturn.hud);
  tutorial = null; tutorialReturn = null; resetTutorialView();
  controls.clear(); clearButtonPresses();
  delete document.body.dataset.tutorial; delete document.body.dataset.tutorialReward;
  touchUI.applyControls(false);
  updateCoachView({ visible: false });
  hud.forgetFlightMode();
  showTracks(); phaseUI(); previousPhase = race.phase; autoAssist.show();
  (race.phase === 'paused' ? ui['resume-button'] : ui['start-button']).focus({ preventScroll: true });
  const shouldRace = raceAfterTutorial && continueToRace;
  raceAfterTutorial = false;
  if (shouldRace) start();
}
const { renderTutorial, resetTutorialView } = setupTutorialUI({
  getTutorial: () => tutorial,
  getRace: () => race,
  getTouchMatches: () => touchPreference.matches,
  getInputPrefs: () => touchUI.inputPrefs(),
  getControlPrefs: () => touchUI.prefs(),
  isAutoOn: autoAssist.isOn,
  showKeyMap: () => keymap.showKeyMap(), getKeyMap: () => keymap.getKeyMap(), cue: name => sound.cue(name),
});
const { closeGuide, offerFirstStart } = setupGuideUI({
  beforeOpen: () => {
    if (touchUI.isEditing()) touchUI.editLayout(false);
    controls.clear(); toggleSettings(false);
    notice.hide();
  },
  getSteeringMode: () => touchUI.inputPrefs().mode,
  onPractice: beginTutorial,
  onRace: start, onPracticeExit: () => endTutorial(true),
  touchMatches: () => touchPreference.matches,
  renderKeyMap: () => keymap.showKeyMap(),
  isTutorialActive: () => !!tutorial,
  clearControls: () => controls.clear(),
});
window.addEventListener('pagehide', event => {
  // A cached page resumes the same animation, renderer and controls on back navigation.
  if (event.persisted) return;
  cancelAnimationFrame(animationId);
  raceSelect.disconnectPreviews();
  controls.destroy();
  sound.dispose();
  world?.dispose();
}, { once: true });
