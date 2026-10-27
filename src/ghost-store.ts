import { loadGhost, saveGhost, loadModeGhost, saveModeGhost } from './history.ts';
import type { GhostRun } from './ghost.ts';

interface GhostRace { trackId: string; config: unknown }

/** Best-run ghosts, loaded and validated on first use: one per Classic track, one per Time Trial ruleset. */
export function createGhostStore() {
  const classicGhosts = new Map<string, GhostRun | null>();
  const modeGhosts = new Map<string, GhostRun | null>();
  const modeKey = (race: GhostRace): string => race.trackId + ':' + JSON.stringify(race.config);
  return {
    classic(trackId: string): GhostRun | null {
      if (!classicGhosts.has(trackId)) classicGhosts.set(trackId, loadGhost(trackId));
      return classicGhosts.get(trackId)!;
    },
    mode(race: GhostRace): GhostRun | null {
      const key = modeKey(race);
      if (!modeGhosts.has(key)) modeGhosts.set(key, loadModeGhost(race.trackId, race.config));
      return modeGhosts.get(key)!;
    },
    saveClassic(trackId: string, ghost: GhostRun): void { saveGhost(trackId, ghost); classicGhosts.set(trackId, ghost); },
    saveMode(race: GhostRace, ghost: GhostRun): void { saveModeGhost(race.trackId, race.config, ghost); modeGhosts.set(modeKey(race), ghost); },
  };
}
