import { createModeAudioState, modeAudioCues, type ModeAudioRace } from './mode-audio.ts';

// Pure race → sound transitions for the Web Audio engine: what to play this frame, never how it sounds.
interface AudioCar {
  boosting?: boolean; nitroTime: number; miniBoost: number; fuel: number;
  thrusting?: boolean;
  impact?: { time: number; intensity: number; kind?: string } | null;
  landing?: { time: number; speed: number } | null;
  nearMiss?: unknown; trick?: unknown;
}
export interface AudioRace extends ModeAudioRace {
  player: AudioCar & NonNullable<ModeAudioRace['player']>;
  elapsed: number;
  countdown: number;
  pickups: { taken?: boolean }[];
}
export interface AudioImpulse { intensity: number; landing: boolean; barrier: boolean }
export interface RaceAudioFrame {
  /** Stop ringing cues before playing this frame's sounds (new race or entering pause). */
  silence: boolean;
  /** Cue names and impulses in the order they happened. */
  sounds: (string | AudioImpulse)[];
  active: boolean;
  boosting: boolean;
}

export function createRaceAudioEvents() {
  const modeAudioState = createModeAudioState();
  let previousRace: AudioRace | undefined, previousPhase: string | null = null, previousCount: number | null = null;
  let lastImpact: AudioCar['impact'] = null, lastLanding: AudioCar['landing'] = null;
  let lastNearMiss: unknown = null, lastTrick: unknown = null;
  let wasThrusting = false, wasBoosting = false, lowCharge = false;
  let collectedPickups = new WeakSet<object>();
  // One frame object is reused every tick (no per-frame garbage); read it before the next update.
  const frame: RaceAudioFrame = { silence: false, sounds: [], active: false, boosting: false };

  return {
    // Transitions are consumed even while muted, so enabling audio never replays stale cues.
    update(race: AudioRace, enabled: boolean): RaceAudioFrame {
      const car = race.player;
      const active = race.phase === 'racing';
      const boosting = !!car.boosting || car.nitroTime > 0 || car.miniBoost > 0;
      const freshRace = race !== previousRace;
      const count = race.phase === 'countdown' ? Math.ceil(race.countdown) : null;
      const modeEvents = modeAudioCues(race, modeAudioState);
      const sounds = frame.sounds;
      sounds.length = 0;
      let silence = false;
      if (freshRace) {
        silence = true;
        previousRace = race;
        previousPhase = previousCount = null;
        lastImpact = lastLanding = lastNearMiss = lastTrick = null;
        wasThrusting = wasBoosting = lowCharge = false;
        collectedPickups = new WeakSet();
      }
      if (race.phase === 'paused' && previousPhase !== 'paused') silence = true;
      if (enabled) {
        if (count !== null && count !== previousCount) sounds.push('tick');
        if (active && previousPhase === 'countdown') sounds.push('go');
        if (race.phase === 'finished' && previousPhase !== 'finished' &&
            race.result?.success !== false && !['cup', 'stunt'].includes(race.mode)) sounds.push('finish');
        sounds.push(...modeEvents);
        if (active) {
          if (car.impact && car.impact !== lastImpact && race.elapsed - car.impact.time < 0.2)
            sounds.push({ intensity: car.impact.intensity, landing: false, barrier: car.impact.kind === 'barrier' });
          if (car.landing && car.landing !== lastLanding && race.elapsed - car.landing.time < 0.2)
            sounds.push({ intensity: Math.min(1, car.landing.speed / 14), landing: true, barrier: false });
          if (car.nearMiss && car.nearMiss !== lastNearMiss) sounds.push('near');
          if (car.trick && car.trick !== lastTrick) sounds.push('whoosh');
          if (car.thrusting && !wasThrusting) sounds.push('lift');
          if (boosting && !wasBoosting) sounds.push('boost');
          if (car.fuel < 20 && !lowCharge) sounds.push('low');
        }
      }
      for (const pickup of race.pickups) if (pickup.taken && !collectedPickups.has(pickup)) {
        collectedPickups.add(pickup);
        if (enabled && active && !freshRace) sounds.push('pickup');
      }
      previousPhase = race.phase;
      previousCount = count;
      lastImpact = car.impact;
      lastLanding = car.landing;
      lastNearMiss = car.nearMiss;
      lastTrick = car.trick;
      wasThrusting = active && !!car.thrusting;
      wasBoosting = active && boosting;
      if (car.fuel >= 30) lowCharge = false;
      else if (car.fuel < 20) lowCharge = true;
      frame.silence = silence; frame.active = active; frame.boosting = boosting;
      return frame;
    },
  };
}
