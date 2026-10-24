<script setup>
// Static shell: no reactive state, so Vue renders once and main.js drives this DOM imperatively.
// Static text carries data-i18n / data-i18n-title / data-i18n-aria-label keys; applyI18n() (src/i18n.js) fills them per locale.
// Text that main.js always rewrites before it is seen (HUD readouts, statuses, route heading) stays untagged.
import { version } from '../package.json';
import { RACE_TRACKS } from './game.js';
import { VFX_RANGES, vfxLabelKey } from './vfx-settings.js';
import { icons, ICON_ATTRS } from './icons.js';
import { PAINTS } from './appearance.js';
import MobileGuide from './MobileGuide.vue';
import SignInButton from './SignInButton.vue';

const LOGO_PATH = 'M4 27 18 5h13L17 27H4Zm9 6h16'; // shared by the top-bar brand and the start-screen wordmark
const GOOGLE_ICON = `${import.meta.env.BASE_URL}icons/google-sign-in.webp`;

// Controls-panel radio groups: settings key → [legend, [value, label]...]; values must match controlSettings().
// Catalog keys: `controls.<key>` for the legend, `controls.<key>.<value>` for each option.
const CONTROL_CHOICES = {
  mode: ['Steering', [['buttons', 'Buttons'], ['slide', 'Slide'], ['tilt', 'Tilt']]],
  hand: ['Steering hand', [['left', 'Left'], ['right', 'Right']]],
  fullLock: ['Slide sensitivity', [[40, 'High'], [60, 'Medium'], [80, 'Low']]],
  size: ['Touch button size',[['S', 'Small'], ['M', 'Medium'], ['L', 'Large']]],
  flyMode: ['FLY button', [['hold', 'Hold'], ['toggle', 'Toggle']]],
};
const MEDALS = [['first-win', 'First victory', 'Win your first race'], ['clean-run', 'Clean run', 'Finish without a collision'], ['perfect-five', 'Perfect flight', 'Five PERFECT LINEs in one race'], ['nitro-chain', 'Triple burst', 'Chain three NITRO charges']];
</script>

<template>
  <dialog id="whats-new-screen" class="history-screen release-screen" aria-labelledby="release-title" aria-describedby="release-intro">
    <header class="release-header">
      <div>
        <small data-i18n="release.eyebrow">SKYLINE RUSH / RELEASE NOTES</small>
        <h2 id="release-title" data-i18n="release.title">What's new</h2>
        <p id="release-intro" class="release-intro" data-i18n="release.intro">See what's new for your next race.</p>
      </div>
      <button id="release-close" type="button" class="release-close" aria-label="Close what's new" data-i18n-aria-label="release.close">×</button>
    </header>
    <div id="release-versions" class="release-versions" role="tablist" aria-label="Versions" data-i18n-aria-label="release.versions"></div>
    <section id="release-panel" class="release-panel" role="tabpanel" tabindex="0">
      <img id="release-hero" class="release-hero" alt="" hidden>
      <div class="release-meta"><span id="release-version"></span><span id="release-date"></span></div>
      <div id="release-items" class="release-entries"></div>
    </section>
    <footer class="release-footer">
      <button type="button" class="primary-button" id="release-continue" data-i18n="release.continue">Continue</button>
    </footer>
  </dialog>
  <dialog id="guide-screen" class="history-screen guide-screen" aria-labelledby="guide-title" aria-describedby="guide-intro">
    <header class="guide-header">
      <h2 id="guide-title" data-i18n="guide.title">Start your engines!</h2>
      <button id="guide-close" class="controls-reset" autofocus data-i18n="guide.close">Got it</button>
    </header>
    <p id="guide-intro" data-i18n="guide.intro">A quick control guide. Open it anytime from Practice on the home screen or Controls → How to play.</p>
    <button id="guide-practice" class="controls-reset tutorial-start" data-i18n="tutorial.start">Start interactive practice</button>
    <div class="guide-devices" role="group" aria-label="Control guide" data-i18n-aria-label="guide.devices">
      <button class="controls-reset" data-guide-device="desktop" aria-pressed="true" aria-controls="guide-desktop-panel" data-i18n="guide.desktop">Keyboard</button>
      <button class="controls-reset" data-guide-device="mobile" aria-pressed="false" aria-controls="guide-mobile-panel" data-i18n="guide.mobile">Touch</button>
    </div>
    <section id="guide-desktop-panel" aria-label="Keyboard controls" data-i18n-aria-label="guide.desktop">
      <p data-i18n="guide.keyboardHint">Your current keys are shown below. Change them in Controls.</p>
      <dl class="guide-keys">
        <div v-for="action in ['throttle', 'brake', 'left', 'right', 'fly', 'boost', 'nitro']">
          <dt><strong :data-i18n="`keymap.${action}`">{{ action }}</strong><span :data-keys="action"></span></dt>
          <dd :data-i18n="`guide.${action}`"></dd>
        </div>
      </dl>
      <p class="guide-shortcuts"><kbd>Esc / P</kbd> <span data-i18n="guide.pause">Pause / resume</span> · <kbd>C</kbd> <span data-i18n="guide.camera">Camera</span> · <kbd>F2</kbd> <span data-i18n="guide.auto">Auto accelerate</span></p>
    </section>
    <section id="guide-mobile-panel" hidden><MobileGuide /></section>
    <p class="guide-note" data-i18n="guide.note">Illustrations only — close this guide to try the controls in a race.</p>
  </dialog>
  <aside id="tutorial-coach" class="tutorial-coach" aria-labelledby="tutorial-title" hidden>
    <header class="tutorial-heading"><strong id="tutorial-title"></strong><div class="tutorial-actions"><button id="tutorial-pause" class="controls-reset" data-i18n="tutorial.pause">Pause</button><button id="tutorial-exit" class="controls-reset" data-i18n="tutorial.exit">Exit</button></div></header>
    <progress id="tutorial-progress" max="8" value="0" aria-label="Practice progress" data-i18n-aria-label="tutorial.progress"></progress>
    <div class="tutorial-copy"><p id="tutorial-instruction" role="status" aria-live="polite"></p><div id="tutorial-input"></div><small id="tutorial-assist" data-i18n="tutorial.assist">Practice only · assisted cruising · no career rewards</small></div>
    <div id="tutorial-complete-actions" class="tutorial-actions" hidden><button id="tutorial-retry" class="controls-reset" data-i18n="tutorial.retry">Practice again</button><button id="tutorial-done" class="controls-reset" data-i18n="tutorial.done">Back to game</button></div>
  </aside>
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
      <div class="settings">
        <button class="icon-button" id="settings-button" aria-label="Audio settings" data-i18n-aria-label="audio.settings" aria-expanded="false" aria-controls="settings-panel" title="Audio settings · M mutes all" data-i18n-title="audio.title"><svg v-bind="ICON_ATTRS" v-html="icons.sound"></svg></button>
        <div class="settings-panel" id="settings-panel" role="group" aria-label="Audio settings" data-i18n-aria-label="audio.settings" hidden>
          <div class="audio-head"><span data-i18n="audio.head">Audio</span><button class="mute-all" id="mute-all" aria-keyshortcuts="M"><span data-i18n="audio.muteAll">Mute all</span><kbd aria-hidden="true">M</kbd></button></div>
          <div class="audio-channel" v-for="[kind, label] in [['music', 'Music'], ['sfx', 'Sound effects']]" :key="kind">
            <button class="setting" role="switch" :data-audio="kind" aria-checked="true"><svg v-bind="ICON_ATTRS" v-html="icons.sound"></svg><span :data-i18n="`audio.${kind}`">{{ label }}</span><b aria-hidden="true">100%</b></button>
            <input type="range" min="0" max="100" step="5" value="100" :aria-label="`${label} volume`" :data-i18n-aria-label="`audio.${kind}Volume`">
          </div>
        </div>
      </div>
      <div class="controls-menu">
        <button class="controls-button" id="controls-button" aria-expanded="false" aria-controls="controls-panel" title="Driving controls" data-i18n-title="controls.title" data-i18n="controls.button">Controls</button>
        <div class="controls-panel" id="controls-panel" role="group" aria-label="Driving controls" data-i18n-aria-label="controls.title" hidden>
          <button class="controls-reset" id="guide-open" data-i18n="guide.open">How to play</button>
          <button class="controls-reset" id="tutorial-open" data-i18n="tutorial.start">Start interactive practice</button>
          <fieldset v-for="([legend, options], key) in CONTROL_CHOICES" class="controls-field"><legend :data-i18n="`controls.${key}`">{{ legend }}</legend><label v-for="[value, label] in options" class="controls-choice"><input type="radio" :name="`controls-${key}`" :data-controls="key" :value="value"><span :data-i18n="`controls.${key}.${value}`">{{ label }}</span></label></fieldset>
          <p id="tilt-status" role="status" class="controls-note" data-i18n="controls.tiltNote">Tilt asks permission only when selected. Hold your phone comfortably to set neutral.</p>
          <button id="tilt-enable" class="controls-reset" data-i18n="controls.tiltEnable" hidden>Enable / recenter tilt</button>
          <label class="ghost-setting"><input id="ghost-enabled" type="checkbox"><span data-i18n="controls.ghost">Show best-run ghost</span></label>
          <p id="ghost-status" class="controls-note">No best-run replay recorded yet.</p>
          <label class="controls-field controls-range"><span data-i18n="controls.opacity">Touch button opacity</span> <output for="controls-opacity"></output><input id="controls-opacity" aria-label="Touch button opacity" data-i18n-aria-label="controls.opacity" type="range" data-controls="opacity" min="0.4" max="1" step="0.05"></label>
          <div class="controls-preview" aria-hidden="true"><span class="controls-preview-label" data-i18n="controls.preview">Preview</span><span class="controls-preview-keys"><i class="touch-nitro"><svg v-bind="ICON_ATTRS" v-html="icons.nitro"></svg></i><i class="touch-fly"><svg v-bind="ICON_ATTRS" v-html="icons.fly"></svg></i><i class="touch-boost"><svg v-bind="ICON_ATTRS" v-html="icons.boost"></svg></i><i class="touch-gas"><svg v-bind="ICON_ATTRS" v-html="icons.pedal"></svg></i></span></div>
          <label class="controls-field controls-range"><span data-i18n="controls.sensitivity">Steering sensitivity</span> <output for="controls-sensitivity"></output><input id="controls-sensitivity" aria-label="Steering sensitivity" data-i18n-aria-label="controls.sensitivity" type="range" data-controls="sensitivity" min="0.4" max="1" step="0.1"></label>
          <fieldset class="controls-field keymap-field"><legend data-i18n="keymap.legend">Keyboard · select action, then press a key</legend><button v-for="action in ['throttle', 'brake', 'left', 'right', 'fly', 'boost', 'nitro']" class="keymap-binding" :data-rebind="action"><span :data-i18n="`keymap.${action}`">{{ action.toUpperCase() }}</span><b></b></button></fieldset>
          <p id="keymap-status" role="status" class="controls-note" data-i18n="keymap.fixed">Fixed shortcuts: Esc pause · Backspace restart · C camera.</p>
          <button class="controls-reset" id="keymap-reset" data-i18n="keymap.reset">Reset keyboard</button>
          <button class="controls-reset" id="layout-edit" data-i18n="layout.edit">Edit touch layout</button>
          <button class="controls-reset" id="layout-reset" data-i18n="layout.reset">Reset touch layout</button>
          <button class="controls-reset" id="controls-reset" data-i18n="controls.reset">Reset to defaults</button>
        </div>
      </div>
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
        <label><span data-i18n="vfx.quality">Quality</span> <select data-vfx="quality"><option value="low" data-i18n="vfx.quality.low">Low</option><option value="medium" data-i18n="vfx.quality.medium">Medium</option><option value="high" data-i18n="vfx.quality.high">High</option></select></label>
        <label><span data-i18n="vfx.aeroMode">Aerodynamics</span> <select data-vfx="aeroMode"><option value="drag" data-i18n="vfx.aeroMode.drag">Low drag</option><option value="downforce" data-i18n="vfx.aeroMode.downforce">High downforce</option></select></label>
        <label><span data-i18n="vfx.view">Showcase camera</span> <select data-vfx="view"><option value="drive" data-i18n="vfx.view.drive">Driving camera</option><option value="front" data-i18n="vfx.view.front">Front</option><option value="rear" data-i18n="vfx.view.rear">Rear</option><option value="left" data-i18n="vfx.view.left">Left</option><option value="right" data-i18n="vfx.view.right">Right</option><option value="orbit" data-i18n="vfx.view.orbit">Orbit</option></select></label>
        <label><span data-i18n="vfx.comfortable">Comfort mode</span> <input type="checkbox" data-vfx="comfortable"></label>
        <small class="vfx-note" data-i18n="vfx.comfortNote">Comfort removes flashes, shake, afterimages and blur. System reduced-motion preferences are always respected.</small>
        <label><span data-i18n="vfx.haptics">Haptic feedback</span> <input type="checkbox" data-vfx="haptics"></label>
        <details class="vfx-tuning"><summary data-i18n="vfx.tuning">Fine tuning</summary><label v-for="([label, min, max, step], key) in VFX_RANGES" class="vfx-range"><span :data-i18n="vfxLabelKey(key)">{{ label }}</span><output :for="`vfx-${key}`"></output><input :id="`vfx-${key}`" :aria-label="label" :data-i18n-aria-label="vfxLabelKey(key)" :data-vfx="key" type="range" :min="min" :max="max" :step="step"></label></details>
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
      <div class="route-label"><span class="route-line"></span> <span id="track-length">5 KM SPRINT</span> <span>·</span> <span class="route-drivers" data-i18n="intro.drivers">4 DRIVERS</span><button class="medal-chip cloud-chip" id="cloud-open" data-open-history="cloud" data-i18n="cloud.title">Cloud save</button><button class="medal-chip" id="medal-chip" data-open-history="medals"><svg v-bind="ICON_ATTRS" v-html="icons.star"></svg><span id="medal-count">0/4</span></button></div>
      <a class="intro-wordmark" href="./" aria-label="Skyline Rush home (reload)" data-i18n-aria-label="nav.homeReload"><svg viewBox="0 0 38 38" fill="none" aria-hidden="true"><path :d="LOGO_PATH" stroke="currentColor" stroke-width="3"/></svg><span lang="en">SKYLINE <b>RUSH</b></span></a>
      <h1 id="intro-title"><span data-i18n="intro.title.1">The road is just</span><br><span data-i18n="intro.title.2">the </span><em data-i18n="intro.title.3">beginning.</em></h1>
      <p class="intro-copy"><span data-i18n="intro.copy.1">Own the highway. Then leave it behind.</span><br><span data-i18n="intro.copy.2">Fire your thrusters and take the race to the sky.</span></p>
      <div class="track-select" role="group" aria-label="Choose track" data-i18n-aria-label="track.choose"><button v-for="(track, id) in RACE_TRACKS" :data-track="id" :aria-pressed="String(id === 'coast')"><i class="track-preview" :class="`preview-${id}`" aria-hidden="true"><i></i></i><span class="track-route-map" aria-hidden="true"></span><strong>{{ track.name }}</strong><span>{{ track.length / 1000 }} KM <small></small></span></button></div>
      <p id="track-note" class="track-note"></p>
      <div class="intro-actions">
        <button class="primary-button" id="start-button" aria-label="Start race" data-i18n-aria-label="start.race"><span data-i18n="start.race">Start race</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
        <button class="text-button practice-button" id="practice-button" data-i18n="nav.practice">Practice</button>
        <button class="text-button history-button" data-open-history data-i18n="nav.history">History</button>
        <button class="text-button garage-button" id="garage-button" data-i18n="nav.garage">Garage</button>
        <span class="start-hint"><span data-i18n="start.hint">or press</span> <kbd>ENTER</kbd></span>
      </div>
      <section class="daily-card" id="daily-card" aria-labelledby="daily-card-title">
        <span class="daily-card-icon" aria-hidden="true"><svg v-bind="ICON_ATTRS" v-html="icons.star"></svg></span>
        <div class="daily-card-copy">
          <h2 id="daily-card-title" data-i18n="daily.title">Daily challenge</h2>
          <strong id="daily-card-route"></strong>
          <small id="daily-card-best"></small>
        </div>
        <button class="daily-card-start" id="daily-card-start" aria-describedby="daily-card-route"><span data-i18n="daily.play">Play</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
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

  <dialog id="history-screen" class="history-screen" aria-labelledby="history-title">
    <header class="history-heading"><h2 id="history-title" data-i18n="history.title">Race history</h2><button class="controls-button" id="history-close" aria-label="Close history" data-i18n-aria-label="history.close" data-i18n="common.close">Close</button></header>
    <p id="career-summary" class="career-summary"></p>
    <section class="history-extra" aria-labelledby="cloud-title">
      <h3 id="cloud-title" data-i18n="cloud.title">Cloud save</h3>
      <p data-i18n="cloud.explain">Sign in to save race progress and restore it after clearing browser data. Existing progress on this device will be merged. Device settings and ghosts stay here.</p>
      <SignInButton id="cloud-login" :icon="GOOGLE_ICON" label-key="cloud.login">Sign in with Google</SignInButton>
      <button type="button" class="controls-reset" id="cloud-logout" data-i18n="cloud.logout" hidden>Sign out</button>
      <button type="button" class="controls-reset" id="cloud-switch" data-i18n="cloud.switch" hidden>Use this account</button>
      <button type="button" class="controls-reset" id="cloud-export" data-i18n="cloud.export">Export race progress</button>
      <button type="button" class="controls-reset" id="cloud-delete" data-i18n="cloud.delete" hidden>Delete race progress</button>
      <p id="cloud-identity" role="status">Not signed in</p>
      <p id="cloud-status" role="status" data-i18n="cloud.local">Cloud backup is off. Sign in to protect your race results.</p>
      <p id="cloud-last-sync">Never synced</p>
    </section>
    <label class="history-filter"><span data-i18n="history.track">Track</span> <select id="history-track" aria-label="History track" data-i18n-aria-label="history.trackAria"><option v-for="(track, id) in RACE_TRACKS" :value="id">{{ track.name }}</option></select></label>
    <figure class="history-trend"><figcaption id="history-trend-label"></figcaption><svg id="history-chart" viewBox="0 0 500 80" role="img" aria-labelledby="history-trend-label"></svg></figure>
    <p id="history-empty" data-i18n="history.empty" hidden>No runs here yet. Finish a race to start your history.</p>
    <div id="history-runs" class="history-runs"></div>
    <section class="history-extra" id="mode-history" aria-labelledby="mode-history-title">
      <h3 id="mode-history-title" data-i18n="mode.historyTitle">Challenge records</h3>
      <p class="mode-history-disclaimer" id="mode-history-notice" data-i18n="mode.historyNotice">Personal challenge results do not award Career stars or official medals.</p>
      <label class="history-filter mode-history-filter"><span data-i18n="mode.historyFilter">Mode</span>
        <select id="mode-history-filter" aria-label="Challenge history mode" data-i18n-aria-label="mode.historyFilterAria">
          <option value="all" data-i18n="mode.historyAll">All modes</option>
          <option value="custom" data-i18n="mode.custom">Custom Race</option>
          <option value="time" data-i18n="mode.time">Time Attack</option>
          <option value="gauntlet" data-i18n="mode.gauntlet">Obstacle Run</option>
          <option value="checkpoint" data-i18n="mode.checkpoint">Checkpoint Rush</option>
          <option value="cup" data-i18n="mode.cup">Championship Cup</option>
          <option value="stunt" data-i18n="mode.stunt">Stunt Attack</option>
          <option value="elimination" data-i18n="mode.elimination">Elimination</option>
        </select>
      </label>
      <p id="mode-history-empty" data-i18n="mode.historyEmpty">Complete a Custom Race or Time Attack to save a personal record.</p>
      <div id="mode-history-runs" class="mode-history-runs"></div>
    </section>
    <section id="daily-challenge" class="history-extra" aria-labelledby="daily-title">
      <h3 id="daily-title" data-i18n="daily.title">Daily challenge</h3>
      <p id="daily-status">No daily challenge is available yet.</p>
      <button id="daily-start" class="controls-reset" data-i18n="daily.start" disabled>Start daily challenge</button>
      <h4 data-i18n="daily.board">Daily board</h4><div id="daily-board"><p>No challenge runs recorded yet.</p></div>
    </section>
    <section class="history-extra" aria-labelledby="achievements-title">
      <h3 id="achievements-title" data-i18n="medal.title">Medals</h3><p id="achievement-status">Your awarded medals will appear here when available.</p>
      <ul id="achievement-list" class="achievement-list"><li v-for="[id, name, detail] in MEDALS" :data-medal="id"><svg v-bind="ICON_ATTRS" v-html="icons.star"></svg><div><strong :data-i18n="`medal.${id}`">{{ name }}</strong><span :data-i18n="`medal.${id}.detail`">{{ detail }}</span></div><small>Not awarded</small></li></ul>
    </section>
  </dialog>

  <dialog id="garage-screen" class="history-screen garage-screen" aria-labelledby="garage-title">
    <header class="history-heading"><h2 id="garage-title" data-i18n="nav.garage">Garage</h2><button class="controls-button" id="garage-close" aria-label="Close garage" data-i18n-aria-label="garage.close" data-i18n="common.close">Close</button></header>
    <p class="collection-note" data-i18n="garage.intro">Explore paint and tail light combinations. Appearance never changes performance.</p>
    <div id="garage-preview" class="garage-preview" aria-label="Live car preview" data-i18n-aria-label="garage.preview"></div>
    <div class="paint-options" role="group" aria-label="Preview car finish" data-i18n-aria-label="garage.finishes"><button v-for="(paint, id) in PAINTS" :data-paint="id" :aria-label="`Preview ${id}`" :data-i18n-aria-label="`paint.${id}.preview`" :aria-pressed="String(id === 'pearl')"><i :style="{ backgroundColor: paint.paint }" aria-hidden="true"></i><span :data-i18n="`paint.${id}`">{{ paint.name }}</span></button></div>
    <p id="garage-status" class="collection-note" role="status">Pearl · standard finish.</p>
    <button id="garage-equip" class="controls-reset" disabled aria-label="Equip finish" data-i18n-aria-label="garage.equip">Standard finish equipped</button>
    <p class="collection-note" data-i18n="garage.previewNote">Additional finishes are previews. Cosmetic unlocks are not available yet.</p>
  </dialog>

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
  <div class="bottomline"><span><i></i> <span data-i18n="footer.tagline">BEYOND THE ROAD</span></span><span data-i18n="footer.genre">AN ORIGINAL ARCADE FLIGHT RACER</span></div>
  <button type="button" id="whats-new-open" class="build-version" data-i18n-aria-label="release.open" data-i18n-title="release.open" title="What's new">v{{ version }}<span class="release-unread" aria-hidden="true"></span></button>
</template>
