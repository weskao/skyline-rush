import { createRace, startRace } from './game.js';

export const TUTORIAL_STEPS = Object.freeze(['throttle', 'left', 'right', 'brake', 'fly', 'land', 'boost', 'nitro'] as const);
export type TutorialStep = typeof TUTORIAL_STEPS[number];
export interface TutorialInput {
  throttle?: boolean; brake?: boolean; laneAssist?: boolean; steer?: number;
  fly?: boolean; boost?: boolean; nitro?: boolean;
}

export function prepareTutorialInput(input: TutorialInput, step: TutorialStep | string): TutorialInput {
  if (!['throttle', 'brake'].includes(step) && !input.brake) input.throttle = true;
  input.laneAssist = false;
  return input;
}

export function createInteractiveTutorial() {
  const race = createRace('coast', { mode: 'free', traffic: 'off', items: false, collision: 'relaxed' });
  race.rings = [];
  race.rivals = [];
  race.traffic = [];
  startRace(race);
  const car = race.player;
  let index = 0, held = 0, previousSpeed = 0, previousElapsed = race.elapsed, nitroUses = 0;

  function prepare() {
    const step = TUTORIAL_STEPS[index];
    if (index === 0) car.x = car.steering = 0;
    car.speed = step === 'throttle' ? 0 : 45;
    car.fuel = 100;
    car.exhausted = false;
    car.flyBuffer = 0;
    car.nitro = step === 'nitro' ? 1 : 0;
    car.nitroTime = 0;
    car.nitroHeld = false;
    car.miniBoost = 0;
    car.drift = car.trick = null;
    if (step !== 'land') car.altitude = car.verticalSpeed = 0;
    previousSpeed = car.speed;
    nitroUses = car.nitroUses;
    held = 0;
  }
  prepare();

  return {
    race,
    get index() { return index; },
    get step() { return TUTORIAL_STEPS[index] ?? null; },
    get progress() { return index === TUTORIAL_STEPS.length ? 1 : Math.min(1, held / .4); },
    get complete() { return index === TUTORIAL_STEPS.length; },
    update(input: unknown, dt: number): void {
      if (index === TUTORIAL_STEPS.length || race.phase !== 'racing' || !Number.isFinite(dt) || dt <= 0 || race.elapsed <= previousElapsed) return;
      previousElapsed = race.elapsed;
      const controls: TutorialInput = input && typeof input === 'object' ? input as TutorialInput : {};
      const step = TUTORIAL_STEPS[index];
      if (car.distance >= race.length - 100) {
        car.distance = car.x = 0;
        car.speed = step === 'throttle' ? 0 : 45;
        previousSpeed = car.speed;
        held = 0;
        return;
      }
      // Keep the braking exercise rolling while the learner reads its instructions.
      if (step === 'brake' && !car.braking && car.speed < 20) car.speed = 45;
      let valid = false;
      if (step === 'throttle') valid = controls.throttle === true && car.speed > 5;
      else if (step === 'left') valid = typeof controls.steer === 'number' && Number.isFinite(controls.steer) && controls.steer < 0 && car.steering < 0;
      else if (step === 'right') valid = typeof controls.steer === 'number' && Number.isFinite(controls.steer) && controls.steer > 0 && car.steering > 0;
      else if (step === 'brake') valid = controls.brake === true && car.braking && car.speed < previousSpeed;
      else if (step === 'fly') valid = controls.fly === true && car.altitude > 1;
      else if (step === 'land') valid = !controls.fly && car.altitude < .15;
      else if (step === 'boost') valid = controls.boost === true && car.boosting;
      else if (step === 'nitro') valid = controls.nitro === true && car.nitroUses > nitroUses;
      previousSpeed = car.speed;
      held = valid ? held + Math.min(dt, .05) : 0;
      if (valid && (held >= .4 || step === 'land' || step === 'nitro')) {
        index++;
        if (index < TUTORIAL_STEPS.length) prepare();
      }
    },
  };
}
