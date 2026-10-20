<script setup>
// Static shell: no reactive state, so Vue renders once and main.js drives this DOM imperatively.
import { version } from '../package.json';
import { RACE_TRACKS } from './game.js';
import { VFX_RANGES } from './vfx-settings.js';
import { icons, ICON_ATTRS } from './icons.js';
import { PAINTS } from './appearance.js';

const LOGO_PATH = 'M4 27 18 5h13L17 27H4Zm9 6h16'; // shared by the top-bar brand and the start-screen wordmark

// Controls-panel radio groups: settings key → [legend, [value, label]...]; values must match controlSettings().
const CONTROL_CHOICES = {
  mode: ['Steering', [['slide', 'Slide'], ['buttons', 'Buttons'], ['tilt', 'Tilt']]],
  hand: ['Steering hand', [['left', 'Left'], ['right', 'Right']]],
  fullLock: ['Slide sensitivity', [[40, 'High'], [60, 'Medium'], [80, 'Low']]],
  size: ['Button size', [['S', 'Small'], ['M', 'Medium'], ['L', 'Large']]],
  flyMode: ['FLY button', [['hold', 'Hold'], ['toggle', 'Toggle']]],
};
</script>

<template>
  <canvas id="world" aria-label="3D coastal racing highway"></canvas>
  <div class="scene-shade"></div>
  <div class="speed-streaks" aria-hidden="true"><i v-for="i in 18" :style="{ '--angle': `${(i - 1) * 20 + 6}deg`, '--delay': `${-(i - 1) * 0.13}s` }"></i></div>
  <div class="flight-director" aria-hidden="true"><span>FLIGHT VECTOR</span><svg viewBox="0 0 300 100" fill="none"><path d="M5 48h75l12 12h16m84 0h16l12-12h75M150 15v13m0 48v10M135 50h30m-15-8v16"/><path class="director-level" d="M88 20h34m56 0h34M105 80h17m56 0h17"/></svg><span class="director-climb" id="climb-rate">+0.0 M/S</span></div>
  <div class="altitude-ladder" aria-hidden="true"><span>12</span><i></i><span>06</span><i></i><span>00</span><b id="height-indicator"></b><small>ALT / M</small></div>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Skyline Rush home">
      <svg viewBox="0 0 38 38" fill="none" aria-hidden="true"><path :d="LOGO_PATH" stroke="currentColor" stroke-width="3"/></svg>
      <span>SKYLINE<span class="brand-rush">RUSH</span></span>
    </a>
    <div class="route-heading"><span class="live-dot"></span> COASTAL EXPRESSWAY <span class="route-divider">/</span> <span>DUSK RUN</span></div>
    <nav class="toolbar" aria-label="Game controls">
      <button class="icon-button assist-button" id="assist-button" aria-label="Auto accelerate" aria-pressed="false" title="Auto accelerator · T"><svg v-bind="ICON_ATTRS" v-html="icons.assist"></svg><span>AUTO</span></button>
      <div class="settings">
        <button class="icon-button" id="settings-button" aria-label="Audio settings" aria-expanded="false" aria-controls="settings-panel" title="Audio settings · M mutes all"><svg v-bind="ICON_ATTRS" v-html="icons.sound"></svg></button>
        <div class="settings-panel" id="settings-panel" role="group" aria-label="Audio settings" hidden>
          <button class="setting" role="switch" data-audio="music" aria-checked="true"><span>Music</span><b aria-hidden="true">ON</b></button>
          <button class="setting" role="switch" data-audio="sfx" aria-checked="true"><span>Sound effects</span><b aria-hidden="true">ON</b></button>
        </div>
        <div class="settings-panel music-prompt" id="music-prompt" role="group" aria-labelledby="music-prompt-title" hidden>
          <p id="music-prompt-title">Play background music?</p>
          <button class="setting" id="music-yes"><span>Play music</span></button>
          <button class="setting" id="music-no"><span>Not now</span></button>
        </div>
      </div>
      <div class="controls-menu">
        <button class="controls-button" id="controls-button" aria-expanded="false" aria-controls="controls-panel" title="Driving controls">Controls</button>
        <div class="controls-panel" id="controls-panel" role="group" aria-label="Driving controls" hidden>
          <fieldset v-for="([legend, options], key) in CONTROL_CHOICES" class="controls-field"><legend>{{ legend }}</legend><label v-for="[value, label] in options" class="controls-choice"><input type="radio" :name="`controls-${key}`" :data-controls="key" :value="value"><span>{{ label }}</span></label></fieldset>
          <p id="tilt-status" role="status" class="controls-note">Tilt asks permission only when selected. Hold your phone comfortably to set neutral.</p>
          <button id="tilt-enable" class="controls-reset" hidden>Enable / recenter tilt</button>
          <label class="ghost-setting"><input id="ghost-enabled" type="checkbox" disabled>Show best-run ghost</label>
          <p id="ghost-status" class="controls-note">No best-run replay recorded yet.</p>
          <label class="controls-field controls-range">Button opacity <output for="controls-opacity"></output><input id="controls-opacity" aria-label="Button opacity" type="range" data-controls="opacity" min="0.4" max="1" step="0.05"></label>
          <label class="controls-field controls-range">Steering sensitivity <output for="controls-sensitivity"></output><input id="controls-sensitivity" aria-label="Steering sensitivity" type="range" data-controls="sensitivity" min="0.4" max="1" step="0.1"></label>
          <fieldset class="controls-field keymap-field"><legend>Keyboard · select action, then press a key</legend><button v-for="action in ['throttle', 'brake', 'left', 'right', 'fly', 'boost', 'nitro']" class="keymap-binding" :data-rebind="action"><span>{{ action.toUpperCase() }}</span><b></b></button></fieldset>
          <p id="keymap-status" role="status" class="controls-note">Fixed shortcuts: Esc pause · R restart · C camera.</p>
          <button class="controls-reset" id="keymap-reset">Reset keyboard</button>
          <button class="controls-reset" id="layout-edit">Edit touch layout</button>
          <button class="controls-reset" id="layout-reset">Reset touch layout</button>
          <button class="controls-reset" id="controls-reset">Reset to defaults</button>
        </div>
      </div>
      <button class="icon-button" id="camera-button" aria-label="Change camera" aria-pressed="false" title="Camera · C"><svg v-bind="ICON_ATTRS" v-html="icons.camera"></svg></button>
      <button class="icon-button" id="restart-button" aria-label="Restart race" title="Restart · R" hidden><svg v-bind="ICON_ATTRS" v-html="icons.restart"></svg></button>
      <button class="icon-button" id="pause-button" aria-label="Pause race" title="Pause · Esc" disabled><svg v-bind="ICON_ATTRS" v-html="icons.pause"></svg></button>
    </nav>
  </header>
  <aside class="aero-tools" aria-label="Airflow and visual effects">
    <button id="airflow-toggle" aria-pressed="false" title="Toggle airflow · V"><kbd>V</kbd> AIRFLOW</button>
    <button id="aero-start" aria-label="Start race from showcase">RACE →</button>
    <details id="vfx-panel"><summary>VFX <span aria-hidden="true">＋</span></summary>
      <div class="vfx-settings">
        <div class="vfx-heading"><span>AEROSPACE / VISUAL LAB</span><strong>Shape the rush.</strong><small>Visual simulation · driving physics unchanged</small></div>
        <label>Visual effects <input type="checkbox" data-vfx="enabled"></label>
        <label>Visual style <select data-vfx="preset"><option value="realistic">Realistic</option><option value="cinematic">Cinematic</option><option value="extreme">Extreme · sci-fi</option></select></label>
        <label>Quality <select data-vfx="quality"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label>Aerodynamics <select data-vfx="aeroMode"><option value="drag">Low drag</option><option value="downforce">High downforce</option></select></label>
        <label>Showcase camera <select data-vfx="view"><option value="drive">Driving camera</option><option value="front">Front</option><option value="rear">Rear</option><option value="left">Left</option><option value="right">Right</option><option value="orbit">Orbit</option></select></label>
        <label>Comfort mode <input type="checkbox" data-vfx="comfortable"></label>
        <small class="vfx-note">Comfort removes flashes, shake, afterimages and blur. System reduced-motion preferences are always respected.</small>
        <label>Haptic feedback <input type="checkbox" data-vfx="haptics"></label>
        <details class="vfx-tuning"><summary>Fine tuning</summary><label v-for="([label, min, max, step], key) in VFX_RANGES" class="vfx-range">{{ label }}<output :for="`vfx-${key}`"></output><input :id="`vfx-${key}`" :aria-label="label" :data-vfx="key" type="range" :min="min" :max="max" :step="step"></label></details>
        <button id="vfx-reset">Reset visual settings</button>
      </div>
    </details>
  </aside>
  <section class="airflow-hud" id="airflow-hud" aria-label="Airflow status" aria-hidden="true">
    <span class="aero-eyebrow">AERODYNAMIC TELEMETRY</span><strong>AIRFLOW ACTIVE</strong>
    <span id="aero-mode">LOW DRAG</span>
    <div class="aero-channels"><span>FLOW <b id="aero-flow">LAMINAR</b></span><span>FLOOR <b id="aero-floor">GROUND EFFECT</b></span><span>JET <b id="aero-jet">STANDBY</b></span></div>
    <span class="aero-disclaimer">FLOW VISUALIZATION / NOT CFD</span>
  </section>

  <main>
    <section class="intro" id="intro" aria-labelledby="intro-title">
      <div class="route-label"><span class="route-line"></span> <span id="track-length">5 KM SPRINT</span> <span>·</span> 4 DRIVERS</div>
      <a class="intro-wordmark" href="./" aria-label="Skyline Rush home (reload)"><svg viewBox="0 0 38 38" fill="none" aria-hidden="true"><path :d="LOGO_PATH" stroke="currentColor" stroke-width="3"/></svg><span>SKYLINE <b>RUSH</b></span></a>
      <h1 id="intro-title">The road is just<br>the <em>beginning.</em></h1>
      <p class="intro-copy">Own the highway. Then leave it behind.<br>Fire your thrusters and take the race to the sky.</p>
      <div class="track-select" role="group" aria-label="Choose track"><button v-for="(track, id) in RACE_TRACKS" :data-track="id" :aria-pressed="String(id === 'coast')"><i class="track-preview" :class="`preview-${id}`" aria-hidden="true"><i></i></i><strong>{{ track.name }}</strong><span>{{ track.length / 1000 }} KM <small></small></span></button></div>
      <p id="track-note" class="track-note"></p>
      <div class="intro-actions">
        <button class="primary-button" id="start-button" aria-label="Start race"><span>Start race</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
        <button class="text-button history-button" data-open-history>History</button>
        <button class="text-button garage-button" id="garage-button">Garage</button>
        <span class="start-hint">or press <kbd>ENTER</kbd></span>
      </div>
      <div class="intro-controls">
        <div><span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Drive</span></div>
        <div><kbd class="wide-key">SPACE</kbd><span>Hold to fly</span></div>
        <div><kbd>SHIFT</kbd><span>Boost</span></div>
        <div><kbd>V</kbd><span>Airflow</span></div>
      </div>
      <p class="flight-tip">Build speed to lift off. Release to land. Recharge on the road. AUTO holds the accelerator; you steer and brake.</p>
    </section>

    <section class="race-info" id="race-info" aria-label="Race progress" hidden>
      <div class="position-stat"><span class="stat-label">POSITION</span><div><strong id="position">04</strong><span>/ 04</span><span id="position-change" hidden></span></div><span class="time" id="timer">00:00.00</span><span id="style-score" class="style-score">STYLE 0</span></div>
      <div class="race-progress"><div class="progress-labels"><span id="race-status">READY</span><span><span id="distance">0.00</span> / <span id="race-length">5.00</span> KM</span></div><div class="progress-track"><i id="progress-fill"></i><span class="finish-flag"></span></div></div>
      <div class="leaderboard" id="leaderboard" aria-label="Race leaderboard"></div>
    </section>

    <div class="countdown" id="countdown" role="status" aria-live="polite" hidden><div class="start-lights" aria-hidden="true"><i></i><i></i><i></i></div><strong id="countdown-number">3</strong><span id="countdown-label">HOLD ACCELERATOR · GET READY</span></div>
    <div class="event-callout" id="event-callout" role="status" aria-live="polite" aria-atomic="true" hidden>
      <div id="maneuver-report" hidden></div><div id="skill-report" hidden></div><div id="action-report" hidden></div>
    </div>
    <div class="driving-message" id="driving-message" role="status"></div>
    <div class="impact-report" id="impact-report" role="status" hidden><span class="impact-icon"><svg v-bind="ICON_ATTRS" v-html="icons.brake"></svg></span><div><strong id="impact-title">CONTACT</strong><span>STABILIZING · <b id="impact-loss">0</b> KM/H LOST</span></div></div>

    <section class="race-overlay" id="race-overlay" aria-labelledby="overlay-title" hidden>
      <div class="overlay-content"><span class="overlay-route">SKYLINE RUSH / COASTAL RUN</span><h2 id="overlay-title">Take a breather.</h2><p id="overlay-copy">The skyline can wait.</p><span id="new-best" class="new-best" hidden>NEW BEST</span><div id="result-stats" class="result-stats" hidden></div><div id="result-style" class="result-style" hidden></div><button class="primary-button" id="resume-button" aria-label="Resume race"><span>Back to the race</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button><button class="text-button" id="again-button">Race again <svg v-bind="ICON_ATTRS" v-html="icons.restart"></svg></button><div class="result-links" id="result-links" hidden><button class="text-button" id="choose-track">Choose track</button><button class="text-button" data-open-history>History</button></div></div>
    </section>
    <div id="error-message" class="error-message" role="alert" hidden></div>
  </main>
  <div id="race-wipe" class="race-wipe" aria-hidden="true" hidden></div>

  <dialog id="history-screen" class="history-screen" aria-labelledby="history-title">
    <header class="history-heading"><h2 id="history-title">Race history</h2><button class="controls-button" id="history-close" aria-label="Close history">Close</button></header>
    <p id="career-summary" class="career-summary"></p>
    <label class="history-filter">Track <select id="history-track" aria-label="History track"><option v-for="(track, id) in RACE_TRACKS" :value="id">{{ track.name }}</option></select></label>
    <figure class="history-trend"><figcaption id="history-trend-label"></figcaption><svg id="history-chart" viewBox="0 0 500 80" role="img" aria-labelledby="history-trend-label"></svg></figure>
    <p id="history-empty" hidden>No runs here yet. Finish a race to start your history.</p>
    <div id="history-runs" class="history-runs"></div>
    <section id="daily-challenge" class="history-extra" aria-labelledby="daily-title">
      <h3 id="daily-title">Daily challenge</h3>
      <p id="daily-status">No daily challenge is available yet.</p>
      <button id="daily-start" class="controls-reset" disabled>Start daily challenge</button>
      <h4>Daily board</h4><div id="daily-board"><p>No challenge runs recorded yet.</p></div>
    </section>
    <section class="history-extra" aria-labelledby="achievements-title">
      <h3 id="achievements-title">Medals</h3><p id="achievement-status">Your awarded medals will appear here when available.</p>
      <ul id="achievement-list" class="achievement-list"><li v-for="[id, name, detail] in [['first-win', 'First victory', 'Win your first race'], ['clean-run', 'Clean run', 'Finish without a collision'], ['perfect-five', 'Perfect flight', 'Five PERFECT LINEs in one race'], ['nitro-chain', 'Triple burst', 'Chain three NITRO charges']]" :data-medal="id"><svg v-bind="ICON_ATTRS" v-html="icons.star"></svg><div><strong>{{ name }}</strong><span>{{ detail }}</span></div><small>Not awarded</small></li></ul>
    </section>
  </dialog>

  <dialog id="garage-screen" class="history-screen garage-screen" aria-labelledby="garage-title">
    <header class="history-heading"><h2 id="garage-title">Garage</h2><button class="controls-button" id="garage-close" aria-label="Close garage">Close</button></header>
    <p class="collection-note">Explore paint and tail light combinations. Appearance never changes performance.</p>
    <div id="garage-preview" class="garage-preview" aria-label="Live car preview"></div>
    <div class="paint-options" role="group" aria-label="Preview car finish"><button v-for="(paint, id) in PAINTS" :data-paint="id" :aria-label="`Preview ${id}`" :aria-pressed="String(id === 'pearl')"><i :style="{ backgroundColor: paint.paint }" aria-hidden="true"></i><span>{{ paint.name }}</span></button></div>
    <p id="garage-status" class="collection-note" role="status">Pearl · standard finish.</p>
    <button id="garage-equip" class="controls-reset" disabled aria-label="Equip finish">Standard finish equipped</button>
    <p class="collection-note">Additional finishes are previews. Cosmetic unlocks are not available yet.</p>
  </dialog>

  <footer class="telemetry">
    <div class="speedometer"><div class="speed-number"><strong id="speed">0</strong><span>KM/H</span></div><div class="speed-ticks" aria-hidden="true"><svg class="speed-dial" viewBox="0 0 200 22"><path d="M4 20 Q100 -16 196 20"/><path id="speed-needle" d="M100 20V2"/></svg><i v-for="i in 24"></i></div><span class="speed-caption" id="speed-caption">READY FOR TAKEOFF</span></div>
    <div class="mode-indicator"><div class="mode-heading"><div class="mode-icon" id="mode-icon"><svg v-bind="ICON_ATTRS" v-html="icons.road"></svg></div><span id="flight-mode">ROAD MODE</span><span id="flight-budget">5.3s</span></div><strong id="flight-state">BUILD SPEED</strong><span class="mode-key" id="flight-instruction">REACH 65 KM/H · HOLD SPACE TO LIFT</span></div>
    <div class="flight-telemetry"><div class="altitude-stat"><span class="stat-label">ALTITUDE</span><strong><span id="altitude">0.0</span><small>M</small></strong></div><div class="fuel-stat"><div class="fuel-heading"><span class="stat-label">THRUSTER CHARGE</span><span><b id="fuel-value">100</b><small>%</small></span></div><div class="fuel-track" id="fuel-meter" role="meter" aria-label="Thruster charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="fuel-fill"></i></div><span class="fuel-caption" id="fuel-caption">GROUND RECHARGE ACTIVE</span></div></div>
  </footer>
  <!-- TOUCH CONTROLS DOM/CSS CONTRACT — frozen; style.css builds from this, change both together.
   #touch-controls.touch-controls (shown by the existing media rules; [hidden] outside racing/countdown)
     data-steer-mode="slide|buttons|tilt"  slide: .touch-pad steers (drag sideways, pull down = brake), hide .touch-steer (and its brake)
                                      buttons: .touch-steer left/right buttons steer, hide .touch-pad
                                      tilt: sensors steer; pad remains available for down-drag brake / drift
     data-hand="left|right"           side of the screen the steering (pad or .touch-steer) sits on; actions/pedals take the other side
     style --touch-scale              0.85 (S) | 1 (M) | 1.15 (L); multiply control sizes by it
     style --touch-opacity            0.4–1; control opacity
     children, in order (all siblings):
       .touch-pad[aria-hidden]        slide surface (pointer events, touch-action:none) > .pad-ring + .pad-knob (positioned later by main.js)
       .touch-steer                   button[data-control=left|right] + button[data-control=brake] (brake sits under them, same thumb: brake + steer = drift)
       .touch-actions                 button.touch-fly[data-control=fly], button.touch-boost[data-control=boost]
       .touch-pedals                  button.touch-gas[data-control=throttle] (gas always visible, both modes)
     button.is-held / [aria-pressed=true] while active (existing).
   Toolbar Controls panel (NOT inside .settings): .controls-menu > button#controls-button.controls-button (text "Controls",
     deliberately not .icon-button) + #controls-panel.controls-panel[hidden] — the scroll container: give it max-height + overflow:auto.
     Inside: fieldset.controls-field > legend + label.controls-choice > input[type=radio][data-controls] + span;
     label.controls-field.controls-range > output + input[type=range][data-controls=opacity]; button#controls-reset.controls-reset. -->
  <div class="touch-controls" id="touch-controls" aria-label="Touch driving controls" hidden>
    <div class="touch-pad" aria-hidden="true"><i class="pad-ring"></i><i class="pad-knob"></i></div>
    <div class="touch-steer"><button data-control="left" aria-label="Steer left"><svg v-bind="ICON_ATTRS" v-html="icons.left"></svg></button><button data-control="right" aria-label="Steer right"><svg v-bind="ICON_ATTRS" v-html="icons.right"></svg></button><button data-control="brake" aria-label="Brake"><svg v-bind="ICON_ATTRS" v-html="icons.brake"></svg></button></div>
    <div class="touch-actions"><button class="touch-nitro" data-control="nitro" aria-label="Activate nitro"><svg v-bind="ICON_ATTRS" v-html="icons.nitro"></svg><span>NITRO</span></button><button class="touch-fly" data-control="fly" aria-label="Hold to fly"><svg v-bind="ICON_ATTRS" v-html="icons.fly"></svg><span>FLY</span></button><button class="touch-boost" data-control="boost" aria-label="Hold to boost"><svg v-bind="ICON_ATTRS" v-html="icons.boost"></svg><span>BOOST</span></button></div>
    <div class="touch-pedals"><button class="touch-gas" data-control="throttle" aria-label="Accelerate"><svg v-bind="ICON_ATTRS" v-html="icons.pedal"></svg></button></div>
  </div>
  <div class="layout-toolbar" id="layout-toolbar" hidden><span>Drag buttons to fit your thumbs</span><button id="layout-done">Done editing</button></div>
  <div class="bottomline"><span><i></i> BEYOND THE ROAD</span><span>AN ORIGINAL ARCADE FLIGHT RACER</span></div>
  <div class="build-version">v{{ version }}</div>
</template>
