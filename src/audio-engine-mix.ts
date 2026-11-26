// Gated writer for the continuous engine/music AudioParams (Wave 1 / workstream 14). update() runs once per render
// frame; a setTargetAtTime to the value the param is already approaching changes nothing (the exponential approach
// is memoryless), so a write is skipped when the target moved less than `epsilon` from the last value written, and
// at most one write per `interval` of audio time for ramps. A move to or from exactly 0, or a jump of 10 % or more,
// is never delayed (engine stop, mute, a drift tier). One-shot cues never pass through here; they stay immediate.
export interface TargetParam { setTargetAtTime(target: number, time: number, timeConstant: number): void }
interface Written { value: number; time: number }

export const MIX_INTERVAL = 1 / 30; // s of audio time between continuous writes per param (the shortest time constant is 60 ms)
const JUMP = 0.1;  // a state change this large (relative) is an event, not a ramp: written at once, never delayed

export function createParamMixer(interval = MIX_INTERVAL) {
  // Keyed by the AudioParam itself: a rebuilt AudioContext has new params, so stale entries can never match.
  const written = new WeakMap<object, Written>();
  return {
    /** Returns true when the write reached the audio thread. `epsilon` is in the param's own unit. */
    set(param: TargetParam, target: number, timeConstant: number, now: number, epsilon: number): boolean {
      const last = written.get(param);
      if (last) {
        if (Math.abs(target - last.value) <= epsilon && (target !== 0 || last.value === 0)) return false;
        const age = now - last.time, jump = Math.abs(target - last.value) >= JUMP * Math.max(Math.abs(target), Math.abs(last.value));
        if (age >= 0 && age < interval && !jump && (target === 0) === (last.value === 0)) return false;
        last.value = target; last.time = now;
      } else written.set(param, { value: target, time: now });
      param.setTargetAtTime(target, now, timeConstant);
      return true;
    },
    /** Another code path wrote this param directly (cancel/set): the next target must always be written. */
    forget(param: object): void { written.delete(param); },
  };
}

export interface EngineNodes {
  oscillator: { frequency: TargetParam }; filter: { frequency: TargetParam };
  gain: { gain: TargetParam }; thrustGain: { gain: TargetParam }; windGain: { gain: TargetParam };
  skidGain: { gain: TargetParam }; music: { gain: TargetParam };
}
export interface EngineCar { speed: number; altitude: number; thrusting?: boolean; braking?: boolean; drift?: { time: number } | null }
// Per-param epsilon (own unit): far below a perceptible change, so a skipped write never audibly differs.
const EPS = { pitch: 0.3, cutoff: 3, engine: 0.0002, thrust: 0.001, wind: 0.0005, skid: 0.001, music: 0.003 };

/** The continuous engine/music targets for this frame (the former unconditional block of sound.update()). */
export function writeEngineParams(mixer: ReturnType<typeof createParamMixer>, n: EngineNodes, car: EngineCar,
  active: boolean, boosting: boolean, musicTarget: number, skidTier: number, now: number): void {
  mixer.set(n.oscillator.frequency, 35 + car.speed * 1.5 + (boosting ? 45 : 0), 0.12, now, EPS.pitch);
  mixer.set(n.filter.frequency, boosting ? 850 : 180 + car.speed * 3, 0.15, now, EPS.cutoff);
  mixer.set(n.gain.gain, active ? 0.014 + car.speed * 0.00016 : 0, 0.06, now, EPS.engine);
  mixer.set(n.thrustGain.gain, active && (car.thrusting || boosting) ? 0.055 : 0, 0.08, now, EPS.thrust);
  mixer.set(n.windGain.gain, active ? (car.speed / 102) ** 2 * 0.07 : 0, 0.1, now, EPS.wind);
  const skid = car.drift ? 0.035 + skidTier * 0.012 : car.braking ? 0.035 : 0;
  mixer.set(n.skidGain.gain, active && car.altitude < 0.2 && car.speed > 15 ? skid : 0, 0.06, now, EPS.skid);
  mixer.set(n.music.gain, musicTarget, 0.1, now, EPS.music);
}
