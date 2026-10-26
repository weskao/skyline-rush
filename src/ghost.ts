import { RACE_TRACKS, ROAD_LIMIT } from './game.js';

export type GhostSample = [distance: number, x: number, altitude: number];
export interface GhostRun { time: number; samples: GhostSample[] }
export interface GhostRace {
  phase: string; elapsed: number;
  player: { distance: number; x: number; altitude: number };
}

export const GHOST_RATE = 10; // samples per second of race time

const round = (value: number): number => Math.round(value * 100) / 100;

// Call after every stepRace; sample k is [distance, x, altitude] at race time k / GHOST_RATE.
export function recordGhost(samples: GhostSample[], race: GhostRace): void {
  const car = race.player;
  while (race.phase === 'racing' && race.elapsed >= samples.length / GHOST_RATE) samples.push([round(car.distance), round(car.x), round(car.altitude)]);
}

// A saved ghost is untrusted: it must be a complete, physically possible run of this track.
export function validGhost(ghost: unknown, trackId: string): ghost is GhostRun {
  const track = (RACE_TRACKS as Record<string, { length: number }>)[trackId];
  if (!track || !ghost || typeof ghost !== 'object') return false;
  const payload = ghost as Partial<GhostRun>;
  if (typeof payload.time !== 'number' || !Number.isFinite(payload.time) || payload.time <= 0 || !Array.isArray(payload.samples)) return false;
  const { samples } = payload;
  if (Math.abs(samples.length - (Math.floor(payload.time * GHOST_RATE) + 1)) > 1) return false;
  let previous = 0;
  for (const sample of samples) {
    if (!Array.isArray(sample) || sample.length !== 3 || !sample.every(Number.isFinite)) return false;
    const [distance, x, altitude] = sample;
    if (distance < previous || distance > track.length || Math.abs(x) > ROAD_LIMIT || altitude < 0 || altitude > 12) return false;
    previous = distance;
  }
  return previous >= track.length - 15; // the last sample is at most 0.1 s short of the line
}

// shortcut: holds the last sample (≤ 0.1 s before the line) after it, upgrade if the finish pose matters
export function ghostAt(ghost: GhostRun, time: number): { distance: number; x: number; altitude: number } {
  const { samples } = ghost;
  const position = Math.max(0, Math.min(samples.length - 1, time * GHOST_RATE));
  const low = Math.floor(position), high = Math.min(low + 1, samples.length - 1), t = position - low;
  const [d0, x0, a0] = samples[low], [d1, x1, a1] = samples[high];
  return { distance: d0 + (d1 - d0) * t, x: x0 + (x1 - x0) * t, altitude: a0 + (a1 - a0) * t };
}
