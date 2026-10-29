import { loadGhost, saveGhost, loadModeGhost, saveModeGhost } from './history.ts';
import { validGhost, type GhostRun } from './ghost.ts';

interface GhostRace { trackId: string; config: unknown; mode?: string; modifier?: string | null }
interface CustomHeat extends GhostRace { mode: string; phase: string; result?: { success?: boolean } | null }

/** Best-run ghosts: one per Classic track, one per Time Trial or Custom ruleset. */
export function createGhostStore() {
  const classicGhosts = new Map<string, GhostRun | null>();
  const modeGhosts = new Map<string, GhostRun | null>();
  const modeKeys = new WeakMap<GhostRace, string>();
  const modeKey = (race: GhostRace): string => {
    let key = modeKeys.get(race);
    if (key === undefined) { key = race.trackId + ':' + JSON.stringify(race.config); modeKeys.set(race, key); }
    return key;
  };
  function classic(trackId: string): GhostRun | null {
    if (!classicGhosts.has(trackId)) classicGhosts.set(trackId, loadGhost(trackId));
    return classicGhosts.get(trackId)!;
  }
  function mode(race: GhostRace): GhostRun | null {
    const key = modeKey(race);
    if (!modeGhosts.has(key)) modeGhosts.set(key, loadModeGhost(race.trackId, race.config));
    return modeGhosts.get(key)!;
  }
  function saveMode(race: GhostRace, ghost: GhostRun): void {
    saveModeGhost(race.trackId, race.config, ghost); modeGhosts.set(modeKey(race), ghost);
  }
  return {
    classic,
    mode,
    forRace(race: GhostRace): GhostRun | null {
      return race.modifier ? null : race.mode === 'classic' ? classic(race.trackId) :
        race.mode === 'time' || race.mode === 'custom' || race.mode === 'circuit' ? mode(race) : null;
    },
    saveClassic(trackId: string, ghost: GhostRun): void { saveGhost(trackId, ghost); classicGhosts.set(trackId, ghost); },
    saveMode,
    saveCustom(race: CustomHeat, ghost: GhostRun): boolean {
      if (race.mode !== 'custom' || race.modifier || race.phase !== 'finished' || race.result?.success === false || !validGhost(ghost, race.trackId)) return false;
      const previous = mode(race);
      if (previous && previous.time <= ghost.time) return false;
      saveMode(race, ghost);
      return true;
    },
  };
}
