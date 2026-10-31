/** Observe engine outcomes only. No mutation of the race, controls, or car. */
export type ManeuverLesson = 'airChain' | 'barrelRoll' | 'nitro';
export type ManeuverPhase = 'ready' | 'airborne' | 'flicked' | 'rolling' | 'sprinting';
export interface ManeuverSnapshot {
  altitude: number;
  thrusting: boolean;
  flightBoosted: boolean;
  poweredFlightTime: number;
  flick: { dir: number; time: number } | null;
  landing: { chain?: boolean } | null;
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
  let lastLanding = initial.landing;
  let lastPayout = initial.trickPayout;
  let lastFlick = initial.flick;
  let airborne = false;
  let rolling = false;
  let nitroActivated = false;
  let sprintSeconds = 0;
  let peakSpeed = initial.speed;
  return {
    get phase() { return phase; },
    get progress() {
      if (kind === 'nitro') return Math.min(1, sprintSeconds / NITRO_OBSERVE_SECONDS);
      return kind === 'airChain' ? (airborne ? 0.5 : 0) : (rolling ? 0.5 : 0);
    },
    update(car: ManeuverSnapshot, dt: number): boolean {
      if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return false;
      if (kind === 'airChain') {
        // The engine awards the chain only after 0.4s of powered flight. Do not tell
        // the learner to release FLY before that actual engine threshold is met.
        if (car.altitude > 0 && car.thrusting && car.flightBoosted && car.poweredFlightTime >= 0.4) {
          airborne = true;
          phase = 'airborne';
        }
        if (car.landing && car.landing !== lastLanding) {
          const earned = airborne && car.landing.chain === true;
          airborne = false;
          phase = 'ready';
          lastLanding = car.landing;
          return earned;
        }
        lastLanding = car.landing;
        return false;
      }
      if (kind === 'barrelRoll') {
        if (car.altitude > 0 && car.trick) {
          rolling = true;
          phase = 'rolling';
        } else if (car.altitude > 0 && car.flick && car.flick !== lastFlick) {
          // Surface the first real steering press before the opposite flick.
          phase = 'flicked';
        }
        lastFlick = car.flick;
        if (car.trickPayout && car.trickPayout !== lastPayout) {
          const earned = rolling && car.landing !== null && car.landing !== lastLanding &&
            car.trickPayout.nitro > 0 && !car.trickPayout.hard;
          rolling = false;
          phase = 'ready';
          lastPayout = car.trickPayout;
          lastLanding = car.landing;
          return earned;
        }
        if (car.landing && car.landing !== lastLanding) {
          rolling = false;
          phase = 'ready';
        }
        lastLanding = car.landing;
        lastPayout = car.trickPayout;
        return false;
      }
      if (!nitroActivated) {
        if (car.nitroUses > initial.nitroUses && car.nitroTime > 0) {
          nitroActivated = true;
          phase = 'sprinting';
        } else return false;
      }
      if (car.nitroTime <= 0) {
        sprintSeconds = 0;
        phase = 'ready';
        return false;
      }
      peakSpeed = Math.max(peakSpeed, car.speed);
      if (car.speed >= initial.speed && car.speed >= 0) sprintSeconds += Math.min(dt, 0.05);
      return sprintSeconds >= NITRO_OBSERVE_SECONDS && peakSpeed - initial.speed >= NITRO_SPEED_GAIN;
    },
  };
}
