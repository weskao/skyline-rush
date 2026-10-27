import { setTextIfChanged as setHudText, setHiddenIfChanged as setHudHidden } from './hud-dom.ts';
import { t, interpolate, getLocale, CATALOGS } from './i18n.ts';
import { icon } from './icons.ts';
import { timeString } from './time-format.ts';
import { racePosition, sprintGaps, gapChargeWarning, MAX_SPEED } from './game.js';
import { ghostAt, type GhostRun } from './ghost.ts';
import { createCallouts } from './callouts.ts';
import type { ControlPreferences } from './control-settings.ts';
import type { VfxSettings } from './vfx-settings.ts';
import { createModePanels, type ModePanelOptions } from './race-hud-modes.ts';

// The in-race HUD, written every HUD tick (~13 Hz) from the frame loop. It stays imperative:
// elements are looked up once, text/hidden are written only when they change, no Vue reactivity.
// The race and input come from the plain-JS simulation (game.js, input.ts); typing their snapshots is
// separate adapter work, so this boundary reads them untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HudRace = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HudInput = any;
interface HudOptions extends ModePanelOptions {
  ui: Record<string, HTMLElement>;
  getRace(): HudRace;
  getControlPrefs(): ControlPreferences;
  /** Printed label of the first FLY key, e.g. SPACE. */
  flyKeyLabel(): string;
  getVisual(): VfxSettings;
  timeTrialGhost(race: HudRace): GhostRun | null;
  isAutoThrottle(): boolean;
  /** GO stays on screen until this time after the countdown ends. */
  getGoUntil(): number;
  setFly(on: boolean): void;
  updatePadHint(phase: string, elapsed: number): void;
  motionOptions(duration: string): { duration: number; easing: string };
  touchPreference: MediaQueryList;
  reducedMotion: MediaQueryList;
}
export interface HudMemory { previousFuel: number; previousNitro: number }

const HUD_NODE_IDS = ['race-length', 'ghost-split', 'style-score', 'aero-flow', 'aero-floor', 'aero-jet'];

export function createRaceHud(options: HudOptions) {
  const { ui, getRace, getControlPrefs, getVisual, motionOptions, touchPreference, reducedMotion } = options;
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const hudNodes = Object.fromEntries(HUD_NODE_IDS.map(id => [id, document.getElementById(id)!])) as Record<string, HTMLElement>;
  const modePanels = createModePanels(options);
  const countdownNumber = $('#countdown-number');
  const countdownLabel = $('#countdown-label');
  const speedTicks = [...document.querySelectorAll<HTMLElement>('.speed-ticks i')];
  ui.leaderboard!.innerHTML = Array.from({ length: 4 }, () => '<div class="racer"><span></span><i></i><strong></strong><span></span></div>').join('');
  const leaderboardRows = [...ui.leaderboard!.children] as HTMLElement[];
  const touchButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-control]')];
  const racerRows = new Map<string, HTMLElement>(['YOU', ...getRace().rivals.map((rival: { name: string }) => rival.name)].map((name, i) => [name, leaderboardRows[i]!]));
  const speedNeedle = $('#speed-needle');
  const positionChange = $('#position-change');
  const boostStatus = document.createElement('span');
  boostStatus.id = 'boost-status';
  boostStatus.className = 'boost-status';
  $('.fuel-stat').append(boostStatus);
  const callouts = createCallouts();
  const eventCallout = $('#event-callout');
  const calloutReports = [$('#maneuver-report'), ui['skill-report']!, $('#action-report')];
  const nitroHud = document.createElement('div');
  nitroHud.className = 'nitro-hud';
  nitroHud.innerHTML = `<span id="nitro-status">${t('hud.nitroCount', { n: 0 })}</span><div id="nitro-meter" class="nitro-meter" role="meter" aria-label="${t('hud.nitroAria')}" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0">${Array.from({ length: 3 }, () => '<span class="nitro-segment"><i></i></span>').join('')}</div>`;
  $('.fuel-stat').append(nitroHud);
  const nitroSegments = [...nitroHud.querySelectorAll<HTMLElement>('.nitro-segment')];
  const nitroStatus = $('#nitro-status');
  const nitroMeter = $('#nitro-meter');
  // HUD text is read every tick: a plain catalog lookup (key parity is unit-tested), swapped on a language switch.
  let L: Record<string, string> = CATALOGS[getLocale() as keyof typeof CATALOGS];
  let leaderboardOrder = '';
  let previousPosition: number | null = null, positionUntil = 0;
  let previousFlight: boolean | undefined;
  let previousFuel = 100, previousNitro = 0, nitroRefillUntil = 0;
  let previousBoost = false;
  let shownCallout: ReturnType<typeof callouts.update> = null;
  let feedbackCar: unknown, lastImpact: unknown, lastDriftPayout: unknown, lastTrickPayout: unknown, lastNitroTime = 0;

  function updateSpeedAndPosition(now: number, race: HudRace, car: HudRace, calm: boolean): void {
    setHudText(ui.speed!, String(Math.round(car.speed * 3.6)));
    speedNeedle.style.transform = `rotate(${-70 + Math.min(1, car.speed / (MAX_SPEED + 30)) * 140}deg)`;
    const position = racePosition(race);
    if (previousPosition !== position) {
      ui.position!.textContent = race.rivals.length ? String(position).padStart(2, '0') : '—';
      if (race.rivals.length && previousPosition !== null && race.phase === 'racing') {
        const gained = position < previousPosition;
        positionChange.textContent = gained ? '↑' : '↓';
        positionChange.dataset.direction = ui.position!.dataset.direction = gained ? 'gained' : 'lost';
        positionChange.setAttribute('aria-label', L[gained ? 'hud.gained' : 'hud.lost']!);
        positionUntil = now + 1.2;
        ui.position!.getAnimations().forEach(animation => animation.cancel());
        positionChange.getAnimations().forEach(animation => animation.cancel());
        if (!calm) {
          ui.position!.animate([{ opacity: .4, transform: `rotateX(${gained ? '-' : ''}65deg)` }, { opacity: 1, transform: 'rotateX(0)' }], motionOptions('base'));
          positionChange.animate([{ opacity: .35 }, { opacity: 1 }], motionOptions('slow'));
        }
      }
      previousPosition = position;
    }
    setHudHidden(positionChange, race.phase !== 'racing' || now >= positionUntil);
    if (positionChange.hidden) delete ui.position!.dataset.direction;
    if (calm || race.phase !== 'racing') for (const element of [ui.position!, positionChange]) element.getAnimations().forEach(animation => animation.cancel());
  }
  function updateProgress(race: HudRace, car: HudRace): void {
    setHudText(ui.timer!, timeString(race.elapsed));
    setHudText(ui.distance!, (car.distance / 1000).toFixed(2));
    ui['progress-fill']!.style.width = `${car.distance / race.length * 100}%`;
    setHudText(hudNodes['race-length']!, (race.length / 1000).toFixed(2));
    const timeGhost = race.mode === 'time' && getControlPrefs().ghost ? options.timeTrialGhost(race) : null;
    const split = hudNodes['ghost-split']!;
    setHudHidden(split, !timeGhost || race.phase !== 'racing');
    if (!split.hidden) {
      const delta = car.distance - ghostAt(timeGhost!, race.elapsed).distance;
      setHudText(split, t(delta >= 0 ? 'mode.ahead' : 'mode.behind', { n: Math.abs(Math.round(delta)) }));
      split.dataset.ahead = String(delta >= 0);
    }
    setHudText(ui['fuel-value']!, String(Math.round(car.fuel)));
    ui['fuel-fill']!.style.transform = `scaleX(${car.fuel / 100})`;
    ui['fuel-meter']!.setAttribute('aria-valuenow', String(Math.round(car.fuel)));
    ui['fuel-meter']!.setAttribute('aria-valuetext', `${car.fuel < 20 ? L['hud.lowCharge'] : ''}${Math.round(car.fuel)}%`);
    ui['fuel-meter']!.dataset.refilling = String(race.phase === 'racing' && car.fuel > previousFuel && car.fuel < 100);
    previousFuel = car.fuel;
    setHudText(hudNodes['style-score']!, race.mode === 'gauntlet' ? t('mode.hazardHud', { n: race.hazards.filter((h: HudRace) => h.passed).length, total: race.hazards.length, score: Math.floor(car.score) }) : interpolate(L['hud.style']!, { n: Math.floor(car.score) }));
    setHudText(ui.altitude!, car.altitude.toFixed(1));
  }
  function updateNitro(now: number, race: HudRace, car: HudRace, nitroActive: boolean): void {
    const visual = getVisual();
    nitroMeter.setAttribute('aria-valuenow', String(Math.round(car.nitro * 100) / 100));
    nitroMeter.classList.toggle('is-max', car.nitro >= 3);
    nitroMeter.classList.toggle('is-low', car.nitro > 0 && car.nitro < .6);
    if (car.nitro > previousNitro && race.phase === 'racing') nitroRefillUntil = now + .6;
    nitroMeter.dataset.refilling = String(race.phase === 'racing' && now < nitroRefillUntil);
    setHudText(nitroStatus, nitroActive ? L['hud.nitroActive']! : car.nitro >= 3 ? L['hud.nitroMax']! : interpolate(L['hud.nitroCount']!, { n: car.nitro.toFixed(2) }));
    for (const [index, segment] of nitroSegments.entries()) {
      const fill = Math.min(1, Math.max(0, car.nitro - index));
      (segment.firstElementChild as HTMLElement).style.transform = `scaleX(${fill})`;
      segment.classList.toggle('is-full', fill === 1);
      if (fill === 1 && previousNitro < index + 1 && race.phase === 'racing' && !visual.comfortable && !reducedMotion.matches) {
        segment.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 450 });
      }
    }
    previousNitro = car.nitro;
  }
  function updateCallout(race: HudRace, impactAge: number, calm: boolean): void {
    const visual = getVisual();
    const callout = callouts.update(race, impactAge <= 1.1);
    if (!callout || calm) eventCallout.getAnimations().forEach(animation => animation.cancel());
    setHudHidden(eventCallout, !callout);
    if (callout === shownCallout) return;
    for (const report of calloutReports) report.hidden = true;
    if (callout) {
      const report = calloutReports[callout.kind === 'perfect' ? 0 : callout.kind === 'near' ? 1 : 2]!;
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
  function updateBoostAndFeedback(race: HudRace, car: HudRace, nitroActive: boolean, flying: boolean, calm: boolean): void {
    const visual = getVisual();
    document.body.classList.toggle('low-charge', car.fuel < 20);
    document.body.classList.toggle('boosting', (car.boosting || nitroActive || (car.miniBoost > 0 && car.boostTunnelEvent)) && race.phase === 'racing');
    const tunnelBoost = car.miniBoost > 0 && car.boostTunnelEvent &&
      race.elapsed - car.boostTunnelEvent.time < 3.6;
    const boost = (car.boosting || nitroActive || tunnelBoost) && race.phase === 'racing';
    setHudText(boostStatus, L[tunnelBoost ? 'hud.hyperdrive' : boost ? 'hud.thrustActive' : car.fuel === 0 ? 'hud.chargeEmpty' : car.fuel < 100 && !flying ? 'hud.recharging' : 'hud.boostReady']!);
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
    setHudText(hudNodes['aero-flow']!, L[boost ? 'hud.highVelocity' : 'hud.streamlines']!);
    setHudText(hudNodes['aero-floor']!, L[flying ? 'hud.downwash' : visual.aeroMode === 'downforce' ? 'hud.suction' : 'hud.lowDrag']!);
    setHudText(hudNodes['aero-jet']!, L[boost ? 'hud.thrustActive' : race.phase === 'ready' ? 'hud.demo' : 'hud.standby']!);
    document.body.style.setProperty('--flight-bank', `${-car.steering * 5}deg`);
    document.body.style.setProperty('--streak-opacity', visual.enabled && !calm && race.phase === 'racing' ? String(boost ? visual.speedLines : 0) : '0');
  }
  function updateTouchButtons(race: HudRace, input: HudInput, tap: boolean): void {
    touchButtons.forEach(button => {
      const control = button.dataset.control!;
      const active = control === 'left' ? input.steer < 0 : control === 'right' ? input.steer > 0 : !!input[control];
      button.classList.toggle('is-held', active);
      button.setAttribute('aria-pressed', String(active));
      // Daily no-flight and toggle mode vary the label; written only when it changes (applyI18n resets it to 'hint.fly').
      if (control === 'fly') {
        const label = L[race.modifier === 'no-flight' ? 'daily.flightDisabled.aria' : tap ? active ? 'hud.tapToLand' : 'hud.tapToFly' : 'hint.fly']!;
        if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
      }
    });
  }
  function updateCountdown(now: number, race: HudRace, calm: boolean): void {
    const countdown = race.phase === 'countdown';
    setHudHidden(ui.countdown!, !(countdown || (race.phase === 'racing' && now < options.getGoUntil())));
    const step = countdown ? String(Math.ceil(race.countdown)) : 'GO'; // the step stays a CSS hook; only the shown text is translated
    const countdownText = countdown ? step : L['hud.go']!;
    if (countdownNumber.textContent !== countdownText) {
      countdownNumber.textContent = countdownText;
      ui.countdown!.dataset.step = step;
      if (!calm) countdownNumber.animate([{ opacity: 0.4, transform: `scale(${countdown ? 1.3 : 0.65})` }, { opacity: 1, transform: 'scale(1)' }], motionOptions(countdown ? 'base' : 'slow'));
    }
    setHudText(countdownLabel, L[countdown ? options.isAutoThrottle() ? 'hud.autoReady' : 'hud.holdReady' : 'hud.goSkyline']!);
  }
  function updateStatus(race: HudRace, car: HudRace, input: HudInput, impactAge: number): void {
    const length = race.length;
    let status = L[`phase.${race.phase}`]!;
    if (race.mode === 'free' && car.distance >= length) status = L['mode.endOfRoad']!;
    else if (race.phase === 'racing' && race.mode === 'classic' && car.distance >= length - 500) {
      const { ahead, behind } = sprintGaps(race);
      status = `${L['hud.final']}${ahead !== null ? ` · +${Math.round(ahead)} m` : ''}${behind !== null ? ` · −${Math.round(behind)} m` : ''}`;
    }
    setHudText(ui['race-status']!, status);
    const gapWarning = race.phase === 'racing' ? gapChargeWarning(race) : null;
    setHudText(ui['driving-message']!, race.phase !== 'racing' || impactAge < 1.1 ? '' : input.fly && car.speed < 18 ? L['hud.reachLiftOff']! : car.exhausted && input.fly ? L['hud.releaseRecharge']!
      : gapWarning ? interpolate(L['hud.gapCharge']!, { n: Math.ceil(gapWarning.need) }) : '');
    if (gapWarning) ui['driving-message']!.dataset.tone = 'warning'; else delete ui['driving-message']!.dataset.tone;
  }
  function updateLeaderboard(race: HudRace, car: HudRace, calm: boolean): void {
    const racers: { name: string; distance: number; player?: boolean }[] = [{ name: 'YOU', distance: car.distance, player: true }, ...race.rivals].sort((a, b) => b.distance - a.distance);
    const order = racers.map(racer => racer.name).join(',');
    if (calm || race.phase !== 'racing') leaderboardRows.forEach(row => row.getAnimations().forEach(animation => animation.cancel()));
    if (order !== leaderboardOrder) {
      // FLIP reads geometry only on a rank change, with all reads batched before writes.
      const before = !calm && race.phase === 'racing' && leaderboardOrder ? new Map(leaderboardRows.map(row => [row, row.getBoundingClientRect().top])) : null;
      leaderboardRows.forEach(row => row.getAnimations().forEach(animation => animation.cancel()));
      ui.leaderboard!.replaceChildren(...racers.map(racer => racerRows.get(racer.name)!));
      const moves = before ? leaderboardRows.map(row => [row, before.get(row)! - row.getBoundingClientRect().top] as const) : [];
      for (const [row, delta] of moves) if (delta) row.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], motionOptions('base'));
      leaderboardOrder = order;
    }
    racers.forEach((racer, i) => {
      const row = racerRows.get(racer.name)!;
      row.classList.toggle('is-player', !!racer.player);
      setHudText(row.children[0]!, String(i + 1));
      setHudText(row.children[2]!, racer.player ? L['hud.you']! : racer.name); // 'YOU' stays the row key
      setHudText(row.children[3]!, racer.player ? L['hud.you']! : `${racer.distance >= car.distance ? '+' : '−'}${Math.abs(racer.distance - car.distance).toFixed(0)} m`);
    });
  }

  function update(now: number, input: HudInput): void {
    const race = getRace();
    const visual = getVisual();
    modePanels.update(race);
    const car = race.player;
    const impactAge = car.impact ? race.elapsed - car.impact.time : 10;
    const calm = visual.comfortable || reducedMotion.matches;
    const flying = car.altitude > 0.25;
    updateSpeedAndPosition(now, race, car, calm);
    updateProgress(race, car);
    const prefs = getControlPrefs();
    const tap = touchPreference.matches && prefs.flyMode === 'toggle';
    // A toggle latch would keep the empty thruster held and block recharge (game.js only clears exhausted when fly is off).
    if (prefs.flyMode === 'toggle' && input.fly && (car.exhausted || car.fuel <= 0)) options.setFly(false);
    const flyKey = touchPreference.matches ? '' : options.flyKeyLabel().toUpperCase();
    const hold = touchPreference.matches ? L[tap ? 'hud.tapFly' : 'hud.holdFly']! : interpolate(L['hud.holdKey']!, { key: flyKey });
    const release = touchPreference.matches ? L['hud.releaseFly']! : interpolate(L['hud.releaseKey']!, { key: flyKey });
    const touchdown = car.landing && race.elapsed - car.landing.time < 1.1;
    const depleted = car.exhausted || car.fuel <= 0;
    const state = L[car.thrusting ? car.verticalSpeed > 0.2 ? 'hud.ascending' : 'hud.cruise' : car.altitude > 0.25 ? 'hud.descending' : touchdown ? 'hud.touchdown' : depleted ? 'hud.recharging' : car.speed >= 18 ? 'hud.readyToFly' : 'hud.buildSpeed']!;
    const nitroActive = car.nitroTime > 0 && race.phase === 'racing';
    const airDash = car.thrusting && car.boosting;
    setHudText(ui['flight-state']!, race.modifier === 'no-flight' ? L['daily.flightDisabled.state']! : car.thrusting && car.nitroTime > 0 ? L['hud.airDashNitro']! : airDash ? L['hud.airDash']! : nitroActive ? L['hud.nitroActive']! : car.trick && !car.trick.done ? L['hud.trick']! : car.inShortcut ? L['callout.shortcut']!
      : car.drift ? interpolate(L['callout.drift']!, { tier: L[car.drift.time >= 3 ? 'callout.drift.tier.3' : car.drift.time >= 2 ? 'callout.drift.tier.2' : car.drift.time >= 1 ? 'callout.drift.tier.1' : 'hud.driftBuilding']! }) : car.miniBoost > 0 && !touchdown ? L['hud.miniBoost']! : state);
    updateNitro(now, race, car, nitroActive);
    updateCallout(race, impactAge, calm);
    document.body.classList.toggle('nitro-active', nitroActive);
    // Inside a shortcut only BOOST drains (3/s); plain flight there is free.
    setHudText(ui['flight-budget']!, race.modifier === 'no-flight' ? '—' : car.inShortcut && !airDash ? '∞' : `${(car.fuel / (car.inShortcut ? 3 : airDash ? 22 : 19)).toFixed(1)}s`);
    setHudText(ui['flight-instruction']!, race.modifier === 'no-flight' ? L['daily.flightDisabled.reason']! : car.thrusting ? interpolate(L['hud.steerAir']!, { action: L[tap ? 'hud.tapLand' : 'hud.releaseDescend']! }) : car.altitude > 0.25 ? depleted ? L['hud.autoLand']! : interpolate(L['hud.climbAgain']!, { hold })
      : car.exhausted ? interpolate(L['hud.rechargeRoad']!, { action: tap ? L['hud.tapLand']! : release }) : car.speed < 18 ? interpolate(L['hud.reachLift']!, { hold }) : depleted ? L['hud.charging']! : interpolate(L[tap ? 'hud.lift' : 'hud.liftLand']!, { hold }));
    setHudText(ui['fuel-caption']!, race.modifier === 'no-flight' ? L['daily.flightDisabled.fuel']! : car.exhausted ? interpolate(L['hud.toRecharge']!, { action: tap ? L['hud.land']! : release }) : L[car.boosting ? 'hud.sharedCharge' : car.thrusting ? 'hud.thrustersOn' : flying ? !input.fly && car.fuel < 100 ? 'hud.glideRecharge' : 'hud.descendRoad' : 'hud.groundRecharge']!);
    setHudText(ui['climb-rate']!, `${car.verticalSpeed >= 0 ? '+' : ''}${car.verticalSpeed.toFixed(1)} M/S`);
    ui['height-indicator']!.style.transform = `translateY(${-car.altitude / 12 * 110}px)`;
    updateBoostAndFeedback(race, car, nitroActive, flying, calm);
    setHudHidden(ui['impact-report']!, race.phase !== 'racing' || impactAge > 1.1);
    if (!ui['impact-report']!.hidden) {
      setHudText(ui['impact-title']!, L[car.impact.kind === 'barrier' ? 'hud.barrier' : 'hud.vehicle']!);
      setHudText(ui['impact-loss']!, String(Math.round(car.impact.speedLost * 3.6)));
    }
    updateTouchButtons(race, input, tap);
    options.updatePadHint(race.phase, race.elapsed);
    setHudText(ui['speed-caption']!, L[race.phase === 'ready' ? 'hud.readyTakeoff' : car.boosting ? 'hud.boostEngaged' : options.isAutoThrottle() ? 'hud.autoOverride' : 'hud.tagline']!);
    document.body.classList.toggle('airborne', flying);
    document.body.classList.toggle('collision', impactAge < 0.45 && race.phase === 'racing');
    if (previousFlight !== flying) {
      setHudText(ui['flight-mode']!, L[flying ? 'hud.flightMode' : 'hud.roadMode']!);
      ui['mode-icon']!.innerHTML = icon(flying ? 'fly' : 'road');
      previousFlight = flying;
    }
    updateCountdown(now, race, calm);
    updateStatus(race, car, input, impactAge);
    updateLeaderboard(race, car, calm);
    speedTicks.forEach((tick, i) => tick.classList.toggle('active', i / 24 < car.speed / 102));
  }

  return {
    update,
    /** A new race starts: charge and NITRO refill cues compare against a full tank and empty NITRO. */
    resetMemory(): void { previousFuel = 100; previousNitro = 0; },
    memory: (): HudMemory => ({ previousFuel, previousNitro }),
    restoreMemory(memory: HudMemory): void { ({ previousFuel, previousNitro } = memory); },
    /** The flight/road label is change-gated; the next tick rewrites it. */
    forgetFlightMode(): void { previousFlight = undefined; },
    /** Language switch: swap the HUD catalog and relabel what the next tick will not rewrite. */
    relabel(): void {
      L = CATALOGS[getLocale() as keyof typeof CATALOGS];
      nitroMeter.setAttribute('aria-label', t('hud.nitroAria'));
      if (positionChange.dataset.direction) positionChange.setAttribute('aria-label', t(positionChange.dataset.direction === 'gained' ? 'hud.gained' : 'hud.lost'));
      previousFlight = undefined; // the next HUD tick rewrites the change-gated labels
    },
  };
}
