<script setup lang="ts">
// Vue shell owns event-driven panels; main.js keeps the legacy racing HUD and simulation loop.
// Static text carries data-i18n / data-i18n-title / data-i18n-aria-label keys; applyI18n() (src/i18n.js) fills them per locale.
// Text that main.js always rewrites before it is seen (HUD readouts, statuses, route heading) stays untagged.
import { version } from '../package.json';
import { RACE_TRACKS } from './game.js';
import { VFX_RANGES, vfxLabelKey } from './vfx-settings.ts';
import { icons, ICON_ATTRS } from './icons.ts';
import GaragePanel from './GaragePanel.vue';
import GuidePanel from './GuidePanel.vue';
import ReleaseNotesPanel from './ReleaseNotesPanel.vue';
import { releaseView } from './release-view-state.ts';
import TutorialCoach from './TutorialCoach.vue';
import SettingsPanel from './SettingsPanel.vue';
import ControlsPanel from './ControlsPanel.vue';
import HistoryPanel from './HistoryPanel.vue';
import { homeStatusView } from './home-status-view-state.ts';
import CupRecovery from './CupRecovery.vue';

const LOGO_PATH = 'M4 27 18 5h13L17 27H4Zm9 6h16'; // shared by the top-bar brand and the start-screen wordmark

// Controls-panel radio groups: settings key → [legend, [value, label]...]; values must match controlSettings().
// Catalog keys: `controls.<key>` for the legend, `controls.<key>.<value>` for each option.
</script>

<template>
  <ReleaseNotesPanel />
  <GuidePanel />
  <TutorialCoach />
  <canvas id="world" aria-label="3D coastal racing highway"></canvas>
  <div class="scene-shade"></div>
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
      <button class="icon-button assist-button" id="assist-button" aria-label="Auto accelerate" data-i18n-aria-label="assist.aria" aria-pressed="false" title="Auto accelerator · F2" aria-keyshortcuts="F2"><svg v-bind="ICON_ATTRS" v-html="icons.assist"></svg><span data-i18n="assist.label">AUTO</span><kbd class="key-badge" aria-hidden="true">F2</kbd></button>
      <SettingsPanel />
      <ControlsPanel />
      <button class="icon-button" id="camera-button" aria-label="Change camera" data-i18n-aria-label="camera.aria" aria-pressed="false" title="Camera · C" data-i18n-title="camera.title" aria-keyshortcuts="C"><svg v-bind="ICON_ATTRS" v-html="icons.camera"></svg><kbd class="key-badge" aria-hidden="true">C</kbd></button>
      <button class="icon-button" id="restart-button" aria-label="Restart race" data-i18n-aria-label="restart.aria" title="Restart · Backspace" data-i18n-title="restart.title" aria-keyshortcuts="Backspace" hidden><svg v-bind="ICON_ATTRS" v-html="icons.restart"></svg><kbd class="key-badge" aria-hidden="true">⌫</kbd></button>
      <button class="icon-button" id="pause-button" aria-label="Pause race" data-i18n-aria-label="pause.aria" title="Pause · Esc" data-i18n-title="pause.title" aria-keyshortcuts="Escape" disabled><svg v-bind="ICON_ATTRS" v-html="icons.pause"></svg><kbd class="key-badge" aria-hidden="true">Esc</kbd></button>
    </nav>
  </header>
  <aside class="aero-tools" aria-label="Airflow and visual effects" data-i18n-aria-label="aero.tools">
    <!-- The one global language switch, drawn by customSelect (main.js); each option names its language in that language. -->
    <select id="locale-select" aria-label="Language" data-i18n-aria-label="locale.switch"><option value="en" lang="en">English</option><option value="zh-TW" lang="zh-TW">繁體中文</option></select>
    <button id="airflow-toggle" aria-pressed="false" title="Toggle airflow · V" data-i18n-title="aero.toggleTitle"><kbd>V</kbd> <span data-i18n="aero.airflow">AIRFLOW</span></button>
    <details id="vfx-panel"><summary><span data-i18n="vfx.summary">VFX</span> <span aria-hidden="true">＋</span></summary>
      <div class="vfx-settings">
        <div class="vfx-heading"><span data-i18n="vfx.eyebrow">AEROSPACE / VISUAL LAB</span><strong data-i18n="vfx.headline">Shape the rush.</strong><small data-i18n="vfx.subline">Visual simulation · driving physics unchanged</small></div>
        <label><span data-i18n="vfx.enabled">Visual effects</span> <input type="checkbox" data-vfx="enabled"></label>
        <label><span data-i18n="vfx.preset">Visual style</span> <select data-vfx="preset"><option value="realistic" data-i18n="vfx.preset.realistic">Realistic</option><option value="cinematic" data-i18n="vfx.preset.cinematic">Cinematic</option><option value="extreme" data-i18n="vfx.preset.extreme">Extreme · sci-fi</option></select></label>
        <label><span data-i18n="vfx.fps">Target FPS</span> <select id="target-fps" aria-label="Target FPS" data-i18n-aria-label="vfx.fps"><option value="auto" data-i18n="vfx.fps.auto">Auto</option><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label>
         <small data-i18n="vfx.fps.note">Auto adapts rendering only; graphics quality remains your choice.</small>
         <label><span data-i18n="vfx.quality">Quality</span> <select data-vfx="quality"><option value="low" data-i18n="vfx.quality.low">Low</option><option value="medium" data-i18n="vfx.quality.medium">Medium</option><option value="high" data-i18n="vfx.quality.high">High</option></select></label>
        <label><span data-i18n="vfx.aeroMode">Aerodynamics</span> <select data-vfx="aeroMode"><option value="drag" data-i18n="vfx.aeroMode.drag">Low drag</option><option value="downforce" data-i18n="vfx.aeroMode.downforce">High downforce</option></select></label>
        <label><span data-i18n="vfx.view">Showcase camera</span> <select data-vfx="view"><option value="drive" data-i18n="vfx.view.drive">Driving camera</option><option value="front" data-i18n="vfx.view.front">Front</option><option value="rear" data-i18n="vfx.view.rear">Rear</option><option value="left" data-i18n="vfx.view.left">Left</option><option value="right" data-i18n="vfx.view.right">Right</option><option value="orbit" data-i18n="vfx.view.orbit">Orbit</option></select></label>
        <label><span data-i18n="vfx.comfortable">Comfort mode</span> <input type="checkbox" data-vfx="comfortable"></label>
        <small class="vfx-note" data-i18n="vfx.comfortNote">Comfort removes flashes, shake, afterimages and blur. System reduced-motion preferences are always respected.</small>
        <label><span data-i18n="vfx.haptics">Haptic feedback</span> <input type="checkbox" data-vfx="haptics"></label>
        <details class="vfx-tuning"><summary data-i18n="vfx.tuning">Fine tuning</summary><label v-for="([label, min, max, step], key) in VFX_RANGES" class="vfx-range"><span :data-i18n="vfxLabelKey(key)">{{ label }}</span><output :for="`vfx-${key}`"></output><input :id="`vfx-${key}`" :aria-label="String(label)" :data-i18n-aria-label="vfxLabelKey(key)" :data-vfx="key" type="range" :min="min" :max="max" :step="step"></label></details>
        <button id="vfx-reset" data-i18n="vfx.reset">Reset visual settings</button>
      </div>
    </details>
  </aside>
  <!-- Home preview swipe (main.js): the track being swiped to, the track just chosen, or the one-time gesture hint. -->
  <div class="track-swipe" id="track-swipe" role="status" data-state=""><span class="swipe-gesture" aria-hidden="true"><i></i></span><strong id="track-swipe-name"></strong><span id="track-swipe-note"></span><span class="swipe-dots" aria-hidden="true"></span></div>
  <section class="airflow-hud" id="airflow-hud" aria-label="Airflow status" data-i18n-aria-label="aero.status" aria-hidden="true">
    <span class="aero-eyebrow" data-i18n="aero.telemetry">AERODYNAMIC TELEMETRY</span><strong data-i18n="aero.active">AIRFLOW ACTIVE</strong>
    <span id="aero-mode">LOW DRAG</span>
    <div class="aero-channels"><span><span data-i18n="aero.flow">FLOW</span> <b id="aero-flow">LAMINAR</b></span><span><span data-i18n="aero.floor">FLOOR</span> <b id="aero-floor">GROUND EFFECT</b></span><span><span data-i18n="aero.jet">JET</span> <b id="aero-jet">STANDBY</b></span></div>
    <span class="aero-disclaimer" data-i18n="aero.disclaimer">FLOW VISUALIZATION / NOT CFD</span>
  </section>

  <main>
    <section class="performance-notice" id="performance-notice" role="status" aria-live="polite" aria-labelledby="performance-notice-title" hidden>
      <span class="performance-notice-eyebrow" data-i18n="notice.eyebrow">DEVICE / GRAPHICS</span>
      <strong id="performance-notice-title"></strong>
      <p id="performance-notice-text"></p>
      <button type="button" id="performance-notice-dismiss">Got it</button>
    </section>
    <section class="intro" id="intro" aria-labelledby="intro-title">
      <div class="route-label"><span class="route-line"></span> <span id="track-length">5 KM SPRINT</span> <span>·</span> <span class="route-drivers" data-i18n="intro.drivers">4 DRIVERS</span><button class="medal-chip cloud-chip" id="cloud-open" data-open-history="cloud" data-i18n="cloud.title">Cloud save</button><button class="medal-chip" id="medal-chip" data-open-history="medals" :aria-label="homeStatusView.medalLabel" :class="{ 'has-medals': homeStatusView.hasMedals }"><svg v-bind="ICON_ATTRS" v-html="icons.star"></svg><span id="medal-count">{{ homeStatusView.medalCount }}</span></button></div>
      <a class="intro-wordmark" href="./" aria-label="Skyline Rush home (reload)" data-i18n-aria-label="nav.homeReload"><svg viewBox="0 0 38 38" fill="none" aria-hidden="true"><path :d="LOGO_PATH" stroke="currentColor" stroke-width="3"/></svg><span lang="en">SKYLINE <b>RUSH</b></span></a>
      <h1 id="intro-title"><span data-i18n="intro.title.1">The road is just</span><br><span data-i18n="intro.title.2">the </span><em data-i18n="intro.title.3">beginning.</em></h1>
      <p class="intro-copy"><span data-i18n="intro.copy.1">Own the highway. Then leave it behind.</span><br><span data-i18n="intro.copy.2">Fire your thrusters and take the race to the sky.</span></p>
      <div class="track-select" role="group" aria-label="Choose track" data-i18n-aria-label="track.choose"><button v-for="(track, id) in RACE_TRACKS" :data-track="id" :aria-pressed="id === 'coast'"><i class="track-preview" :class="`preview-${id}`" aria-hidden="true"><i></i></i><span class="track-route-map" aria-hidden="true"></span><strong>{{ track.name }}</strong><span>{{ track.length / 1000 }} KM <small></small></span></button></div>
      <p id="track-note" class="track-note"></p>
      <div class="intro-actions">
        <button class="primary-button" id="start-button" aria-label="Start race" data-i18n-aria-label="start.race"><span data-i18n="start.race">Start race</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
        <button class="text-button practice-button" id="practice-button" data-i18n="nav.practice">Practice</button>
        <button class="text-button history-button" data-open-history data-i18n="nav.history">History</button>
        <button class="text-button garage-button" id="garage-button" data-i18n="nav.garage">Garage</button>
        <span class="start-hint"><span data-i18n="start.hint">or press</span> <kbd>ENTER</kbd></span>
      </div>
      <!-- Reserve space for the camera controls in compact layouts. -->
      <nav class="showcase-camera-dock" id="showcase-camera-dock" aria-label="Showcase camera" data-i18n-aria-label="vfx.view">
        <span class="showcase-camera-heading" data-i18n="showcase.heading">CAMERA VIEW</span>
        <div class="showcase-camera-actions">
          <button type="button" id="showcase-camera-prev" aria-label="Previous camera view" data-i18n-aria-label="showcase.previous">‹</button>
          <span id="showcase-camera-name" role="status" aria-live="polite"></span>
          <button type="button" id="showcase-camera-next" aria-label="Next camera view" data-i18n-aria-label="showcase.next">›</button>
        </div>
        <span class="showcase-camera-dots" id="showcase-camera-dots" aria-hidden="true"></span>
      </nav>
      <section class="daily-card" id="daily-card" aria-labelledby="daily-card-title">
        <span class="daily-card-icon" aria-hidden="true"><svg v-bind="ICON_ATTRS" v-html="icons.star"></svg></span>
        <div class="daily-card-copy">
          <h2 id="daily-card-title" data-i18n="daily.title">Daily challenge</h2>
          <strong id="daily-card-route">{{ homeStatusView.dailyRoute }}</strong>
          <small id="daily-card-best">{{ homeStatusView.dailyBest }}</small>
        </div>
        <button class="daily-card-start" id="daily-card-start" :disabled="homeStatusView.dailyStartDisabled" aria-describedby="daily-card-route"><span data-i18n="daily.play">Play</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
      </section>
      <div class="race-mode-picker" id="race-mode-picker" role="group" aria-label="Game mode" data-i18n-aria-label="mode.heading">
        <div class="race-mode-heading"><span data-i18n="mode.heading">GAME MODE</span><small id="mode-description"></small></div>
        <div class="race-mode-tabs">
          <button type="button" data-race-mode="classic" aria-pressed="true" data-i18n="mode.classic">Classic Race</button>
          <button type="button" data-race-mode="custom" aria-pressed="false" data-i18n="mode.custom">Custom Race</button>
          <button type="button" data-race-mode="free" aria-pressed="false" data-i18n="mode.free">Free Drive</button>
          <button type="button" data-race-mode="time" aria-pressed="false" data-i18n="mode.time">Time Attack</button>
          <button type="button" data-race-mode="gauntlet" aria-pressed="false" data-i18n="mode.gauntlet">Obstacle Run</button>
          <button type="button" data-race-mode="checkpoint" aria-pressed="false" data-i18n="mode.checkpoint">Checkpoint Rush</button>
          <button type="button" data-race-mode="cup" aria-pressed="false" data-i18n="mode.cup">Championship Cup</button>
          <button type="button" data-race-mode="stunt" aria-pressed="false" data-i18n="mode.stunt">Stunt Attack</button>
          <button type="button" data-race-mode="elimination" aria-pressed="false" data-i18n="mode.elimination">Elimination</button>
        </div>
        <details class="race-mode-rules" id="recent-custom" hidden>
          <summary data-i18n="mode.recent">RECENT CUSTOM SETUPS</summary>
          <div id="recent-custom-runs" class="recent-custom-runs"></div>
        </details>
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
            <label><span data-i18n="mode.rivals">AI opponents</span><select data-race-rule="rivals" aria-label="AI opponents" data-i18n-aria-label="mode.rivals"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3" selected>3</option></select></label>
            <label><span data-i18n="mode.difficulty">AI difficulty</span><select data-race-rule="difficulty" aria-label="AI difficulty" data-i18n-aria-label="mode.difficulty"><option value="easy" data-i18n="mode.easy">Easy</option><option value="normal" selected data-i18n="mode.normal">Normal</option><option value="hard" data-i18n="mode.hard">Hard</option></select></label>
            <label><span data-i18n="mode.traffic">Traffic</span><select data-race-rule="traffic" aria-label="Traffic density" data-i18n-aria-label="mode.traffic"><option value="off" data-i18n="mode.off">Off</option><option value="light" data-i18n="mode.light">Light</option><option value="normal" selected data-i18n="mode.normal">Normal</option><option value="heavy" data-i18n="mode.heavy">Heavy</option></select></label>
            <label id="sprint-stages-setting"><span data-i18n="mode.stages">Sprint stages (not laps)</span><select data-race-rule="stages" aria-label="Sprint stages (not laps)" data-i18n-aria-label="mode.stages"><option value="1" selected>1</option><option value="2">2</option><option value="3">3</option><option value="5">5</option></select></label>
            <label><span data-i18n="mode.collision">Collision penalty</span><select data-race-rule="collision" aria-label="Collision penalty" data-i18n-aria-label="mode.collision"><option value="normal" selected data-i18n="mode.normal">Normal</option><option value="relaxed" data-i18n="mode.relaxed">Relaxed</option></select></label>
            <label><span data-i18n="mode.practiceHazards">Road hazards</span><select data-race-rule="hazards" aria-label="Road hazards" data-i18n-aria-label="mode.practiceHazards"><option value="off" selected data-i18n="mode.off">Off</option><option value="standard" data-i18n="mode.standard">Standard</option><option value="extreme" data-i18n="mode.extreme">Extreme</option></select></label>
            <label class="race-items"><input data-race-rule="items" type="checkbox" checked> <span data-i18n="mode.items">NITRO pickups</span></label>
            <label class="race-items"><input data-race-rule="activeItems" type="checkbox"> <span data-i18n="mode.activeItems">Hold mystery power-ups</span></label>
          </div>
        </details>
      </div>
      <!-- data-keys: the actions whose bound keys showKeyMap() (main.js) draws, so remaps and the arrow / J K L alternates stay listed. -->
      <div class="intro-controls">
        <div><span class="keys" data-keys="throttle left brake right"></span><span data-i18n="hint.drive">Drive</span></div>
        <div><span class="keys" data-keys="fly"></span><span data-i18n="hint.fly">Hold to fly</span></div>
        <div><span class="keys" data-keys="boost"></span><span data-i18n="hint.boost">Boost</span></div>
        <div><span class="keys" data-keys="nitro"></span><span data-i18n="hint.nitro">Nitro</span></div>
        <div><kbd>V</kbd><span data-i18n="hint.airflow">Airflow</span></div>
      </div>
      <p class="flight-tip" data-i18n="intro.tip">Build speed to lift off. Release to land. Recharge on the road. AUTO holds the accelerator; you steer and brake.</p>
    </section>

    <section class="race-info" id="race-info" aria-label="Race progress" data-i18n-aria-label="race.progress" hidden>
      <div class="position-stat"><span class="stat-label" data-i18n="race.position">POSITION</span><div><strong id="position">04</strong><span>/ 04</span><span id="position-change" hidden></span></div><span class="time" id="timer">00:00.00</span><span id="style-score" class="style-score">STYLE 0</span></div>
      <div class="race-progress"><div class="progress-labels"><span id="race-status">READY</span><span><span id="distance">0.00</span> / <span id="race-length">5.00</span> KM</span></div><div class="progress-track"><i id="progress-fill"></i><span class="finish-flag"></span></div><div id="ghost-split" class="ghost-split" role="status" hidden></div><output id="sprint-stage" class="sprint-stage" hidden></output><output id="practice-hud" class="practice-hud" aria-label="Practice statistics" data-i18n-aria-label="mode.practiceStats" hidden></output><output id="stunt-hud" class="stunt-hud" aria-label="Stunt score and countdown" data-i18n-aria-label="mode.stuntHudLabel" hidden></output><div id="item-slot" class="item-slot" hidden><span id="item-status" role="status"></span><button type="button" id="activate-item" data-i18n="mode.itemActivate" disabled>USE · Q</button></div><output id="elimination-hud" class="elimination-hud" hidden></output><output id="checkpoint-hud" class="checkpoint-hud" hidden></output><output id="hazard-warning" class="hazard-warning" hidden></output><output id="clean-trial-hud" class="clean-trial-hud" hidden></output></div>
      <div class="leaderboard" id="leaderboard" aria-label="Race leaderboard" data-i18n-aria-label="race.leaderboard"></div><div id="race-route-map" class="race-route-map" role="region" aria-label="Full course map with live racer positions" data-i18n-aria-label="race.map"></div>
    </section>

    <div class="countdown" id="countdown" role="status" aria-live="polite" hidden><div class="start-lights" aria-hidden="true"><i></i><i></i><i></i></div><strong id="countdown-number">3</strong><span id="countdown-label">HOLD ACCELERATOR · GET READY</span></div>
    <div class="event-callout" id="event-callout" role="status" aria-live="polite" aria-atomic="true" hidden>
      <div id="maneuver-report" hidden></div><div id="skill-report" hidden></div><div id="action-report" hidden></div>
    </div>
    <div class="driving-message" id="driving-message" role="status"></div>
    <div class="impact-report" id="impact-report" role="status" hidden><span class="impact-icon"><svg v-bind="ICON_ATTRS" v-html="icons.brake"></svg></span><div><strong id="impact-title">CONTACT</strong><span><span data-i18n="impact.stabilizing">STABILIZING ·</span> <b id="impact-loss">0</b> <span data-i18n="impact.lost">KM/H LOST</span></span></div></div>

    <section class="race-overlay" id="race-overlay" aria-labelledby="overlay-title" hidden>
      <div class="overlay-content"><span class="overlay-route">SKYLINE RUSH / COASTAL RUN</span><h2 id="overlay-title">Take a breather.</h2><p id="overlay-copy">The skyline can wait.</p><span id="new-best" class="new-best" data-i18n="result.newBest" hidden>NEW BEST</span><div id="result-stats" class="result-stats" hidden></div><div id="result-style" class="result-style" hidden></div><button type="button" class="text-button" id="photo-open" hidden data-i18n="photo.open">PHOTO STUDIO</button><button class="primary-button" id="resume-button" aria-label="Resume race" data-i18n-aria-label="resume.aria"><span data-i18n="resume.label">Back to the race</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button><button class="primary-button next-button" id="next-stage" hidden>Next stage</button><button class="primary-button next-button" id="next-button" hidden><span><span data-i18n="result.next">Next ·</span> <b id="next-track"></b></span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button><button class="text-button" id="again-button"><span data-i18n="result.again">Race again</span> <svg v-bind="ICON_ATTRS" v-html="icons.restart"></svg></button><div class="result-links" id="result-links" hidden><button class="text-button" id="choose-track" data-i18n="track.choose">Choose track</button><button class="text-button" data-open-history data-i18n="nav.history">History</button></div></div>
    </section>
    <div id="error-message" class="error-message" role="alert" hidden></div>
  </main>
  <dialog id="photo-screen" class="photo-screen" aria-labelledby="photo-title">
    <div class="photo-panel">
      <h2 id="photo-title" data-i18n="photo.title">PHOTO STUDIO</h2>
      <p data-i18n="photo.help">Free Drive is paused. Orbit and frame your car, then save a local PNG.</p>
      <label><span data-i18n="photo.orbit">Camera orbit</span>
        <input id="photo-orbit" type="range" min="0" max="360" step="15" value="30"></label>
      <label><span data-i18n="photo.fov">Field of view</span>
        <input id="photo-fov" type="range" min="35" max="85" value="58"></label>
      <label><span data-i18n="photo.sky">Photo lighting</span>
        <select id="photo-sky"><option value="original" data-i18n="photo.original">Original</option>
          <option value="sunset" data-i18n="photo.sunset">Sunset</option>
          <option value="night" data-i18n="photo.night">Night</option>
          <option value="fog" data-i18n="photo.fog">Fog</option></select></label>
      <p id="photo-status" role="status" data-i18n="photo.status">This photo stays on your device.</p>
      <div class="photo-actions"><button type="button" id="photo-save" data-i18n="photo.save">SAVE PNG</button>
        <button type="button" id="photo-close" data-i18n="photo.close">BACK</button></div>
    </div>
  </dialog>
  <div id="race-wipe" class="race-wipe" aria-hidden="true" hidden></div>

  <HistoryPanel />

  <GaragePanel />

  <dialog id="leave-screen" class="history-screen leave-screen" aria-labelledby="leave-title" aria-describedby="leave-copy">
    <h2 id="leave-title" data-i18n="leave.title">Leave this race?</h2>
    <p id="leave-copy" data-i18n="leave.copy">Your race is paused. If you leave now, this run won’t be saved.</p>
    <div class="leave-actions">
      <button class="primary-button" id="leave-keep" autofocus><span data-i18n="leave.keep">Keep racing</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
      <button class="controls-reset" id="leave-end" data-i18n="leave.end">End race · choose track</button>
      <a class="text-button" id="leave-home" href="./" data-i18n="leave.home">Back to home</a>
    </div>
  </dialog>

  <footer class="telemetry">
    <div class="speedometer"><div class="speed-number"><strong id="speed">0</strong><span>KM/H</span></div><div class="speed-ticks" aria-hidden="true"><svg class="speed-dial" viewBox="0 0 200 22"><path d="M4 20 Q100 -16 196 20"/><path id="speed-needle" d="M100 20V2"/></svg><i v-for="i in 24"></i></div><span class="speed-caption" id="speed-caption">READY FOR TAKEOFF</span></div>
    <div class="mode-indicator"><div class="mode-heading"><div class="mode-icon" id="mode-icon"><svg v-bind="ICON_ATTRS" v-html="icons.road"></svg></div><span id="flight-mode">ROAD MODE</span><span id="flight-budget">5.3s</span></div><strong id="flight-state">BUILD SPEED</strong><span class="mode-key" id="flight-instruction">REACH 65 KM/H · HOLD SPACE TO LIFT</span></div>
    <div class="flight-telemetry"><div class="altitude-stat"><span class="stat-label" data-i18n="hud.altitude">ALTITUDE</span><strong><span id="altitude">0.0</span><small>M</small></strong></div><div class="fuel-stat"><div class="fuel-heading"><span class="stat-label" data-i18n="hud.thruster">THRUSTER CHARGE</span><span><b id="fuel-value">100</b><small>%</small></span></div><div class="fuel-track" id="fuel-meter" role="meter" aria-label="Thruster charge" data-i18n-aria-label="hud.thrusterAria" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="fuel-fill"></i></div><span class="fuel-caption" id="fuel-caption">GROUND RECHARGE ACTIVE</span></div></div>
  </footer>
  <!-- TOUCH CONTROLS DOM/CSS CONTRACT — frozen; style.css builds from this, change both together.
   #touch-controls.touch-controls (shown by the existing media rules; [hidden] outside racing/countdown)
     data-steer-mode="slide|buttons|tilt"  slide: .touch-pad steers (drag sideways, pull down = brake), hide .touch-steer (and its brake)
                                      buttons: .touch-steer left/right buttons steer, hide .touch-pad
                                      tilt: sensors steer; pad remains available for down-drag brake / drift
     data-hand="left|right"           side of the screen the steering (pad or .touch-steer) sits on; actions/pedals take the other side
     data-size="S|M|L"               chosen size; lets the live route map clear the cluster (style.css)
     style --touch-scale              0.85 (S) | 1 (M) | 1.15 (L); multiply control sizes by it
     style --touch-opacity            0.4–1; control opacity
     children, in order (all siblings):
       .touch-pad[aria-hidden]        slide surface (pointer events, touch-action:none) > .pad-ring + .pad-knob (positioned later by main.js)
       .touch-steer                   button[data-control=left|right] + button[data-control=brake] (brake sits above them, off the thumb's rest row; an arrow touch slid up into it holds brake + steer = drift)
       .touch-actions                 button.touch-fly[data-control=fly], button.touch-boost[data-control=boost]
       .touch-pedals                  button.touch-gas[data-control=throttle] (gas always visible, both modes)
     button.is-held / [aria-pressed=true] while active (existing).
   Toolbar Controls panel (NOT inside .settings): .controls-menu > button#controls-button.controls-button (text "Controls",
     deliberately not .icon-button) + #controls-panel.controls-panel[hidden] — the scroll container: give it max-height + overflow:auto.
     Inside: fieldset.controls-field > legend + label.controls-choice > input[type=radio][data-controls] + span;
     label.controls-field.controls-range > output + input[type=range][data-controls=opacity]; button#controls-reset.controls-reset. -->
  <div class="touch-controls" id="touch-controls" aria-label="Touch driving controls" data-i18n-aria-label="touch.controls" hidden>
    <div class="touch-pad" aria-hidden="true"><i class="pad-ring"></i><i class="pad-knob"></i></div>
    <div class="touch-steer"><button data-control="left" aria-label="Steer left" data-i18n-aria-label="touch.left"><svg v-bind="ICON_ATTRS" v-html="icons.left"></svg></button><button data-control="right" aria-label="Steer right" data-i18n-aria-label="touch.right"><svg v-bind="ICON_ATTRS" v-html="icons.right"></svg></button><button data-control="brake" aria-label="Brake" data-i18n-aria-label="touch.brake"><svg v-bind="ICON_ATTRS" v-html="icons.brake"></svg></button></div>
    <div class="touch-actions"><button class="touch-nitro" data-control="nitro" aria-label="Activate nitro" data-i18n-aria-label="touch.nitro"><svg v-bind="ICON_ATTRS" v-html="icons.nitro"></svg><span lang="en">NITRO</span></button><button class="touch-fly" data-control="fly" aria-label="Hold to fly" data-i18n-aria-label="hint.fly"><svg v-bind="ICON_ATTRS" v-html="icons.fly"></svg><svg class="touch-fly-lock" v-bind="ICON_ATTRS" v-html="icons.lock"></svg><span lang="en">FLY</span></button><button class="touch-boost" data-control="boost" aria-label="Hold to boost" data-i18n-aria-label="touch.boost"><svg v-bind="ICON_ATTRS" v-html="icons.boost"></svg><span lang="en">BOOST</span></button></div>
    <div class="touch-pedals"><button class="touch-gas" data-control="throttle" aria-label="Accelerate" data-i18n-aria-label="touch.throttle"><svg v-bind="ICON_ATTRS" v-html="icons.pedal"></svg></button></div>
  </div>
  <div class="layout-toolbar" id="layout-toolbar" hidden><span data-i18n="layout.hint">Drag buttons to fit your thumbs</span><button id="layout-done" data-i18n="layout.done">Done editing</button></div>
  <div class="bottomline"><span><i></i> <span data-i18n="footer.tagline">BEYOND THE ROAD</span></span><button type="button" id="whats-new-open" class="build-version" :hidden="releaseView.openHidden" :class="{ 'has-update': releaseView.openHasUpdate }" data-i18n-aria-label="release.open" data-i18n-title="release.open" title="What's new">v{{ version }}<span class="release-unread" aria-hidden="true"></span></button><span data-i18n="footer.genre">AN ORIGINAL ARCADE FLIGHT RACER</span></div>
</template>
