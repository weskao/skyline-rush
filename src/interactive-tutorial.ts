import { createRace, startRace, DRIFT_MIN_SPEED, DRIFT_BLEED } from './game.js';
import { createTutorialManeuverState, type ManeuverSnapshot } from './tutorial-maneuver-state.ts';
import { isGateStep, placeGate, judgeGate, gateGuide, type GateRing } from './tutorial-gates.ts';
import type { EndlessState } from './endless-highway.ts';

export const TUTORIAL_STEPS = Object.freeze(['throttle', 'left', 'right', 'brake', 'drift', 'fly', 'land', 'boost', 'airChain', 'barrelRoll', 'nitro'] as const);
export type TutorialStep = typeof TUTORIAL_STEPS[number];
export interface TutorialInput {
  throttle?: boolean; brake?: boolean; laneAssist?: boolean; steer?: number;
  fly?: boolean; boost?: boolean; nitro?: boolean;
}

// Success feedback stays on screen this long after a lesson clears.
export const CLEARED_SECONDS = 0.8;
// Only these lessons ask for a sustained 0.4 s hold; the rest complete on a real engine event.
const HELD_STEPS: readonly string[] = ['throttle', 'fly'];
const BRAKE_CRAWL = 25; // m/s: a held brake still reaches the gate in a few seconds
// m/s: a drift ends below DRIFT_MIN_SPEED, so it must start fast enough to outlast its bleed to the 1 s payout.
const DRIFT_ENTRY = DRIFT_MIN_SPEED + DRIFT_BLEED * 1;

export function prepareTutorialInput(input: TutorialInput, step: TutorialStep | string): TutorialInput {
  if (step !== 'throttle' && !input.brake) input.throttle = true;
  input.laneAssist = false;
  return input;
}

export function createInteractiveTutorial() {
  // The legacy JS engine infers its optional config as null; use a typed adapter
  // until createRace itself is converted, without changing the runtime call.
  const tutorialRace = createRace as unknown as (
    trackId: string,
    config: { mode: 'free'; traffic: 'off'; items: false; collision: 'relaxed' }
  ) => ReturnType<typeof createRace>;
  const race = tutorialRace('coast', { mode: 'free', traffic: 'off', items: false, collision: 'relaxed' });
  race.objective = Object.freeze({ type: 'no-auto-finish' as const }); // a lesson never ends the run
  // The Endless Highway road without its encounters: the practice road never runs out.
  (race as typeof race & { endless?: EndlessState }).endless = { chunk: 0, milestones: 0, practice: true };
  race.sections.length = 0;
  const rings = race.rings = [] as GateRing[] as typeof race.rings;
  race.rivals = [];
  race.traffic = [];
  startRace(race);
  const car = race.player;
  let index = 0, held = 0, previousElapsed = race.elapsed, celebrate = 0, skipRequested = false;
  let gate: GateRing[] | null = null, retryReason: string | null = null, drifted = false;
  let maneuver: ReturnType<typeof createTutorialManeuverState> | null = null;
  const snapshot = (): ManeuverSnapshot => ({
    altitude: car.altitude, thrusting: car.thrusting, flightBoosted: car.flightBoosted,
    poweredFlightTime: car.poweredFlightTime, flick: car.flick,
    landing: car.landing, trick: car.trick, trickPayout: car.trickPayout,
    nitroUses: car.nitroUses, nitroTime: car.nitroTime, speed: car.speed, braking: car.braking,
  });

  function prepare() {
    const step = TUTORIAL_STEPS[index];
    // Speed is the player's own from the standing start on: a lesson snap read as a sudden jump.
    if (index === 0) car.x = car.steering = car.speed = 0;
    car.fuel = 100;
    car.exhausted = false;
    car.flyBuffer = 0;
    if (TUTORIAL_STEPS[index - 1] !== 'drift') car.nitro = step === 'nitro' || step === 'airChain' ? 1 : 0;
    car.nitroTime = 0;
    car.nitroHeld = false;
    if (TUTORIAL_STEPS[index - 1] !== 'drift') car.miniBoost = 0;
    car.drift = car.trick = null;
    if (step === 'drift') { car.driftPayout = null; car.x = 0; }
    if (step !== 'land') {
      car.altitude = car.verticalSpeed = 0;
      // A fresh exercise must never inherit an earlier flight's chain credit.
      car.poweredFlightTime = 0;
      car.flightBoosted = false;
    }
    if (step === 'barrelRoll') {
      // Clear old flick history, but preserve the held steering sign: clearing
      // it fabricates a new input edge when the key remains pressed.
      car.flick = null;
    }
    rings.length = 0;
    gate = retryReason = null;
    if (isGateStep(step)) rings.push(...(gate = placeGate(step, car.distance, car.speed)));
    drifted = false;
    maneuver = step === 'airChain' || step === 'barrelRoll' || step === 'nitro'
      ? createTutorialManeuverState(step, snapshot()) : null;
    held = 0;
  }
  prepare();
  function advance(cleared: boolean): void {
    index++;
    if (index < TUTORIAL_STEPS.length) prepare();
    else rings.length = 0;
    celebrate = cleared && index < TUTORIAL_STEPS.length ? CLEARED_SECONDS : 0;
  }
  function judgeGateStep(step: string): boolean {
    if (!isGateStep(step) || !gate || car.distance < gate[0]!.distance) return false;
    const result = judgeGate(step, gate, car);
    rings.length = 0;
    gate = null;
    if (result === 'pass') return true;
    retryReason = result;
    return false;
  }

  return {
    race,
    get index() { return index; },
    get step() { return TUTORIAL_STEPS[index] ?? null; },
    get progress() { return index === TUTORIAL_STEPS.length ? 1 : TUTORIAL_STEPS[index] === 'drift' ? Math.min(1, ((car as unknown as { drift: { time: number } | null }).drift?.time ?? 0) / 1) : maneuver?.progress ?? Math.min(1, held / .4); },
    get coachPhase() {
      const phase = maneuver?.phase ?? (retryReason ? 'retry' : 'ready');
      return celebrate > 0 && phase === 'ready' ? 'cleared' : phase; // a live cue (airborne, retry) wins over the praise
    },
    get coachReason() { return maneuver ? maneuver.reason : retryReason; },
    get guide() { return gate ? gateGuide(gate, car.x) : ''; },
    /** Applied on the next racing tick, so completion still flows through update(). */
    skip(): void { if (index < TUTORIAL_STEPS.length) skipRequested = true; },
    get complete() { return index === TUTORIAL_STEPS.length; },
    update(input: unknown, dt: number): void {
      if (race.phase !== 'racing' || !Number.isFinite(dt) || dt <= 0 || race.elapsed <= previousElapsed) return;
      previousElapsed = race.elapsed;
      const controls: TutorialInput = input && typeof input === 'object' ? input as TutorialInput : {};
      if (index === TUTORIAL_STEPS.length) return; // finished: a free cruise on the endless road
      if (skipRequested) { skipRequested = false; advance(false); return; }
      const step = TUTORIAL_STEPS[index]!;
      // Practice-only supply: the air chain lesson never runs out of FLY, BOOST or NITRO.
      if (step === 'airChain') { car.fuel = 100; car.exhausted = false; car.nitro = Math.max(car.nitro, 1); }
      // Keep the braking exercise rolling toward its gate: a held brake crawls through, a released one re-accelerates.
      if (step === 'brake' && car.braking && car.speed < BRAKE_CRAWL) car.speed = BRAKE_CRAWL;
      // A miss re-arms a fresh gate ahead.
      if (isGateStep(step) && !gate) rings.push(...(gate = placeGate(step, car.distance, car.speed)));
      // Display-only: the praise stays up briefly, but input during it still counts toward the next lesson.
      if (celebrate > 0) celebrate -= Math.min(dt, .05);
      let valid = false;
      if (step === 'throttle') valid = controls.throttle === true && car.speed > 5;
      else if (isGateStep(step)) valid = judgeGateStep(step);
      else if (step === 'drift') {
        valid = ((car as unknown as { driftPayout: { nitro: number } | null }).driftPayout?.nitro ?? 0) >= 0.15 && car.miniBoost > 0;
        if (car.drift) { drifted = true; if (retryReason === 'slow') retryReason = null; }
        else if (drifted && !valid) { drifted = false; retryReason = 'short'; } // released before the first payout tier
        // Lessons keep the player's speed, so a drift tried at crawl speed only brakes: say why.
        else if (!valid && controls.brake && controls.steer && car.altitude === 0 && car.speed < DRIFT_ENTRY) retryReason = 'slow';
      }
      else if (step === 'fly') valid = controls.fly === true && car.altitude > 1;
      else if (step === 'land') valid = !controls.fly && car.altitude < .15;
      else if (step === 'airChain' || step === 'barrelRoll' || step === 'nitro') {
        valid = maneuver!.update(snapshot(), dt);
        if (step === 'nitro' && maneuver!.phase === 'retry' && !controls.nitro) {
          car.nitroTime = 0; // practice-only: release ends the interrupted burst before re-arming
          // Practice-only retry after a spent, incomplete sprint: never mint
          // a charge in normal races or while the NITRO key is still held.
          car.nitro = 1;
          maneuver = createTutorialManeuverState('nitro', snapshot());
        }
      }
      held = valid ? held + Math.min(dt, .05) : 0;
      if (valid && (held >= .4 || !HELD_STEPS.includes(step))) advance(true);
    },
  };
}
