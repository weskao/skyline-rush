import './style.css';
import { createRace, startRace, stepRace, racePosition, RACE_LENGTH } from './game.js';
import { createControls } from './input.js';
import { createWorld } from './world.js';
import { createSound } from './audio.js';

const icons = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  camera: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  restart: '<path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/>',
  fly: '<path d="m4 14 8-9 8 9M4 20l8-9 8 9"/>',
  road: '<path d="m6 3-4 18M18 3l4 18M12 3v3m0 4v4m0 4v3"/>',
  left: '<path d="m14 5-7 7 7 7"/>',
  right: '<path d="m10 5 7 7-7 7"/>',
  pedal: '<path d="m6 17 6-10 6 10M6 21h12"/>',
  brake: '<path d="M5 7h14v11H5zM9 10v5m6-5v5"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

document.querySelector('#app').innerHTML = `
  <canvas id="world" aria-label="3D coastal racing highway"></canvas>
  <div class="scene-shade"></div>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Skyline Rush home">
      <svg viewBox="0 0 38 38" fill="none" aria-hidden="true"><path d="M4 27 18 5h13L17 27H4Zm9 6h16" stroke="currentColor" stroke-width="3"/></svg>
      <span>SKYLINE<span class="brand-rush">RUSH</span></span>
    </a>
    <div class="route-heading"><span class="live-dot"></span> COASTAL EXPRESSWAY <span class="route-divider">/</span> <span>DUSK RUN</span></div>
    <nav class="toolbar" aria-label="Game controls">
      <button class="icon-button" id="sound-button" aria-label="Enable sound" title="Sound · M">${icon('mute')}</button>
      <button class="icon-button" id="camera-button" aria-label="Change camera" aria-pressed="false" title="Camera · C">${icon('camera')}</button>
      <button class="icon-button" id="restart-button" aria-label="Restart race" title="Restart · R" hidden>${icon('restart')}</button>
      <button class="icon-button" id="pause-button" aria-label="Pause race" title="Pause · Esc" disabled>${icon('pause')}</button>
    </nav>
  </header>

  <main>
    <section class="intro" id="intro" aria-labelledby="intro-title">
      <div class="route-label"><span class="route-line"></span> 5 KM SPRINT <span>·</span> 4 DRIVERS</div>
      <h1 id="intro-title">The road is just<br>the <em>beginning.</em></h1>
      <p class="intro-copy">Own the highway. Then leave it behind.<br>Fire your thrusters and take the race to the sky.</p>
      <button class="primary-button" id="start-button" aria-label="Start race"><span>Start race</span>${icon('arrow')}</button>
      <span class="start-hint">or press <kbd>ENTER</kbd></span>
      <div class="intro-controls">
        <div><span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Drive</span></div>
        <div><kbd class="wide-key">SPACE</kbd><span>Hold to fly</span></div>
        <div><kbd>SHIFT</kbd><span>Boost</span></div>
      </div>
      <p class="flight-tip">Build speed to lift off. Release to land. Recharge on the road.</p>
    </section>

    <section class="race-info" id="race-info" aria-label="Race progress" hidden>
      <div class="position-stat"><span class="stat-label">POSITION</span><div><strong id="position">04</strong><span>/ 04</span></div><span class="time" id="timer">00:00.00</span></div>
      <div class="race-progress"><div class="progress-labels"><span id="race-status">READY</span><span><span id="distance">0.00</span> / 5.00 KM</span></div><div class="progress-track"><i id="progress-fill"></i><span class="finish-flag"></span></div></div>
      <div class="leaderboard" id="leaderboard" aria-label="Race leaderboard"></div>
    </section>

    <div class="countdown" id="countdown" role="status" aria-live="polite" hidden></div>
    <div class="driving-message" id="driving-message" role="status"></div>

    <section class="race-overlay" id="race-overlay" aria-labelledby="overlay-title" hidden>
      <div class="overlay-content"><span class="overlay-route">SKYLINE RUSH / COASTAL RUN</span><h2 id="overlay-title">Take a breather.</h2><p id="overlay-copy">The skyline can wait.</p><div id="result-stats" class="result-stats" hidden></div><button class="primary-button" id="resume-button" aria-label="Resume race"><span>Back to the race</span>${icon('arrow')}</button><button class="text-button" id="again-button">Race again ${icon('restart')}</button></div>
    </section>
    <div id="error-message" class="error-message" role="alert" hidden></div>
  </main>

  <footer class="telemetry">
    <div class="speedometer"><div class="speed-number"><strong id="speed">0</strong><span>KM/H</span></div><div class="speed-ticks" aria-hidden="true">${Array.from({ length: 24 }, () => '<i></i>').join('')}</div><span class="speed-caption" id="speed-caption">READY FOR TAKEOFF</span></div>
    <div class="mode-indicator"><div class="mode-icon" id="mode-icon">${icon('road')}</div><span id="flight-mode">ROAD MODE</span><span class="mode-key"><kbd>SPACE</kbd> HOLD TO FLY</span></div>
    <div class="flight-telemetry"><div class="altitude-stat"><span class="stat-label">ALTITUDE</span><strong><span id="altitude">0.0</span><small>M</small></strong></div><div class="fuel-stat"><div class="fuel-heading"><span class="stat-label">THRUSTER CHARGE</span><span><b id="fuel-value">100</b><small>%</small></span></div><div class="fuel-track"><i id="fuel-fill"></i></div><span class="fuel-caption" id="fuel-caption">GROUND RECHARGE ACTIVE</span></div></div>
  </footer>
  <div class="touch-controls" id="touch-controls" aria-label="Touch driving controls" hidden>
    <div class="touch-steer"><button data-control="left" aria-label="Steer left">${icon('left')}</button><button data-control="right" aria-label="Steer right">${icon('right')}</button></div>
    <button class="touch-fly" data-control="fly" aria-label="Hold to fly">${icon('fly')}<span>FLY</span></button>
    <div class="touch-pedals"><button data-control="brake" aria-label="Brake">${icon('brake')}</button><button class="touch-gas" data-control="throttle" aria-label="Accelerate">${icon('pedal')}</button></div>
  </div>
  <div class="bottomline"><span><i></i> BEYOND THE ROAD</span><span>AN ORIGINAL ARCADE FLIGHT RACER <span class="version">v0.1</span></span></div>
`;

const $ = selector => document.querySelector(selector);
const ui = Object.fromEntries(['intro', 'race-info', 'race-status', 'speed', 'position', 'timer', 'distance', 'progress-fill', 'fuel-value', 'fuel-fill', 'fuel-caption', 'altitude', 'flight-mode', 'mode-icon', 'countdown', 'driving-message', 'race-overlay', 'overlay-title', 'overlay-copy', 'result-stats', 'resume-button', 'again-button', 'start-button', 'pause-button', 'restart-button', 'sound-button', 'camera-button', 'touch-controls', 'leaderboard', 'speed-caption'].map(id => [id, $(`#${id}`)]));
let race = createRace();
let world;
let previousPhase;
let previousFlight;
let goUntil = 0;
let soundBusy = false;
let animationId;
let pausedPhase = 'racing';
let best = null;
try { best = Number(localStorage.getItem('skyline-rush-best')) || null; } catch { /* Racing works when storage is disabled. */ }
const sound = createSound();
const timeString = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;

function start() {
  if (!world || race.phase !== 'ready') return;
  controls.clear();
  startRace(race);
  ui['start-button'].blur();
}

function restart() {
  if (!world) return;
  controls.clear();
  race = createRace();
  goUntil = 0;
  startRace(race);
  document.activeElement?.blur();
}

function pause() {
  if (race.phase === 'paused') {
    race.phase = pausedPhase;
    controls.clear();
  } else if (race.phase === 'racing' || race.phase === 'countdown') {
    pausedPhase = race.phase;
    race.phase = 'paused';
    controls.clear();
    sound.update(race.player, false);
  }
}

async function toggleSound() {
  if (soundBusy) return;
  soundBusy = true;
  const enabled = await sound.toggle();
  ui['sound-button'].innerHTML = icon(enabled ? 'sound' : 'mute');
  ui['sound-button'].setAttribute('aria-label', enabled ? 'Mute sound' : 'Enable sound');
  soundBusy = false;
}

function changeCamera() {
  if (!world) return;
  const mode = world.cycleCamera();
  ui['camera-button'].setAttribute('aria-pressed', String(mode === 1));
}

const controls = createControls(window, action => {
  ({ start, restart, pause, sound: toggleSound, camera: changeCamera })[action]?.();
});
document.querySelectorAll('[data-control]').forEach(button => controls.bindButton(button, button.dataset.control));
ui['start-button'].addEventListener('click', start);
ui['restart-button'].addEventListener('click', restart);
ui['again-button'].addEventListener('click', restart);
ui['pause-button'].addEventListener('click', pause);
ui['resume-button'].addEventListener('click', pause);
ui['sound-button'].addEventListener('click', toggleSound);
ui['camera-button'].addEventListener('click', changeCamera);
window.addEventListener('blur', () => {
  if (race.phase === 'racing' || race.phase === 'countdown') pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (race.phase === 'racing' || race.phase === 'countdown')) pause();
});

function phaseUI() {
  const phase = race.phase;
  const ready = phase === 'ready';
  const overlay = phase === 'paused' || phase === 'finished';
  document.body.dataset.phase = phase;
  ui.intro.hidden = !ready;
  ui['race-info'].hidden = ready;
  ui['race-overlay'].hidden = !overlay;
  ui['touch-controls'].hidden = ready || overlay;
  ui['pause-button'].disabled = ready || phase === 'finished';
  ui['restart-button'].hidden = ready;
  ui['race-status'].textContent = phase.toUpperCase();
  ui['pause-button'].setAttribute('aria-label', phase === 'paused' ? 'Resume race' : 'Pause race');
  if (phase === 'paused') {
    ui['overlay-title'].textContent = 'Take a breather.';
    ui['overlay-copy'].textContent = 'Your race is paused. Resume when you’re ready.';
    ui['resume-button'].hidden = false;
    ui['result-stats'].hidden = true;
  } else if (phase === 'finished') {
    controls.clear();
    const record = !best || race.elapsed < best;
    if (record) {
      best = race.elapsed;
      try { localStorage.setItem('skyline-rush-best', String(best)); } catch { /* A blocked personal-best store never blocks the results. */ }
    }
    ui['overlay-title'].textContent = race.result.position === 1 ? 'Above the rest.' : 'That was a rush.';
    ui['overlay-copy'].textContent = record ? 'A new personal best. The skyline is yours.' : 'One more run. One less second.';
    ui['resume-button'].hidden = true;
    ui['result-stats'].hidden = false;
    ui['result-stats'].innerHTML = `<div><span>POSITION</span><strong>${race.result.position}<small> / 4</small></strong></div><div><span>YOUR TIME</span><strong>${timeString(race.elapsed)}</strong></div><div><span>BEST</span><strong>${timeString(best)}</strong></div>`;
    ui['again-button'].focus({ preventScroll: true });
  }
}

function updateUI(now, input) {
  if (previousPhase !== race.phase) {
    if (previousPhase === 'countdown' && race.phase === 'racing') goUntil = now + 0.8;
    phaseUI();
    previousPhase = race.phase;
  }
  const car = race.player;
  const flying = car.altitude > 0.25;
  ui.speed.textContent = String(Math.round(car.speed * 3.6));
  ui.position.textContent = String(racePosition(race)).padStart(2, '0');
  ui.timer.textContent = timeString(race.elapsed);
  ui.distance.textContent = (car.distance / 1000).toFixed(2);
  ui['progress-fill'].style.width = `${car.distance / RACE_LENGTH * 100}%`;
  ui['fuel-value'].textContent = String(Math.round(car.fuel));
  ui['fuel-fill'].style.width = `${car.fuel}%`;
  ui.altitude.textContent = car.altitude.toFixed(1);
  ui['fuel-caption'].textContent = car.exhausted ? 'RELEASE SPACE TO RECHARGE' : car.thrusting ? 'THRUSTERS ENGAGED' : flying ? 'DESCENDING TO ROAD' : 'GROUND RECHARGE ACTIVE';
  ui['speed-caption'].textContent = race.phase === 'ready' ? 'READY FOR TAKEOFF' : input.boost && car.fuel > 0 ? 'BOOST ENGAGED' : 'ALL ELECTRIC. ALL ADRENALINE.';
  document.body.classList.toggle('airborne', flying);
  document.body.classList.toggle('collision', car.cooldown > 1.1);
  if (previousFlight !== flying) {
    ui['flight-mode'].textContent = flying ? 'FLIGHT MODE' : 'ROAD MODE';
    ui['mode-icon'].innerHTML = icon(flying ? 'fly' : 'road');
    previousFlight = flying;
  }
  const countdown = race.phase === 'countdown';
  ui.countdown.hidden = !(countdown || now < goUntil);
  const countdownText = countdown ? String(Math.ceil(race.countdown)) : 'GO';
  if (ui.countdown.textContent !== countdownText) ui.countdown.textContent = countdownText;
  ui['driving-message'].textContent = race.phase !== 'racing' ? '' : car.cooldown > 1.1 ? 'CONTACT — KEEP GOING' : input.fly && car.speed < 18 ? 'REACH 65 KM/H TO LIFT OFF' : car.exhausted && input.fly ? 'RELEASE FLIGHT TO RECHARGE' : '';
  const racers = [{ name: 'YOU', distance: car.distance, player: true }, ...race.rivals].sort((a, b) => b.distance - a.distance);
  ui.leaderboard.innerHTML = racers.map((racer, i) => `<div class="racer ${racer.player ? 'is-player' : ''}"><span>${i + 1}</span><i></i><strong>${racer.name}</strong><span>${racer.player ? 'YOU' : `${racer.distance >= car.distance ? '+' : '−'}${Math.abs(racer.distance - car.distance).toFixed(0)} m`}</span></div>`).join('');
  document.querySelectorAll('.speed-ticks i').forEach((tick, i) => tick.classList.toggle('active', i / 24 < car.speed / 102));
}

try {
  world = createWorld($('#world'));
  window.addEventListener('resize', world.resize);
  let previousTime = performance.now();
  let accumulator = 0;
  let hudElapsed = 0;
  function frame(now) {
    const rawDelta = (now - previousTime) / 1000;
    previousTime = now;
    const dt = Math.min(rawDelta, 0.05);
    // Discard background gaps; do not turn a tab switch into seconds of unseen racing.
    accumulator += rawDelta > 0.25 ? 0 : dt;
    const input = controls.read();
    while (accumulator >= 1 / 60) {
      stepRace(race, input, 1 / 60);
      accumulator -= 1 / 60;
    }
    world.render(race, dt, race.phase === 'ready' ? now / 1000 : 0);
    sound.update(race.player, race.phase === 'racing');
    hudElapsed += dt;
    if (hudElapsed >= 0.075 || previousPhase !== race.phase) {
      updateUI(now / 1000, input);
      hudElapsed = 0;
    }
    animationId = requestAnimationFrame(frame);
  }
  animationId = requestAnimationFrame(frame);
} catch (error) {
  ui['start-button'].disabled = true;
  $('#error-message').hidden = false;
  $('#error-message').textContent = 'WebGL 2 could not start. Enable hardware acceleration in your browser, then reload to race.';
  console.error('3D renderer initialization failed:', error);
}

$('#world').addEventListener('webglcontextlost', event => {
  event.preventDefault();
  if (race.phase === 'racing' || race.phase === 'countdown') pause();
  $('#error-message').hidden = false;
  $('#error-message').textContent = 'The WebGL graphics connection was lost. Reload this page to start a new race.';
});
window.addEventListener('pagehide', event => {
  // A cached page resumes the same animation, renderer and controls on back navigation.
  if (event.persisted) return;
  cancelAnimationFrame(animationId);
  controls.destroy();
  sound.dispose();
  world?.dispose();
}, { once: true });
