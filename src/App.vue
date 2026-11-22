<script setup lang="ts">
import CollectibleIcon from './CollectibleIcon.vue';
// Vue shell owns event-driven panels; main.js keeps the legacy racing HUD and simulation loop.
// Static text carries data-i18n / data-i18n-title / data-i18n-aria-label keys; applyI18n() (src/i18n.js) fills them per locale.
// Text that main.js always rewrites before it is seen (HUD readouts, statuses, route heading) stays untagged.
import packageMeta from '../package.json' with { type: 'json' };
import { ref, onMounted, onUnmounted } from 'vue';
import { getLocale, onLocaleChange, t } from './i18n.ts';
import { wave3DemoExperience } from '#wave3-demo-race';
import Wave3CurrencyStrip from './Wave3CurrencyStrip.vue';
import { RACE_TRACKS } from './game.js';
import { UPCOMING_TRACKS } from './upcoming-tracks.ts';
import { VFX_RANGES, vfxLabelKey } from './vfx-settings.ts';
import './progress-bars.css';
import './race-loading.css';
import './touch-sprint-buttons.css';
import { MODE_ART } from './lobby-art.ts';
import './race-lobby.css';
import './dropdown-appearance.css';
import './foldable-viewport.css';
import './track-chooser.css';
import PlayerHitScreen from './PlayerHitScreen.vue';
import './road-recovery.css';
import { icons, ICON_ATTRS } from './icons.ts';
import CloseButton from './CloseButton.vue';
import GaragePanel from './GaragePanel.vue';
import GuidePanel from './GuidePanel.vue';
import ReleaseNotesPanel from './ReleaseNotesPanel.vue';
import AcquisitionReveal from './AcquisitionReveal.vue';
import GameToast from './GameToast.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { releaseView } from './release-view-state.ts';
import { setupInputModality } from './input-modality.ts';
import TutorialCoach from './TutorialCoach.vue';
import SettingsPanel from './SettingsPanel.vue';
import HudSettings from './HudSettings.vue';
import ControlsPanel from './ControlsPanel.vue';
import CircuitSettings from './CircuitSettings.vue';
import HistoryPanel from './HistoryPanel.vue';
import SignInButton from './SignInButton.vue';
import { cloudView } from './cloud-view-state.ts';
import EventLabPanel from './EventLabPanel.vue';
import { homeStatusView } from './home-status-view-state.ts';
import CupRecovery from './CupRecovery.vue';

import RacePresentation from './RacePresentation.vue';
import RaceOverlay from './RaceOverlay.vue';
import RaceHalfway from './RaceHalfway.vue';
import RaceSpeedometer from './RaceSpeedometer.vue';
import ItemRules from './ItemRules.vue';
import RaceInfo from './RaceInfo.vue';
import HomeModePreview from './HomeModePreview.vue';
import PhotoStudio from './PhotoStudio.vue';

const { version } = packageMeta;
setupInputModality();
const homeWalletLocale = ref(getLocale());
let stopWalletLocale: (() => void) | undefined;
onMounted(() => {
  homeWalletLocale.value = getLocale();
  stopWalletLocale = onLocaleChange(next => { homeWalletLocale.value = next; });
});
onUnmounted(() => stopWalletLocale?.());

const BASE_URL = import.meta.env.BASE_URL;
const LOGO_PATH = 'M4 27 18 5h13L17 27H4Zm9 6h16'; // shared by the top-bar brand and the start-screen wordmark

// Controls-panel radio groups: settings key → [legend, [value, label]...]; values must match controlSettings().
// Catalog keys: `controls.<key>` for the legend, `controls.<key>.<value>` for each option.
</script>

<template>
  <AcquisitionReveal />
  <ReleaseNotesPanel />
  <GuidePanel />
  <EventLabPanel />
  <TutorialCoach />
  <canvas id="world" aria-label="3D coastal racing highway"></canvas>
  <img id="race-frame-still" alt="" aria-hidden="true" decoding="async" />
  <HomeModePreview />
  <div id="upcoming-scene" class="upcoming-scene" hidden><img id="upcoming-scene-image" alt="" /><span id="upcoming-scene-fallback" role="status">3D preview unavailable · concept image</span></div>
  <div class="scene-shade"></div>
  <div id="race-recovery" role="status" hidden>
    <span data-i18n="hud.recoveryFall">Off the track</span>
    <span data-i18n="hud.recoveryReturn">Returning to the road</span>
    <span data-i18n="hud.recoveryAssist">Rescue assist · safe road ahead</span>
  </div>
  <PlayerHitScreen />
  <div class="speed-streaks" aria-hidden="true"><i v-for="i in 18" :style="{ '--angle': `${(i - 1) * 20 + 6}deg`, '--delay': `${-(i - 1) * 0.13}s` }"></i></div>
  <div class="flight-director" aria-hidden="true"><span data-i18n="hud.flightVector">FLIGHT VECTOR</span><svg viewBox="0 0 300 100" fill="none"><path d="M5 48h75l12 12h16m84 0h16l12-12h75M150 15v13m0 48v10M135 50h30m-15-8v16"/><path class="director-level" d="M88 20h34m56 0h34M105 80h17m56 0h17"/></svg><span class="director-climb" id="climb-rate">+0.0 M/S</span></div>
  <div class="altitude-ladder" aria-hidden="true"><span>12</span><i></i><span>06</span><i></i><span>00</span><b id="height-indicator"></b><small data-i18n="hud.altLadder">ALT / M</small></div>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Skyline Rush home" data-i18n-aria-label="nav.home">
      <svg viewBox="0 0 38 38" fill="none" aria-hidden="true"><path :d="LOGO_PATH" stroke="currentColor" stroke-width="3"/></svg>
      <span lang="en">SKYLINE<span class="brand-rush">RUSH</span></span>
    </a>
    <div class="route-heading"><span class="live-dot"></span> COASTAL EXPRESSWAY <span class="route-divider">/</span> <span>DUSK RUN</span></div>
    <nav class="toolbar" aria-label="Game controls" data-i18n-aria-label="nav.toolbar">
      <button type="button" class="icon-button home-airflow-toggle" id="home-airflow-toggle" aria-pressed="false" aria-keyshortcuts="V" title="Toggle airflow · V" data-i18n-title="aero.toggleTitle"><svg v-bind="ICON_ATTRS" v-html="icons.airflow"></svg><span data-i18n="aero.airflow">AIRFLOW</span><kbd class="key-badge" aria-hidden="true">V</kbd></button>
      <SettingsPanel>
        <template #driving><ControlsPanel /></template>
        <template #assist><button class="icon-button assist-button" id="assist-button" aria-label="Auto accelerate" data-i18n-aria-label="assist.aria" aria-pressed="false" title="Auto accelerator · F2" aria-keyshortcuts="F2"><svg v-bind="ICON_ATTRS" v-html="icons.assist"></svg><span data-i18n="assist.label">AUTO</span><kbd class="key-badge" aria-hidden="true">F2</kbd></button></template>
        <template #display>
          <button id="airflow-toggle" aria-pressed="false" aria-keyshortcuts="V" title="Toggle airflow · V" data-i18n-title="aero.toggleTitle"><svg v-bind="ICON_ATTRS" v-html="icons.airflow"></svg><span data-i18n="aero.airflow">AIRFLOW</span><kbd aria-hidden="true">V</kbd></button>
          <div id="vfx-panel">
            <div class="vfx-settings">
              <div class="vfx-heading"><span data-i18n="vfx.eyebrow">AEROSPACE / VISUAL LAB</span><strong data-i18n="vfx.headline">Shape the rush.</strong><small data-i18n="vfx.subline">Visual simulation · driving physics unchanged</small></div>
              <label><span data-i18n="vfx.enabled">Visual effects</span> <input type="checkbox" data-vfx="enabled"></label>
              <label><span data-i18n="vfx.preset">Visual style</span> <select data-vfx="preset"><option value="realistic" data-i18n="vfx.preset.realistic">Realistic</option><option value="cinematic" data-i18n="vfx.preset.cinematic">Cinematic</option><option value="extreme" data-i18n="vfx.preset.extreme">Extreme · sci-fi</option></select></label>
              <label><span data-i18n="vfx.fps">Target FPS</span> <select id="target-fps" aria-label="Target FPS" data-i18n-aria-label="vfx.fps"><option value="auto" data-i18n="vfx.fps.auto">Auto</option><option value="30">30 FPS</option><option value="60">60 FPS</option><option value="90">90 FPS</option><option value="120">120 FPS</option></select></label>
               <small data-i18n="vfx.fps.note">Auto raises rendering FPS only on sustained fast displays; 90/120 may be capped by your browser. Graphics quality stays independent.</small>
               <label><span data-i18n="vfx.quality">Quality</span> <select data-vfx="quality"><option value="low" data-i18n="vfx.quality.low">Low</option><option value="medium" data-i18n="vfx.quality.medium">Medium</option><option value="high" data-i18n="vfx.quality.high">High</option><option value="ultra" data-i18n="vfx.quality.ultra">Ultra</option></select></label>
              <label><span data-i18n="vfx.aeroMode">Aerodynamics</span> <select data-vfx="aeroMode"><option value="drag" data-i18n="vfx.aeroMode.drag">Low drag</option><option value="downforce" data-i18n="vfx.aeroMode.downforce">High downforce</option></select></label>
              <label><span data-i18n="vfx.view">Showcase camera</span> <select data-vfx="view"><option value="drive" data-i18n="vfx.view.drive">Driving camera</option><option value="front" data-i18n="vfx.view.front">Front</option><option value="rear" data-i18n="vfx.view.rear">Rear</option><option value="left" data-i18n="vfx.view.left">Left</option><option value="right" data-i18n="vfx.view.right">Right</option><option value="orbit" data-i18n="vfx.view.orbit">Orbit</option></select></label>
              <label><span data-i18n="vfx.comfortable">Comfort mode</span> <input type="checkbox" data-vfx="comfortable"></label>
              <small class="vfx-note" data-i18n="vfx.comfortNote">Comfort removes flashes, shake, afterimages and blur. System reduced-motion preferences are always respected.</small>
              <label><span data-i18n="vfx.haptics">Haptic feedback</span> <input type="checkbox" data-vfx="haptics"></label>
              <details class="vfx-tuning"><summary data-i18n="vfx.tuning">Fine tuning</summary><label v-for="([label, min, max, step], key) in VFX_RANGES" class="vfx-range"><span :data-i18n="vfxLabelKey(key)">{{ label }}</span><output :for="`vfx-${key}`"></output><input :id="`vfx-${key}`" :aria-label="String(label)" :data-i18n-aria-label="vfxLabelKey(key)" :data-vfx="key" type="range" :min="min" :max="max" :step="step"></label></details>
              <HudSettings />
              <button id="vfx-reset" data-i18n="vfx.reset">Reset visual settings</button>
            </div>
          </div>
        </template>
        <template #language>
          <select id="locale-select" aria-label="Language" data-i18n-aria-label="locale.switch"><option value="en" lang="en">English</option><option value="zh-TW" lang="zh-TW">繁體中文</option></select>
        </template>
      </SettingsPanel>
      <button class="icon-button" id="camera-button" aria-label="Change camera" data-i18n-aria-label="camera.aria" aria-pressed="false" title="Camera · C" data-i18n-title="camera.title" aria-keyshortcuts="C"><svg v-bind="ICON_ATTRS" v-html="icons.camera"></svg><kbd class="key-badge" aria-hidden="true">C</kbd></button>
      <button class="icon-button" id="restart-button" aria-label="Restart race" data-i18n-aria-label="restart.aria" title="Restart · Backspace" data-i18n-title="restart.title" aria-keyshortcuts="Backspace" hidden><svg v-bind="ICON_ATTRS" v-html="icons.restart"></svg><kbd class="key-badge" aria-hidden="true">⌫</kbd></button>
      <button type="button" class="icon-button" id="vehicle-reset-button" aria-label="Reset vehicle" data-i18n-aria-label="controls.vehicleReset" data-i18n-title="controls.vehicleResetTitle" title="Reset vehicle · R" aria-keyshortcuts="R">
        <svg v-bind="ICON_ATTRS" v-html="icons.vehicleReset"></svg><span aria-hidden="true" data-i18n="controls.vehicleResetShort">Reset</span><kbd class="key-badge" aria-hidden="true">R</kbd>
      </button>
      <button class="icon-button" id="pause-button" aria-label="Pause race" data-i18n-aria-label="pause.aria" title="Pause · Esc" data-i18n-title="pause.title" aria-keyshortcuts="Escape" disabled><svg v-bind="ICON_ATTRS" v-html="icons.pause"></svg><kbd class="key-badge" aria-hidden="true">Esc</kbd></button>
    </nav>
  </header>
  <!-- Home preview swipe (main.js): the track being swiped to, the track just chosen, or the one-time gesture hint. -->
  <div class="track-swipe" id="track-swipe" role="status" data-state=""><span class="swipe-gesture" aria-hidden="true"><i></i></span><strong id="track-swipe-name"></strong><span id="track-swipe-note"></span><span class="swipe-dots" aria-hidden="true"></span></div>
  <section class="airflow-hud" id="airflow-hud" aria-label="Airflow status" data-i18n-aria-label="aero.status" aria-hidden="true">
    <span class="aero-eyebrow" data-i18n="aero.telemetry">AERODYNAMIC TELEMETRY</span><strong data-i18n="aero.active">AIRFLOW ACTIVE</strong>
    <span id="aero-mode">LOW DRAG</span>
    <div class="aero-channels"><span><span data-i18n="aero.flow">FLOW</span> <b id="aero-flow">LAMINAR</b></span><span><span data-i18n="aero.floor">FLOOR</span> <b id="aero-floor">GROUND EFFECT</b></span><span><span data-i18n="aero.jet">JET</span> <b id="aero-jet">STANDBY</b></span></div>
    <span class="aero-disclaimer" data-i18n="aero.disclaimer">FLOW VISUALIZATION / NOT CFD</span>
  </section>

  <main>
    <details class="performance-notice" id="performance-notice" hidden>
      <summary><span id="performance-notice-title"></span></summary>
      <p id="performance-notice-text"></p>
      <button type="button" id="performance-notice-dismiss">Got it</button>
    </details>
    <section class="intro lobby-compact" id="intro" aria-label="Race setup" data-i18n-aria-label="lobby.title">
      <div class="home-intro-topbar">
        <div class="route-label"><span class="route-line"></span> <span id="track-length">5 KM SPRINT</span> <span>·</span> <span class="route-drivers"></span><button class="medal-chip cloud-chip" id="cloud-open" data-open-history="cloud" data-i18n="cloud.title">Cloud save</button><button class="medal-chip" id="medal-chip" data-open-history="medals" :aria-label="homeStatusView.medalLabel" :class="{ 'has-medals': homeStatusView.hasMedals }"><svg v-bind="ICON_ATTRS" v-html="icons.star"></svg><span id="medal-count">{{ homeStatusView.medalCount }}</span></button></div>
        <Wave3CurrencyStrip v-if="wave3DemoExperience" compact
          class="home-resource-strip" :experience="wave3DemoExperience" :locale="homeWalletLocale" />
      </div>
      <div class="lobby-setup">
      <a class="intro-wordmark" href="./" aria-label="Skyline Rush home (reload)" data-i18n-aria-label="nav.homeReload"><svg viewBox="0 0 38 38" fill="none" aria-hidden="true"><path :d="LOGO_PATH" stroke="currentColor" stroke-width="3"/></svg><span lang="en">SKYLINE <b>RUSH</b></span></a>
      <div class="lobby-race-heading">
        <img id="lobby-hero-art" alt="" decoding="async" />
        <span class="track-route-map" id="lobby-hero-map" aria-hidden="true"></span>
        <div class="lobby-track-copy"><h1 id="intro-title"><span id="lobby-hero-track"><span id="lobby-track-name"></span></span></h1><p id="lobby-race-distance" class="lobby-race-distance"></p></div>
        <button type="button" id="lobby-tracks-toggle" aria-expanded="false" aria-haspopup="dialog" aria-controls="track-chooser" aria-describedby="lobby-hero-track"><span data-i18n="track.choose">Choose track</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
        <span id="lobby-track-status" class="lobby-visually-hidden"></span>
      </div>
      <div class="race-mode-picker" id="race-mode-picker" role="group" aria-label="Game mode" data-i18n-aria-label="mode.heading">
        <div class="race-mode-heading">
          <button class="lobby-picker-toggle" id="lobby-modes-toggle" type="button" aria-expanded="false" aria-controls="lobby-mode-options"><svg v-bind="ICON_ATTRS" v-html="icons.flag"></svg><span data-i18n="lobby.mode">Mode</span><strong id="lobby-mode-name"></strong></button>
          <small id="mode-description"></small>
        </div>
        <div class="race-mode-tabs" id="lobby-mode-options">
          <button type="button" data-race-mode="classic" aria-pressed="true"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.classic"></svg><span data-i18n="mode.classic">Classic Race</span></button>
          <button type="button" data-race-mode="custom" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.custom"></svg><span data-i18n="mode.custom">Custom Race</span></button>
          <button type="button" data-race-mode="free" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.free"></svg><span data-i18n="mode.free">Free Drive</span></button>
          <button type="button" data-race-mode="time" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.time"></svg><span data-i18n="mode.time">Time Attack</span></button>
          <button type="button" data-race-mode="gauntlet" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.gauntlet"></svg><span data-i18n="mode.gauntlet">Obstacle Run</span></button>
          <button type="button" data-race-mode="checkpoint" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.checkpoint"></svg><span data-i18n="mode.checkpoint">Checkpoint Rush</span></button>
          <button type="button" data-race-mode="cup" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.cup"></svg><span data-i18n="mode.cup">Championship Cup</span></button>
          <button type="button" data-race-mode="stunt" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.stunt"></svg><span data-i18n="mode.stunt">Stunt Attack</span></button>
          <button type="button" data-race-mode="endless" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.endless"></svg><span data-i18n="mode.endless">Endless Highway</span></button>
          <button type="button" data-race-mode="circuit" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.circuit"></svg><span data-i18n="mode.circuit">Circuit Race</span></button>
          <button type="button" data-race-mode="elimination" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.elimination"></svg><span data-i18n="mode.elimination">Elimination</span></button>
          <button type="button" data-race-mode="eventlab" aria-pressed="false"><svg v-bind="ICON_ATTRS" v-html="MODE_ART.eventlab"></svg><span data-i18n="mode.eventlab">Event Lab</span></button>
        </div>
      </div>
      <p id="track-note" class="track-note"></p>
      <section class="race-mode-picker race-rules-row" id="race-rules-row" aria-labelledby="race-rules-step">
        <div class="race-rules-head"><span id="race-rules-step" data-i18n="mode.step.rules">3 · Rules</span><p class="race-rules-text"><small id="mode-rules-summary" role="status"></small><small id="mode-eligibility"></small></p><button type="button" class="text-button" id="rules-restore" data-i18n="mode.restoreDefaults">Restore defaults</button></div>
        <small id="mode-conflicts" class="mode-conflicts" role="status"></small>
        <details class="race-mode-rules" id="recent-custom" hidden>
          <summary data-i18n="mode.recent">RECENT CUSTOM SETUPS</summary>
          <div id="recent-custom-runs" class="recent-custom-runs"></div>
        </details>
        <label id="bonus-gates-rule" class="bonus-gates-rule" hidden><input type="checkbox" data-race-rule="bonusGates"> <span data-i18n="mode.bonusGates">Bonus gates · temporary boosts and double style score</span></label>
        <CircuitSettings />
        <details class="race-mode-rules" id="stunt-rules" hidden>
          <summary data-i18n="mode.stuntRules">Stunt Attack duration</summary>
          <label><span data-i18n="mode.stuntDuration">Active driving time</span>
            <select id="stunt-duration" aria-label="Stunt duration" data-i18n-aria-label="mode.stuntDuration">
              <option value="120" selected data-i18n="mode.stuntMinutes.120">2 min</option><option value="180" data-i18n="mode.stuntMinutes.180">3 min</option><option value="300" data-i18n="mode.stuntMinutes.300">5 min</option>
            </select>
          </label>
        </details>
        <details class="race-mode-rules" id="cup-rules" hidden>
          <summary data-i18n="mode.cupSettings">Championship format</summary>
          <CupRecovery />
          <label><span data-i18n="mode.cupLength">Number of unique tracks</span>
            <select id="cup-length" aria-label="Cup stages" data-i18n-aria-label="mode.cupLength">
              <option value="3" selected>3</option><option value="5">5</option>
            </select>
          </label>
        </details>
        <details class="race-mode-rules" id="time-trial-rules" hidden>
          <summary data-i18n="mode.cleanRules">Clean Time Trial</summary>
          <label><input type="checkbox" id="clean-trial"> <span data-i18n="mode.cleanDescription">No collisions allowed for a valid record</span></label>
        </details>
        <details class="race-mode-rules" id="gauntlet-rules" hidden>
          <summary data-i18n="mode.gauntletDifficulty">Obstacle intensity</summary>
          <label><span data-i18n="mode.hazardTier">Obstacle speed and spacing</span>
            <select id="hazard-tier" aria-label="Obstacle intensity" data-i18n-aria-label="mode.gauntletDifficulty">
              <option value="standard" selected data-i18n="mode.standard">Standard</option>
              <option value="extreme" data-i18n="mode.extreme">Extreme</option>
            </select>
          </label>
          <label><span data-i18n="mode.gauntletLayout">Course</span>
            <select id="gauntlet-layout" aria-label="Course" data-i18n-aria-label="mode.gauntletLayout">
              <option value="classic" selected data-i18n="mode.layoutClassic">Barriers</option>
              <option value="mixed" data-i18n="mode.layoutMixed">Mixed obstacles</option>
            </select>
          </label>
        </details>
        <details class="race-mode-rules" id="race-mode-rules" hidden>
          <summary data-i18n="mode.rules">Customize race rules</summary>
          <div class="race-presets" role="group" aria-label="Rule presets" data-i18n-aria-label="mode.presets">
            <button type="button" data-race-preset="standard" aria-pressed="true" data-i18n="mode.preset.standard">Standard</button>
            <button type="button" data-race-preset="traffic" aria-pressed="false" data-i18n="mode.preset.traffic">Traffic Rush</button>
            <button type="button" data-race-preset="noitems" aria-pressed="false" data-i18n="mode.preset.noitems">No Items</button>
            <button type="button" data-race-preset="air" aria-pressed="false" data-i18n="mode.preset.air">Air Focus</button>
            <button type="button" data-race-preset="precision" aria-pressed="false" data-i18n="mode.preset.precision">Precision</button>
          </div>
          <div class="race-mode-rule-grid">
            <label><span data-i18n="mode.rivals">AI opponents</span><select data-race-rule="rivals" aria-label="AI opponents" data-i18n-aria-label="mode.rivals"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7" selected>7</option></select></label>
            <label><span data-i18n="mode.difficulty">AI difficulty</span><select data-race-rule="difficulty" aria-label="AI difficulty" data-i18n-aria-label="mode.difficulty"><option value="easy" data-i18n="mode.easy">Easy</option><option value="normal" selected data-i18n="mode.normal">Normal</option><option value="hard" data-i18n="mode.hard">Hard</option></select></label>
            <label><span data-i18n="mode.traffic">Traffic</span><select data-race-rule="traffic" aria-label="Traffic density" data-i18n-aria-label="mode.traffic"><option value="off" data-i18n="mode.off">Off</option><option value="light" data-i18n="mode.light">Light</option><option value="normal" selected data-i18n="mode.normal">Normal</option><option value="heavy" data-i18n="mode.heavy">Heavy</option></select></label>
            <label id="sprint-stages-setting"><span data-i18n="mode.stages">Sprint stages (not laps)</span><select data-race-rule="stages" aria-label="Sprint stages (not laps)" data-i18n-aria-label="mode.stages"><option value="1" selected>1</option><option value="2">2</option><option value="3">3</option><option value="5">5</option></select></label>
            <label><span data-i18n="mode.collision">Collision penalty</span><select data-race-rule="collision" aria-label="Collision penalty" data-i18n-aria-label="mode.collision"><option value="normal" selected data-i18n="mode.normal">Normal</option><option value="relaxed" data-i18n="mode.relaxed">Relaxed</option></select></label>
            <label><span data-i18n="mode.practiceHazards">Road hazards</span><select data-race-rule="hazards" aria-label="Road hazards" data-i18n-aria-label="mode.practiceHazards"><option value="off" selected data-i18n="mode.off">Off</option><option value="standard" data-i18n="mode.standard">Standard</option><option value="extreme" data-i18n="mode.extreme">Extreme</option></select></label>
            <label><span data-i18n="mode.riskLines">High rings and close-pass bonus</span><select data-race-rule="riskLines" aria-label="High rings and close-pass bonus" data-i18n-aria-label="mode.riskLines"><option value="on" selected data-i18n="mode.on">On</option><option value="off" data-i18n="mode.off">Off</option></select></label>
            <label class="race-items"><input data-race-rule="themes" type="checkbox"> <span data-i18n="mode.themes">Themed track hazards</span></label>
            <ItemRules />
          </div>
          <RacePresentation />
        </details>
      </section>
      <!-- Reserve space for the camera controls in compact layouts. -->
      <nav class="showcase-camera-dock" id="showcase-camera-dock" aria-label="Showcase camera" data-i18n-aria-label="vfx.view">
        <span class="showcase-camera-heading" data-i18n="showcase.heading">CAMERA VIEW</span>
        <div class="showcase-camera-actions">
          <button type="button" id="showcase-camera-prev" aria-label="Previous camera view" data-i18n-aria-label="showcase.previous"><span class="showcase-dock-glyph" aria-hidden="true">‹</span><CollectibleIcon name="left" /></button>
          <span id="showcase-camera-name" role="status" aria-live="polite"></span>
          <button type="button" id="showcase-camera-next" aria-label="Next camera view" data-i18n-aria-label="showcase.next"><span class="showcase-dock-glyph" aria-hidden="true">›</span><CollectibleIcon name="right" /></button>
        </div>
        <span class="showcase-camera-dots" id="showcase-camera-dots" aria-hidden="true"></span>
      </nav>
      <section class="daily-card" id="daily-card" aria-labelledby="daily-card-title">
        <span class="daily-card-icon" aria-hidden="true"><svg v-bind="ICON_ATTRS" v-html="icons.star"></svg></span>
        <div class="daily-card-copy">
          <h2 id="daily-card-title"><button type="button" id="daily-card-open" data-open-history="daily" data-i18n="daily.title">Daily challenge</button></h2>
          <strong id="daily-card-route">{{ homeStatusView.dailyRoute }}</strong>
          <small id="daily-card-best">{{ homeStatusView.dailyBest }}</small>
        </div>
        <button class="daily-card-start" id="daily-card-start" :disabled="homeStatusView.dailyStartDisabled" aria-describedby="daily-card-route"><span data-i18n="daily.play">Play</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
      </section>
      <!-- data-keys: the actions whose bound keys showKeyMap() (main.js) draws, so remaps and the arrow / J K L alternates stay listed. -->
      <div class="intro-controls">
        <div><span class="keys" data-keys="throttle left brake right"></span><span data-i18n="hint.drive">Drive</span></div>
        <div><span class="keys" data-keys="fly"></span><span data-i18n="hint.fly">Hold to fly</span></div>
        <div><span class="keys" data-keys="boost"></span><span data-i18n="hint.boost">Boost</span></div>
        <div><span class="keys" data-keys="nitro"></span><span data-i18n="hint.nitro">Nitro</span></div>
        <div data-i18n-title="hint.resetTip" title="Return to nearby safe road; race clock continues"><kbd>R</kbd><span data-i18n="hint.reset">Reset vehicle</span></div>
        <div><kbd>V</kbd><span data-i18n="hint.airflow">Airflow</span></div>
      </div>
      <p class="flight-tip"><span class="tip-full" data-i18n="intro.tip">Build speed to lift off. Release to land. Recharge on the road. AUTO holds the accelerator; you steer and brake.</span><span class="tip-short" data-i18n="intro.tipShort">Build speed to fly, release to land. AUTO holds the throttle.</span></p>
      </div>
      <div class="intro-actions">
        <p id="lobby-access-note" role="status" hidden></p>
        <div class="intro-primary"><button class="primary-button" id="start-button" aria-label="Start race" data-i18n-aria-label="start.race"><span data-i18n="start.race">Start race</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
        <button type="button" class="text-button garage-button" id="garage-button"><img class="lobby-action-art" :src="`${BASE_URL}feature-assets/race-lobby/nav-garage@3x.webp`" width="24" height="24" alt="" draggable="false"><span data-i18n="nav.garage">Garage</span><span class="garage-new-tag" lang="en" aria-hidden="true">NEW</span></button></div>
        <button type="button" class="text-button history-button" data-open-history><img class="lobby-action-art" :src="`${BASE_URL}feature-assets/race-lobby/nav-progress@3x.webp`" width="24" height="24" alt="" draggable="false"><span data-i18n="nav.progress">Progress</span></button>
        <button type="button" class="text-button practice-button" id="practice-button"><img class="lobby-action-art" :src="`${BASE_URL}feature-assets/race-lobby/nav-practice@3x.webp`" width="24" height="24" alt="" draggable="false"><span data-i18n="nav.practice">Practice</span></button>
        <span class="start-hint"><span data-i18n="start.hint">or press</span> <kbd>ENTER</kbd></span>
      </div>
    </section>

    <RaceInfo />

    <div class="countdown" id="countdown" role="status" aria-live="polite" hidden><div class="start-lights" aria-hidden="true"><i></i><i></i><i></i></div><strong id="countdown-number">3</strong><div class="race-loading-rail" aria-hidden="true"></div><span id="countdown-label">HOLD ACCELERATOR · GET READY</span></div>
    <div class="event-callout" id="event-callout" role="status" aria-live="polite" aria-atomic="true" hidden>
      <div id="maneuver-report" hidden></div><div id="skill-report" hidden></div><div id="action-report" hidden></div>
    </div>
    <div class="driving-message" id="driving-message" role="status"></div>
    <div class="impact-report" id="impact-report" role="status" hidden>
      <span class="impact-icon" id="impact-brake-icon"><svg v-bind="ICON_ATTRS" v-html="icons.brake"></svg></span>
      <span class="impact-icon" id="impact-protection-icon" hidden><svg v-bind="ICON_ATTRS" v-html="icons.shield"></svg></span>
      <div><strong id="impact-title"></strong><span id="impact-detail"><b id="impact-loss">0</b> <span data-i18n="impact.lost">KM/H LOST</span></span></div>
    </div>

    <RaceHalfway />
    <RaceOverlay />
    <div id="error-message" class="error-message" role="alert" hidden></div>
  </main>
  <dialog id="track-chooser" class="track-chooser" aria-labelledby="track-chooser-title">
    <header class="track-chooser-heading"><h2 id="track-chooser-title" data-i18n="track.choose">Choose track</h2><CloseButton id="track-choose-close" :label="homeWalletLocale === 'zh-TW' ? '關閉賽道選擇' : 'Close track selection'" /></header>
      <div class="track-select" id="lobby-track-options" role="group" aria-label="Choose track" data-i18n-aria-label="track.choose">
        <div v-for="(track, id) in RACE_TRACKS" :key="id" class="track-card-shell"><button type="button" class="track-card-select" :data-track="id" :aria-pressed="id === 'coast'">
          <i class="track-preview upcoming-thumb" :class="`preview-${id}`" aria-hidden="true"><img :src="`${BASE_URL}track-teasers/${id}.jpg`" alt="" loading="lazy" /></i>
          <span class="track-route-map" aria-hidden="true"></span><strong>{{ track.name }}</strong><span>{{ track.length / 1000 }} KM <small></small></span>
        </button><button type="button" class="track-pack-action" :data-pack-for="id" aria-label="Download track assets" hidden><svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle class="track-pack-ring-base" cx="20" cy="20" r="15.9155"/><circle class="track-pack-ring-fill" cx="20" cy="20" r="15.9155"/><g class="track-pack-download-glyph" transform="translate(8 8)"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></g><path class="track-pack-update-glyph" d="M28 15a9 9 0 1 0 1 10M28 9v7h-7"/><path class="track-pack-ready-glyph" d="m12 20 5 5 11-12"/></svg></button></div>
        <div v-for="(track, id) in UPCOMING_TRACKS" :key="id" class="track-card-shell"><button type="button" class="track-card-select upcoming-track-card" :data-upcoming-track="id" aria-pressed="false"><i class="track-preview upcoming-thumb" aria-hidden="true"><img :src="`${BASE_URL}${track.image}`" alt="" loading="lazy" /></i><span class="track-route-map" aria-hidden="true"></span><strong>{{ track.names.en }}</strong><span>{{ track.length / 1000 }} KM <small></small></span></button><button type="button" class="track-pack-action" :data-pack-for="id" aria-label="Download track assets" hidden><svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle class="track-pack-ring-base" cx="20" cy="20" r="15.9155"/><circle class="track-pack-ring-fill" cx="20" cy="20" r="15.9155"/><g class="track-pack-download-glyph" transform="translate(8 8)"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></g><path class="track-pack-update-glyph" d="M28 15a9 9 0 1 0 1 10M28 9v7h-7"/><path class="track-pack-ready-glyph" d="m12 20 5 5 11-12"/></svg></button></div>
      </div>
    <footer class="track-chooser-footer"><div aria-live="polite"><span id="track-choose-map" class="track-route-map" aria-hidden="true"></span><div><strong id="track-choose-selection"></strong><small id="track-choose-state"></small><small id="track-choose-pack-version"></small></div></div><span id="track-choose-pack-summary" role="status" aria-live="polite"></span><button type="button" id="track-choose-download-all" hidden><svg class="track-bulk-icon" viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle class="track-pack-ring-base" cx="20" cy="20" r="15.9155"/><circle class="track-pack-ring-fill" cx="20" cy="20" r="15.9155"/><g class="track-pack-download-glyph" transform="translate(8 8)" v-html="icons.download"></g><path class="track-pack-update-glyph" d="M28 15a9 9 0 1 0 1 10M28 9v7h-7"/><path class="track-pack-ready-glyph" d="m12 20 5 5 11-12"/></svg><span class="track-download-label">Download all</span></button><button type="button" id="track-choose-confirm"><span data-i18n="track.confirm">Confirm track</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button></footer>
  </dialog>
  <PhotoStudio />
  <div id="race-wipe" class="race-wipe" aria-hidden="true" hidden></div>

  <HistoryPanel />

  <GaragePanel />

  <dialog id="leave-screen" class="history-screen leave-screen" aria-labelledby="leave-title" aria-describedby="leave-copy">
    <CloseButton id="leave-close" label="Close leave race confirmation" data-i18n-aria-label="leave.close" />
    <h2 id="leave-title" data-i18n="leave.title">Leave this race?</h2>
    <p id="leave-copy" data-i18n="leave.copy">Your race is paused. If you leave now, this run won’t be saved.</p>
    <div class="leave-actions">
      <button class="primary-button" id="leave-keep" autofocus><span id="leave-keep-label" data-i18n="leave.keep">Keep racing</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
      <button class="controls-reset" id="leave-end" data-i18n="leave.end">End race · choose track</button>
      <a class="text-button" id="leave-home" href="./" data-i18n="leave.home">Back to home</a>
    </div>
  </dialog>
  <ConfirmDialog />
  <GameToast />

  <footer class="telemetry">
    <RaceSpeedometer />
    <div class="mode-indicator"><div class="mode-heading"><div class="mode-icon" id="mode-icon"><svg v-bind="ICON_ATTRS" v-html="icons.road"></svg></div><span id="flight-mode">ROAD MODE</span><span id="flight-budget">5.3s</span></div><strong id="flight-state">BUILD SPEED</strong><span class="mode-key" id="flight-instruction">REACH 65 KM/H · HOLD SPACE TO LIFT</span></div>
    <div class="flight-telemetry"><div class="altitude-stat"><span class="stat-label" data-i18n="hud.altitude">ALTITUDE</span><strong><span id="altitude">0.0</span><small>M</small></strong></div><div class="fuel-stat"><div class="fuel-heading"><span class="stat-label" data-i18n="hud.thruster">THRUSTER CHARGE</span><span><b id="fuel-value">100</b><small>%</small></span></div><div class="fuel-track" id="fuel-meter" role="meter" aria-label="Thruster charge" data-i18n-aria-label="hud.thrusterAria" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="fuel-fill"></i></div><span class="fuel-caption" id="fuel-caption">GROUND RECHARGE ACTIVE</span></div></div>
  </footer>
  <!-- TOUCH CONTROLS DOM/CSS CONTRACT — frozen; style.css builds from this, change both together.
   #touch-controls.touch-controls (shown by the existing media rules; [hidden] outside racing/countdown)
     data-steer-mode="slide|buttons|tilt"  slide: .touch-pad steers (drag sideways, pull down = brake), hide .touch-steer and the brake button
                                      buttons: .touch-steer left/right buttons steer, hide .touch-pad
                                      tilt: motion sensors steer; pad remains available for down-drag brake / drift
     data-hand="left|right"           side of the screen the steering (pad or .touch-steer) sits on; actions/pedals take the other side
     data-size="S|M|L"               chosen size; lets the live route map clear the cluster (style.css)
     style --touch-scale              0.85 (S) | 1 (M) | 1.15 (L); multiply control sizes by it
     style --touch-opacity            0.4–1; control opacity
       .touch-pad[aria-hidden]        slide surface (pointer events, touch-action:none) > .pad-ring + .pad-knob (positioned by touch-controls-ui.ts)
       .touch-steer                   button[data-control=left|right] on the steering side
       .touch-actions                 button.touch-fly[data-control=fly], button.touch-boost[data-control=boost]
       .touch-pedals                  button.touch-gas[data-control=throttle] (gas always visible, both modes)
       .touch-brake                   separate brake for the opposite thumb in Buttons mode
     button.is-held / [aria-pressed=true] while active (existing).
   Settings Driving section: #controls-panel controls remain mounted so game state and keyboard bindings stay connected.
     Inside: fieldset.controls-field > legend + label.controls-choice > input[type=radio][data-controls] + span;
     label.controls-field.controls-range > output + input[type=range][data-controls=opacity]; button#controls-reset.controls-reset. -->
  <div class="touch-controls" id="touch-controls" aria-label="Touch driving controls" data-i18n-aria-label="touch.controls" hidden>
    <div class="touch-pad" aria-hidden="true"><i class="pad-ring"></i><i class="pad-knob"></i></div>
    <div class="touch-steer"><button data-control="left" aria-label="Steer left" data-i18n-aria-label="touch.left"><svg v-bind="ICON_ATTRS" v-html="icons.left"></svg></button><button data-control="right" aria-label="Steer right" data-i18n-aria-label="touch.right"><svg v-bind="ICON_ATTRS" v-html="icons.right"></svg></button></div>
    <div class="touch-actions">
      <button class="touch-nitro" data-control="nitro" aria-label="Activate nitro" data-i18n-aria-label="touch.nitro">
        <svg viewBox="0 0 28 28" aria-hidden="true" fill="none">
          <path d="M16.7 2.5 5.8 15.4h7.3l-2 10.1L22.4 12h-7.2z" style="fill: var(--nitro-text); stroke: var(--nitro)" stroke-width="1.15" stroke-linejoin="round" />
          <path d="M6 7.5H3.8M4.8 10.5H1.7M24 18h2.2m-3.6 3h2.6" style="stroke: var(--nitro)" stroke-width="1.4" stroke-linecap="round" />
        </svg>
        <span lang="en">NITRO</span>
        <span class="sprint-ready-effect" aria-hidden="true"></span>
        <span class="sprint-ready-effect sprint-ready-flank" data-side="start" aria-hidden="true"></span>
        <span class="sprint-ready-effect sprint-ready-flank" data-side="end" aria-hidden="true"></span>
      </button>
      <button class="touch-fly" data-control="fly" aria-label="Hold to fly" data-i18n-aria-label="hint.fly"><svg v-bind="ICON_ATTRS" v-html="icons.fly"></svg><svg class="touch-fly-lock" v-bind="ICON_ATTRS" v-html="icons.lock"></svg><span lang="en">FLY</span></button>
      <button class="touch-boost" data-control="boost" aria-label="Hold to boost" data-i18n-aria-label="touch.boost">
        <svg viewBox="0 0 28 28" aria-hidden="true" fill="none">
          <path d="M11 7h4.7l6.2 7-6.2 7H11l6.2-7z" style="fill: var(--boost-text)" />
          <path d="M18.5 7H23l4 7-4 7h-4.5l5.2-7z" style="fill: var(--boost)" />
          <path d="M4.5 10h5M1 14h10m-6.5 4h5" style="stroke: var(--boost)" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span lang="en">BOOST</span>
        <span class="sprint-ready-effect" aria-hidden="true"></span>
      </button>
    </div>
    <div class="touch-pedals"><button class="touch-gas" data-control="throttle" aria-label="Accelerate" data-i18n-aria-label="touch.throttle"><svg v-bind="ICON_ATTRS" v-html="icons.pedal"></svg></button></div>
    <button class="touch-brake" data-control="brake" aria-label="Brake" data-i18n-aria-label="touch.brake"><svg v-bind="ICON_ATTRS" v-html="icons.brake"></svg></button>
  </div>
  <div class="layout-toolbar" id="layout-toolbar" hidden><div><strong id="layout-orientation" role="status"></strong><br><span data-i18n="layout.hint">Drag buttons to fit your thumbs</span></div><button id="layout-done" data-i18n="layout.done">Done editing</button></div>
  <div class="bottomline"><button type="button" id="whats-new-open" class="build-version" :hidden="releaseView.openHidden" :class="{ 'has-update': releaseView.openHasUpdate }" :aria-label="`${t('release.open', undefined, homeWalletLocale)} · v${version}`" :title="t('release.open', undefined, homeWalletLocale)"><span class="build-version-number">v{{ version }}</span><span class="build-version-separator" aria-hidden="true"></span><span class="build-version-caption" data-i18n="release.open">What's new</span><svg class="build-version-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="m5.5 3.5 4.5 4.5-4.5 4.5" /></svg><span class="release-unread" aria-hidden="true"></span></button></div>
</template>

<style scoped>
.bonus-gates-rule { display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: 12px; }
.bonus-gates-rule[hidden] { display: none; }
</style>
