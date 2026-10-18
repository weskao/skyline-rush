import './style.css';
import { createRace, startRace, stepRace, racePosition, RACE_LENGTH } from './game.js';
import { createControls } from './input.js';
import { createWorld } from './world.js';
import { createSound } from './audio.js';

const icons = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  assist: '<path d="M4 17a9 9 0 1 1 16 0M12 13l5-5M7 18h10"/><circle cx="12" cy="13" r="2"/>',
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
  <div class="speed-streaks" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--angle:${i * 20 + 6}deg;--delay:${-i * 0.13}s"></i>`).join('')}</div>
  <div class="flight-director" aria-hidden="true"><span>FLIGHT VECTOR</span><svg viewBox="0 0 300 100" fill="none"><path d="M5 48h75l12 12h16m84 0h16l12-12h75M150 15v13m0 48v10M135 50h30m-15-8v16"/><path class="director-level" d="M88 20h34m56 0h34M105 80h17m56 0h17"/></svg><span class="director-climb" id="climb-rate">+0.0 M/S</span></div>
  <div class="altitude-ladder" aria-hidden="true"><span>12</span><i></i><span>06</span><i></i><span>00</span><b id="height-indicator"></b><small>ALT / M</small></div>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Skyline Rush home">
      <svg viewBox="0 0 38 38" fill="none" aria-hidden="true"><path d="M4 27 18 5h13L17 27H4Zm9 6h16" stroke="currentColor" stroke-width="3"/></svg>
      <span>SKYLINE<span class="brand-rush">RUSH</span></span>
    </a>
    <div class="route-heading"><span class="live-dot"></span> COASTAL EXPRESSWAY <span class="route-divider">/</span> <span>DUSK RUN</span></div>
    <nav class="toolbar" aria-label="Game controls">
      <button class="icon-button assist-button" id="assist-button" aria-label="Auto accelerate" aria-pressed="false" title="Auto accelerator · T">${icon('assist')}<span>AUTO</span></button>
      <div class="settings">
        <button class="icon-button" id="settings-button" aria-label="Audio settings" aria-expanded="false" aria-controls="settings-panel" title="Audio settings · M mutes all">${icon('sound')}</button>
        <div class="settings-panel" id="settings-panel" role="group" aria-label="Audio settings" hidden>
          <button class="setting" role="switch" data-audio="music" aria-checked="true"><span>Music</span><b aria-hidden="true">ON</b></button>
          <button class="setting" role="switch" data-audio="sfx" aria-checked="true"><span>Sound effects</span><b aria-hidden="true">ON</b></button>
        </div>
      </div>
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
      <p class="flight-tip">Build speed to lift off. Release to land. Recharge on the road. AUTO holds the accelerator; you steer and brake.</p>
    </section>

    <section class="race-info" id="race-info" aria-label="Race progress" hidden>
      <div class="position-stat"><span class="stat-label">POSITION</span><div><strong id="position">04</strong><span>/ 04</span></div><span class="time" id="timer">00:00.00</span></div>
      <div class="race-progress"><div class="progress-labels"><span id="race-status">READY</span><span><span id="distance">0.00</span> / 5.00 KM</span></div><div class="progress-track"><i id="progress-fill"></i><span class="finish-flag"></span></div></div>
      <div class="leaderboard" id="leaderboard" aria-label="Race leaderboard"></div>
    </section>

    <div class="countdown" id="countdown" role="status" aria-live="polite" hidden><div class="start-lights" aria-hidden="true"><i></i><i></i><i></i></div><strong id="countdown-number">3</strong><span id="countdown-label">HOLD ACCELERATOR · GET READY</span></div>
    <div class="skill-report" id="skill-report" role="status" hidden></div>
    <div class="driving-message" id="driving-message" role="status"></div>
    <div class="impact-report" id="impact-report" role="status" hidden><span class="impact-icon">${icon('brake')}</span><div><strong id="impact-title">CONTACT</strong><span>STABILIZING · <b id="impact-loss">0</b> KM/H LOST</span></div></div>

    <section class="race-overlay" id="race-overlay" aria-labelledby="overlay-title" hidden>
      <div class="overlay-content"><span class="overlay-route">SKYLINE RUSH / COASTAL RUN</span><h2 id="overlay-title">Take a breather.</h2><p id="overlay-copy">The skyline can wait.</p><div id="result-stats" class="result-stats" hidden></div><button class="primary-button" id="resume-button" aria-label="Resume race"><span>Back to the race</span>${icon('arrow')}</button><button class="text-button" id="again-button">Race again ${icon('restart')}</button></div>
    </section>
    <div id="error-message" class="error-message" role="alert" hidden></div>
  </main>

  <footer class="telemetry">
    <div class="speedometer"><div class="speed-number"><strong id="speed">0</strong><span>KM/H</span></div><div class="speed-ticks" aria-hidden="true">${Array.from({ length: 24 }, () => '<i></i>').join('')}</div><span class="speed-caption" id="speed-caption">READY FOR TAKEOFF</span></div>
    <div class="mode-indicator"><div class="mode-heading"><div class="mode-icon" id="mode-icon">${icon('road')}</div><span id="flight-mode">ROAD MODE</span><span id="flight-budget">5.3s</span></div><strong id="flight-state">BUILD SPEED</strong><span class="mode-key" id="flight-instruction">REACH 65 KM/H · HOLD SPACE TO LIFT</span></div>
    <div class="flight-telemetry"><div class="altitude-stat"><span class="stat-label">ALTITUDE</span><strong><span id="altitude">0.0</span><small>M</small></strong></div><div class="fuel-stat"><div class="fuel-heading"><span class="stat-label">THRUSTER CHARGE</span><span><b id="fuel-value">100</b><small>%</small></span></div><div class="fuel-track" id="fuel-meter" role="meter" aria-label="Thruster charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="fuel-fill"></i></div><span class="fuel-caption" id="fuel-caption">GROUND RECHARGE ACTIVE</span></div></div>
  </footer>
  <div class="touch-controls" id="touch-controls" aria-label="Touch driving controls" hidden>
    <div class="touch-steer"><button data-control="left" aria-label="Steer left">${icon('left')}</button><button data-control="right" aria-label="Steer right">${icon('right')}</button></div>
    <div class="touch-actions"><button class="touch-fly" data-control="fly" aria-label="Hold to fly">${icon('fly')}<span>FLY</span></button><button class="touch-boost" data-control="boost" aria-label="Hold to boost">${icon('arrow')}<span>BOOST</span></button></div>
    <div class="touch-pedals"><button data-control="brake" aria-label="Brake">${icon('brake')}</button><button class="touch-gas" data-control="throttle" aria-label="Accelerate">${icon('pedal')}</button></div>
  </div>
  <div class="bottomline"><span><i></i> BEYOND THE ROAD</span><span>AN ORIGINAL ARCADE FLIGHT RACER <span class="version">v0.1</span></span></div>
`;

const $ = selector => document.querySelector(selector);
const ui = Object.fromEntries(['intro', 'race-info', 'race-status', 'speed', 'position', 'timer', 'distance', 'progress-fill', 'fuel-value', 'fuel-fill', 'fuel-caption', 'fuel-meter', 'altitude', 'flight-mode', 'mode-icon', 'flight-state', 'flight-budget', 'flight-instruction', 'climb-rate', 'height-indicator', 'impact-report', 'impact-title', 'impact-loss', 'countdown', 'driving-message', 'race-overlay', 'overlay-title', 'overlay-copy', 'result-stats', 'resume-button', 'again-button', 'start-button', 'pause-button', 'restart-button', 'settings-button', 'settings-panel', 'camera-button', 'touch-controls', 'leaderboard', 'speed-caption'].map(id => [id, $(`#${id}`)]));
ui['assist-button'] = $('#assist-button');
ui['skill-report'] = $('#skill-report');
const countdownNumber = $('#countdown-number');
const countdownLabel = $('#countdown-label');
const speedTicks = [...document.querySelectorAll('.speed-ticks i')];
ui.leaderboard.innerHTML = Array.from({ length: 4 }, () => '<div class="racer"><span></span><i></i><strong></strong><span></span></div>').join('');
const leaderboardRows = [...ui.leaderboard.children];
const touchButtons = [...document.querySelectorAll('[data-control]')];
const touchPreference = matchMedia('(pointer: coarse)');
let race = createRace();
let world;
let previousPhase;
let previousFlight;
let goUntil = 0;
const AUDIO_COOKIES = { music: 'skyline-rush-music', sfx: 'skyline-rush-sound' };
const audio = { music: true, sfx: true };
const audioSwitches = [...document.querySelectorAll('[data-audio]')];
let autoThrottle = false;
let animationId;
let pausedPhase = 'racing';
let best = null;
try { best = Number(localStorage.getItem('skyline-rush-best')) || null; } catch { /* Racing works when storage is disabled. */ }
try { for (const kind in audio) audio[kind] = !document.cookie.split('; ').includes(`${AUDIO_COOKIES[kind]}=off`); } catch { /* Audio defaults to on when cookies are unavailable. */ }
const sound = createSound();
const timeString = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;

function showAudio() {
  for (const button of audioSwitches) {
    const on = audio[button.dataset.audio];
    button.setAttribute('aria-checked', String(on));
    button.lastChild.textContent = on ? 'ON' : 'OFF';
  }
  ui['settings-button'].innerHTML = icon(audio.music || audio.sfx ? 'sound' : 'mute');
}

showAudio();

function start() {
  if (!world || race.phase !== 'ready') return;
  controls.clear();
  startRace(race);
  sound.cue('ui');
  ui['start-button'].blur();
}

function restart() {
  if (!world) return;
  controls.clear();
  race = createRace();
  goUntil = 0;
  startRace(race);
  sound.update(race);
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
    sound.update(race);
  }
  goUntil = 0;
  sound.cue(race.phase === 'paused' ? 'pause' : 'ui');
}

function toggleAssist() {
  autoThrottle = !autoThrottle;
  ui['assist-button'].setAttribute('aria-pressed', String(autoThrottle));
  sound.cue('ui');
}

function setAudio(kind, on) {
  audio[kind] = kind === 'music' ? sound.setMusic(on) : sound.setEnabled(on);
  try { document.cookie = `${AUDIO_COOKIES[kind]}=${audio[kind] ? 'on' : 'off'}; Max-Age=31536000; Path=/; SameSite=Lax`; } catch { /* Audio still works when cookies are unavailable. */ }
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

// Browsers start audio only after a user gesture, so saved choices are applied on the first one.
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

const controls = createControls(window, action => {
  if (action === 'pause') toggleSettings(false);
  ({ start, restart, pause, sound: toggleSound, camera: changeCamera, assist: toggleAssist })[action]?.();
});
for (const type of ['click', 'keydown']) window.addEventListener(type, unlockAudio, { capture: true });
document.querySelectorAll('[data-control]').forEach(button => controls.bindButton(button, button.dataset.control));
ui['start-button'].addEventListener('click', start);
ui['restart-button'].addEventListener('click', restart);
ui['again-button'].addEventListener('click', restart);
ui['pause-button'].addEventListener('click', pause);
ui['resume-button'].addEventListener('click', pause);
ui['settings-button'].addEventListener('click', () => { toggleSettings(); sound.cue('ui'); });
audioSwitches.forEach(button => button.addEventListener('click', () => {
  setAudio(button.dataset.audio, !audio[button.dataset.audio]);
  sound.cue('ui');
}));
document.addEventListener('click', event => {
  if (!event.target.closest('.settings')) toggleSettings(false);
});
ui['camera-button'].addEventListener('click', changeCamera);
ui['assist-button'].addEventListener('click', toggleAssist);
document.querySelector('.toolbar').addEventListener('click', event => {
  if (event.detail > 0) event.target.closest('button')?.blur();
});
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
    ui['overlay-copy'].textContent += ` ${race.result.nearMisses} close passes · ${race.result.collisions} contacts.`;
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
  ui['fuel-meter'].setAttribute('aria-valuenow', String(Math.round(car.fuel)));
  ui.altitude.textContent = car.altitude.toFixed(1);
  const hold = touchPreference.matches ? 'HOLD FLY' : 'HOLD SPACE';
  const release = touchPreference.matches ? 'RELEASE FLY' : 'RELEASE SPACE';
  const touchdown = car.landing && race.elapsed - car.landing.time < 1.1;
  const depleted = car.exhausted || car.fuel <= 0;
  const state = car.thrusting ? car.verticalSpeed > 0.2 ? 'ASCENDING' : 'CRUISE' : car.altitude > 0.25 ? 'DESCENDING' : touchdown ? 'TOUCHDOWN' : depleted ? 'RECHARGING' : car.speed >= 18 ? 'READY TO FLY' : 'BUILD SPEED';
  ui['flight-state'].textContent = state;
  ui['flight-budget'].textContent = `${(car.fuel / 19).toFixed(1)}s`;
  ui['flight-instruction'].textContent = car.thrusting ? 'RELEASE TO DESCEND · STEER IN THE AIR' : car.altitude > 0.25 ? depleted ? 'CHARGE EMPTY · AUTO LANDING' : `${hold} TO CLIMB AGAIN` : car.exhausted ? `${release} · RECHARGE ON ROAD` : car.speed < 18 ? `REACH 65 KM/H · ${hold} TO LIFT` : depleted ? 'CHARGING · STAY ON THE ROAD' : `${hold} TO LIFT · RELEASE TO LAND`;
  ui['fuel-caption'].textContent = car.exhausted ? `${release} TO RECHARGE` : car.boosting ? 'BOOST · SHARED THRUSTER CHARGE' : car.thrusting ? 'THRUSTERS ENGAGED' : flying ? 'DESCENDING TO ROAD' : 'GROUND RECHARGE ACTIVE';
  ui['climb-rate'].textContent = `${car.verticalSpeed >= 0 ? '+' : ''}${car.verticalSpeed.toFixed(1)} M/S`;
  ui['height-indicator'].style.transform = `translateY(${-car.altitude / 12 * 110}px)`;
  document.body.classList.toggle('low-charge', car.fuel < 22);
  document.body.classList.toggle('boosting', car.boosting && race.phase === 'racing');
  document.body.style.setProperty('--flight-bank', `${-car.steering * 5}deg`);
  document.body.style.setProperty('--streak-opacity', race.phase === 'racing' ? car.boosting ? '0.45' : flying && car.speed > 55 ? '0.16' : '0' : '0');
  const impactAge = car.impact ? race.elapsed - car.impact.time : 10;
  ui['impact-report'].hidden = race.phase !== 'racing' || impactAge > 1.1;
  if (!ui['impact-report'].hidden) {
    ui['impact-title'].textContent = car.impact.kind === 'barrier' ? 'GUARDRAIL CONTACT' : 'VEHICLE CONTACT';
    ui['impact-loss'].textContent = String(Math.round(car.impact.speedLost * 3.6));
  }
  touchButtons.forEach(button => {
    const control = button.dataset.control;
    const active = control === 'left' ? input.steer < 0 : control === 'right' ? input.steer > 0 : !!input[control];
    button.classList.toggle('is-held', active);
    button.setAttribute('aria-pressed', String(active));
  });
  ui['speed-caption'].textContent = race.phase === 'ready' ? 'READY FOR TAKEOFF' : car.boosting ? 'BOOST ENGAGED' : autoThrottle ? 'AUTO ACCELERATOR · BRAKE TO OVERRIDE' : 'ALL ELECTRIC. ALL ADRENALINE.';
  document.body.classList.toggle('airborne', flying);
  document.body.classList.toggle('collision', impactAge < 0.45 && race.phase === 'racing');
  if (previousFlight !== flying) {
    ui['flight-mode'].textContent = flying ? 'FLIGHT MODE' : 'ROAD MODE';
    ui['mode-icon'].innerHTML = icon(flying ? 'fly' : 'road');
    previousFlight = flying;
  }
  const countdown = race.phase === 'countdown';
  ui.countdown.hidden = !(countdown || (race.phase === 'racing' && now < goUntil));
  const countdownText = countdown ? String(Math.ceil(race.countdown)) : 'GO';
  if (countdownNumber.textContent !== countdownText) {
    countdownNumber.textContent = countdownText;
    ui.countdown.dataset.step = countdownText;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) countdownNumber.animate([{ opacity: 0.4, transform: 'scale(1.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 220 });
  }
  countdownLabel.textContent = countdown ? autoThrottle ? 'AUTO ACCELERATOR READY' : 'HOLD ACCELERATOR · GET READY' : 'GO FOR THE SKYLINE';
  const near = car.nearMiss;
  ui['skill-report'].hidden = race.phase !== 'racing' || impactAge < 1.1 || !near || race.elapsed - near.time > 1.8;
  if (!ui['skill-report'].hidden) ui['skill-report'].textContent = `CLOSE PASS ×${near.combo}  /  ${near.charge < 0.5 ? 'CHARGE FULL' : `+${Math.round(near.charge)}% CHARGE`}`;
  ui['race-status'].textContent = race.phase === 'racing' && car.distance >= RACE_LENGTH - 500 ? 'FINAL 500 M' : race.phase.toUpperCase();
  ui['driving-message'].textContent = race.phase !== 'racing' || impactAge < 1.1 ? '' : input.fly && car.speed < 18 ? 'REACH 65 KM/H TO LIFT OFF' : car.exhausted && input.fly ? 'RELEASE FLIGHT TO RECHARGE' : '';
  const racers = [{ name: 'YOU', distance: car.distance, player: true }, ...race.rivals].sort((a, b) => b.distance - a.distance);
  racers.forEach((racer, i) => {
    const row = leaderboardRows[i];
    row.classList.toggle('is-player', !!racer.player);
    row.children[0].textContent = String(i + 1);
    row.children[2].textContent = racer.name;
    row.children[3].textContent = racer.player ? 'YOU' : `${racer.distance >= car.distance ? '+' : '−'}${Math.abs(racer.distance - car.distance).toFixed(0)} m`;
  });
  speedTicks.forEach((tick, i) => tick.classList.toggle('active', i / 24 < car.speed / 102));
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
    const dt = Math.max(0, Math.min(rawDelta, 0.05));
    // Discard background gaps; do not turn a tab switch into seconds of unseen racing.
    accumulator += rawDelta > 0.25 ? 0 : dt;
    const input = controls.read();
    if (autoThrottle && !input.brake) input.throttle = true;
    while (accumulator >= 1 / 60) {
      stepRace(race, input, 1 / 60);
      accumulator -= 1 / 60;
    }
    world.render(race, dt, race.phase === 'ready' ? now / 1000 : 0, input);
    sound.update(race);
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
