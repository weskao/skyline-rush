import { ROAD_LIMIT } from './game.js';
import { raceTrack } from './race-tracks.ts';
import { CIRCUIT_ID, circuitLaps } from './circuit-track.ts';

export type GhostSample = [distance: number, x: number, altitude: number];
export interface GhostRun { time: number; samples: GhostSample[] }
export interface GhostRace {
  phase: string; elapsed: number;
  player: { distance: number; x: number; altitude: number };
}

export const GHOST_RATE = 10; // samples per second of race time

const round = (value: number): number => Math.round(value * 100) / 100;

// The pose after the previous step, per trace; a new trace (array) starts fresh, so it never needs clearing.
const previousPose = new WeakMap<GhostSample[], [elapsed: number, distance: number, x: number, altitude: number]>();

// Call after every stepRace; sample k is [distance, x, altitude] at race time k / GHOST_RATE, interpolated
// between physics steps so a step landing just past k / GHOST_RATE does not skew a fast jump.
export function recordGhost(samples: GhostSample[], race: GhostRace): void {
  const car = race.player, previous = previousPose.get(samples);
  while (race.phase === 'racing' && race.elapsed >= samples.length / GHOST_RATE) {
    const span = previous ? race.elapsed - previous[0] : 0;
    const t = span > 0 ? Math.max(0, (samples.length / GHOST_RATE - previous![0]) / span) : 1;
    const at = (from: number, to: number): number => round(from + (to - from) * t) || 0; // no -0: JSON saves it as 0
    samples.push(previous && t < 1 ? [at(previous[1], car.distance), at(previous[2], car.x), at(previous[3], car.altitude)]
      : [round(car.distance), round(car.x), round(car.altitude)]);
  }
  previousPose.set(samples, [race.elapsed, car.distance, car.x, car.altitude]);
}

// A saved ghost is untrusted: it must be a complete, physically possible run of this track.
export function validGhost(ghost: unknown, trackId: string, config?: unknown): ghost is GhostRun {
  const track = raceTrack(trackId);
  const laps = trackId === CIRCUIT_ID ? circuitLaps(config) : 1;
  if (!laps) return false;
  const length = (track?.length ?? 0) * laps;
  if (!track || !ghost || typeof ghost !== 'object') return false;
  const payload = ghost as Partial<GhostRun>;
  if (typeof payload.time !== 'number' || !Number.isFinite(payload.time) || payload.time <= 0 || !Array.isArray(payload.samples)) return false;
  const { samples } = payload;
  if (Math.abs(samples.length - (Math.floor(payload.time * GHOST_RATE) + 1)) > 1) return false;
  let previous = 0;
  for (const sample of samples) {
    if (!Array.isArray(sample) || sample.length !== 3 || !sample.every(Number.isFinite)) return false;
    const [distance, x, altitude] = sample;
    if (trackId === CIRCUIT_ID && distance - previous > 14.01) return false;
    if (distance < previous || distance > length || Math.abs(x) > ROAD_LIMIT || altitude < 0 || altitude > 12) return false;
    previous = distance;
  }
  return previous >= length - 15; // the last sample is at most 0.1 s short of the line
}

// shortcut: holds the last sample (≤ 0.1 s before the line) after it, upgrade if the finish pose matters
export function ghostAt(ghost: GhostRun, time: number): { distance: number; x: number; altitude: number } {
  const { samples } = ghost;
  const position = Math.max(0, Math.min(samples.length - 1, time * GHOST_RATE));
  const low = Math.floor(position), high = Math.min(low + 1, samples.length - 1), t = position - low;
  const [d0, x0, a0] = samples[low], [d1, x1, a1] = samples[high];
  return { distance: d0 + (d1 - d0) * t, x: x0 + (x1 - x0) * t, altitude: a0 + (a1 - a0) * t };
}
