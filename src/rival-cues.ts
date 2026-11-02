import type { RivalTake } from './rival-items.ts';

// Which rival moments the player notices (stage 2, user 2026-11-02): a rival taking a NITRO item or firing
// NITRO near the player. Several cars at once never stack: at most one cue of each kind per RIVAL_CUE_GAP.
// Pure: effects.js draws the burst, race-audio-events.ts picks the sound, each with its own instance.
export const RIVAL_CUE_GAP = 0.4; // s between two cues of one kind
export const RIVAL_CUE_RANGE = 120; // m from the player: farther away it is not the player's moment

interface CueRival { distance: number; x: number; altitude?: number; nitroUses?: number; lastTake?: RivalTake | null }
export interface RivalCueRace { elapsed: number; player: { distance: number }; rivals: readonly CueRival[] }
export interface RivalCue { kind: 'take' | 'nitro'; distance: number; x: number; altitude: number; item: string }

export function createRivalCues() {
  let current: RivalCueRace | undefined, lastTake = -Infinity, lastNitro = -Infinity;
  let seenTakes = new WeakSet<object>(), nitroUses = new WeakMap<object, number>();
  const cues: RivalCue[] = []; // reused: read before the next update
  return {
    update(race: RivalCueRace): RivalCue[] {
      cues.length = 0;
      const fresh = race !== current; // a new race shows nothing it already had
      if (fresh) { current = race; lastTake = lastNitro = -Infinity; seenTakes = new WeakSet(); nitroUses = new WeakMap(); }
      const near = (distance: number) => Math.abs(distance - race.player.distance) <= RIVAL_CUE_RANGE;
      for (const rival of race.rivals) {
        const took = rival.lastTake;
        if (took && !seenTakes.has(took)) {
          seenTakes.add(took);
          if (!fresh && near(took.distance) && race.elapsed - lastTake >= RIVAL_CUE_GAP) {
            lastTake = race.elapsed;
            cues.push({ kind: 'take', distance: took.distance, x: took.x, altitude: took.altitude, item: took.kind });
          }
        }
        const uses = rival.nitroUses ?? 0, before = nitroUses.get(rival) ?? uses;
        nitroUses.set(rival, uses);
        if (!fresh && uses > before && near(rival.distance) && race.elapsed - lastNitro >= RIVAL_CUE_GAP) {
          lastNitro = race.elapsed;
          cues.push({ kind: 'nitro', distance: rival.distance, x: rival.x, altitude: rival.altitude ?? 0, item: 'nitro' });
        }
      }
      return cues;
    },
  };
}
