import { CHAIN_POWERED_SECONDS } from './air-chain.ts';

/** Live "do this now" toast for a lesson: what the engine shows the player is doing, and which control comes next. */
export interface TutorialCue { key: string; actions: readonly string[]; n?: number; count?: number }
export interface CueCar {
  altitude: number; thrusting: boolean; flightBoosted: boolean; poweredFlightTime: number;
  drift: { time: number } | null; speed: number; verticalSpeed?: number;
}
export interface CueState {
  step: string | null; phase: string; car: CueCar;
  /** Boost lesson seconds left (or the full limit before the stretch). */
  countdown: number | null; stretchEntered: boolean;
  /** m/s a drift needs to start and outlast its bleed to the first payout. */
  driftEntry: number;
}
// Barrel roll band: below 4 m a 0.7 s roll lands mid-spin; an unpowered fall from above ~8.6 m lands at the
// engine's 11 m/s hard-landing speed (TRICK_HARD_LANDING), so warn while there is still time to tap FLY.
const ROLL_RELEASE_ALTITUDE = 4;
const ROLL_FAST_FALL = 8; // m/s down
const tenth = (seconds: number): number => Math.round(Math.max(0, seconds) * 10) / 10;

function driftCue({ car, driftEntry }: CueState): TutorialCue {
  const time = car.drift?.time;
  if (time !== undefined) {
    // The engine pays a tier on release: 1 s, 2 s, 3 s (DRIFT_REWARDS).
    if (time < 1) return { key: 'tutorial.cue.driftHold', actions: ['brake'], count: tenth(1 - time) };
    return time < 3 ? { key: 'tutorial.cue.driftRelease', actions: ['brake'], n: Math.floor(time) } : { key: 'tutorial.cue.driftMax', actions: ['brake'] };
  }
  if (car.altitude === 0 && car.speed < driftEntry) return { key: 'tutorial.cue.driftSpeed', actions: ['brake'] };
  return { key: 'tutorial.cue.driftStart', actions: ['brake', 'left', 'right'] };
}
function airChainCue({ car, phase }: CueState): TutorialCue {
  if (phase === 'airborne') return { key: 'tutorial.cue.chainRelease', actions: ['fly'] }; // engine chain threshold met
  if (car.altitude > 0 && car.thrusting) {
    return car.flightBoosted ? { key: 'tutorial.cue.chainHold', actions: ['fly', 'boost'], count: tenth(CHAIN_POWERED_SECONDS - car.poweredFlightTime) }
      : { key: 'tutorial.cue.chainBoost', actions: ['boost'] };
  }
  if (car.altitude > 0) return { key: 'tutorial.cue.chainLanding', actions: [] }; // thrust cut before the chain counted
  return { key: 'tutorial.cue.chainFly', actions: ['fly', 'boost'] };
}

function barrelRollCue({ car, phase }: CueState): TutorialCue {
  if (phase === 'flicked') return { key: 'tutorial.cue.rollOpposite', actions: ['left', 'right'] };
  if (phase === 'rolling') return { key: 'tutorial.cue.rollSpin', actions: [] };
  if (phase === 'readyToLand') {
    return (car.verticalSpeed ?? 0) < -ROLL_FAST_FALL ? { key: 'tutorial.cue.rollSoften', actions: ['fly'] } : { key: 'tutorial.cue.rollLand', actions: [] };
  }
  if (car.altitude > 0 && car.thrusting) {
    return car.altitude < ROLL_RELEASE_ALTITUDE ? { key: 'tutorial.cue.rollClimb', actions: ['fly'] } : { key: 'tutorial.cue.rollRelease', actions: ['fly', 'left', 'right'] };
  }
  if (car.altitude > 0) return { key: 'tutorial.cue.rollFlick', actions: ['left', 'right'] };
  return { key: 'tutorial.cue.rollFly', actions: ['fly'] };
}

export function tutorialCue(state: CueState): TutorialCue | null {
  if (state.phase === 'finishing') return { key: 'tutorial.cue.finishing', actions: [] };
  if (state.step === 'throttle') return state.car.speed > 5 ? null : { key: 'tutorial.cue.throttle', actions: ['throttle'] };
  if (state.step === 'drift') return driftCue(state);
  if (state.step === 'airChain') return airChainCue(state);
  if (state.step === 'barrelRoll') return barrelRollCue(state);
  if (state.step === 'boost' && state.countdown !== null) {
    return state.stretchEntered ? { key: 'tutorial.cue.boostGo', actions: ['boost'], count: tenth(state.countdown) }
      : { key: 'tutorial.cue.boostAhead', actions: ['boost'], n: state.countdown };
  }
  return null;
}
