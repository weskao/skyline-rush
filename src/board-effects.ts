// Task 5 board effects (concept board panels 2 and 5), shared by every map and car: pure per-tier choices read by
// world.js, aero-vfx.js and effects.js. All of them move uniforms or use the pooled particles, so nothing compiles
// after GO; Low and pages without `?look=3d` (look-gate.ts) keep the current look.
import type { VfxQuality } from './vfx-settings.ts';
import { look3d } from './look-gate.ts';

interface RaceLike { mode: string; session?: { presentation: { visualPreset?: string } } | null }
/** Weather preset the race shows: custom/free races carry the player's choice, every other mode the track's own. */
export const racePreset = (race: RaceLike): string =>
  race.mode === 'custom' || race.mode === 'free' ? race.session?.presentation.visualPreset ?? 'track' : 'track';
export const isRaining = (preset: string, trackId: string): boolean => preset === 'rain' || (preset === 'track' && trackId === 'neon');

const LOW_PLUME = { tail: 0, stretch: 1 }, BOARD_PLUME = { tail: 1, stretch: 1.35 };
/** Boost plume: Medium+ fades the blue-white core into a magenta tail about a third longer; Low keeps the current plume. */
export const plumeLook = (quality: VfxQuality): { tail: number; stretch: number } => quality === 'low' || !look3d() ? LOW_PLUME : BOARD_PLUME;

/** Rear thruster discs (§8.1 panel 3): bright in flight or under boost, a faint idle glow while racing; Low keeps the
 *  unlit nozzles. `boost` is the plume strength (0..1). */
export function thrusterGlow(quality: VfxQuality, racing: boolean, flying: boolean, boost: number): number {
  if (quality === 'low' || !racing || !look3d()) return 0;
  return Math.max(flying ? .9 : .3, Math.min(1, boost));
}

/** Rain spray particles per second off the rear wheels, full at 90 m/s; Low emits none (its rain streaks remain). */
export function sprayRate(quality: VfxQuality, speed: number): number {
  if (quality === 'low' || !look3d()) return 0;
  return (quality === 'high' ? 48 : 24) * Math.max(0, Math.min(1, speed / 90));
}
