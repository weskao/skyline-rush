import { CHAIN_HARD_LANDING, CHAIN_POWERED_SECONDS } from './air-chain.ts';

/** Observe engine outcomes only. No mutation of the race, controls, or car. */
export type ManeuverLesson = 'airChain' | 'barrelRoll' | 'nitro';
export type ManeuverPhase = 'ready' | 'airborne' | 'flicked' | 'rolling' | 'readyToLand' | 'sprinting' | 'retry';
/** Why the last attempt missed, so the coach can name the fix. */
export type RetryReason = 'noBoost' | 'short' | 'hard' | 'slow' | 'noRoll' | 'early';
export interface ManeuverSnapshot {
  altitude: number;
  thrusting: boolean;
  flightBoosted: boolean;
  poweredFlightTime: number;
  flick: { dir: number; time: number } | null;
  landing: { chain?: boolean; speed?: number } | null;
  trick: { done: boolean } | null;
  trickPayout: { nitro: number; hard: boolean } | null;
  nitroUses: number;
  nitroTime: number;
  speed: number;
}
const NITRO_OBSERVE_SECONDS = 1.6;
const NITRO_SPEED_GAIN = 5;
export function createTutorialManeuverState(kind: ManeuverLesson, initial: ManeuverSnapshot) {
  let phase: ManeuverPhase = 'ready';
  let reason: RetryReason | null = null;
  let boosted = false;
  let lastLanding = initial.landing;
  let lastPayout = initial.trickPayout;
  let lastFlick = initial.flick;
  let airborne = false;
  let attemptedFlight = false;
  let rolling = false;
  let nitroActivated = false;
  let sprintSeconds = 0;
  let startSpeed = initial.speed, peakSpeed = initial.speed;
  return {
    get phase() { return phase; },
    get reason() { return phase === 'retry' ? reason : null; },
    get progress() {
      if (kind === 'nitro') return Math.min(1, sprintSeconds / NITRO_OBSERVE_SECONDS);
      return kind === 'airChain' ? (airborne ? 0.5 : 0) : (rolling ? 0.5 : 0);
    },
    update(car: ManeuverSnapshot, dt: number): boolean {
      if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return false;
      if (kind === 'airChain') {
        if (car.altitude > 0 && car.thrusting) attemptedFlight = true;
        if (car.flightBoosted) boosted = true; // the engine clears it on touchdown
        // The engine awards the chain only after 0.4s of powered flight. Do not tell
        // the learner to release FLY before that actual engine threshold is met.
        if (car.altitude > 0 && car.thrusting && car.flightBoosted && car.poweredFlightTime >= CHAIN_POWERED_SECONDS) {
          airborne = true;
          phase = 'airborne';
        }
        if (car.landing && car.landing !== lastLanding) {
          const earned = airborne && car.landing.chain === true;
          reason = !boosted ? 'noBoost' : !airborne ? 'short' : (car.landing.speed ?? 0) >= CHAIN_HARD_LANDING ? 'hard' : 'slow';
          phase = !earned && attemptedFlight ? 'retry' : 'ready';
          airborne = attemptedFlight = boosted = false;
          lastLanding = car.landing;
          return earned;
        }
        lastLanding = car.landing;
        return false;
      }
      if (kind === 'barrelRoll') {
        if (car.altitude > 0) attemptedFlight = true;
        if (car.altitude > 0 && car.trick) {
          rolling = true;
          // A real trick needs 0.7s to finish. Do not cue landing too early.
          phase = car.trick.done ? 'readyToLand' : 'rolling';
        } else if (car.altitude > 0 && car.flick && car.flick !== lastFlick) {
          // Surface the first real steering press before the opposite flick.
          phase = 'flicked';
        }
        lastFlick = car.flick;
        if (car.trickPayout && car.trickPayout !== lastPayout) {
          const earned = rolling && car.landing !== null && car.landing !== lastLanding &&
            car.trickPayout.nitro > 0 && !car.trickPayout.hard;
          reason = car.trickPayout.hard ? 'hard' : 'noRoll';
          rolling = false;
          phase = !earned && attemptedFlight ? 'retry' : 'ready';
          attemptedFlight = false;
          lastPayout = car.trickPayout;
          lastLanding = car.landing;
          return earned;
        }
        if (car.landing && car.landing !== lastLanding) {
          reason = rolling ? 'early' : 'noRoll'; // a roll still spinning at touchdown pays nothing
          rolling = false;
          phase = attemptedFlight ? 'retry' : 'ready';
          attemptedFlight = false;
        }
        lastLanding = car.landing;
        lastPayout = car.trickPayout;
        return false;
      }
      if (!nitroActivated) {
        if (car.nitroUses > initial.nitroUses && car.nitroTime > 0) {
          nitroActivated = true;
          phase = 'sprinting';
          // Measure the sprint from activation: speed gained by driving before the press is not NITRO's.
          startSpeed = peakSpeed = car.speed;
        } else return false;
      }
      if (car.nitroTime <= 0) {
        sprintSeconds = 0;
        // A failed, spent charge requires a new player press, not fake success.
        phase = 'retry';
        return false;
      }
      peakSpeed = Math.max(peakSpeed, car.speed);
      if (car.speed >= startSpeed && car.speed >= 0) sprintSeconds += Math.min(dt, 0.05);
      return sprintSeconds >= NITRO_OBSERVE_SECONDS && peakSpeed - startSpeed >= NITRO_SPEED_GAIN;
    },
  };
}
