import type { HistoryStorage } from './history-storage.ts';
import { recordGhost, validGhost, type GhostRun, type GhostRace, type GhostSample } from './ghost.ts';
import { loadGhost, saveGhost, loadModeGhost, saveModeGhost } from './history-ghost.ts';

interface ReplayRace extends GhostRace {
  trackId: string; mode: string; modifier?: string | null; config: Record<string, unknown>;
  result?: { success?: boolean } | null;
}
const supported = (race: ReplayRace): boolean => !race.modifier &&
  (race.mode === 'classic' || race.mode === 'time' || race.mode === 'custom');

export function createRaceGhosts(storage?: HistoryStorage) {
  const cache = new Map<string, GhostRun | null>();
  const keys = new WeakMap<ReplayRace, string>();
  let traceRace: ReplayRace | null = null;
  let samples: GhostSample[] = [];
  function keyFor(race: ReplayRace): string {
    let key = keys.get(race);
    if (key === undefined) {
      key = race.mode === 'classic' ? race.trackId : race.trackId + ':' + JSON.stringify(race.config);
      keys.set(race, key);
    }
    return key;
  }
  function forRace(race: ReplayRace): GhostRun | null {
    if (!supported(race)) return null;
    const key = keyFor(race);
    if (!cache.has(key)) cache.set(key, race.mode === 'classic' ? loadGhost(race.trackId, storage) : loadModeGhost(race.trackId, race.config, storage));
    return cache.get(key) ?? null;
  }
  function capture(race: ReplayRace): void {
    if (!supported(race)) return;
    if (traceRace !== race) { traceRace = race; samples = []; }
    recordGhost(samples, race);
  }
  function save(race: ReplayRace, personalBest: boolean): boolean {
    if (!supported(race) || traceRace !== race || race.phase !== 'finished' || race.result?.success === false ||
      (race.mode !== 'custom' && !personalBest)) return false;
    const candidate = { time: race.elapsed, samples };
    if (!validGhost(candidate, race.trackId)) return false;
    const previous = forRace(race);
    if (race.mode === 'custom' && previous && previous.time <= candidate.time) return false;
    if (race.mode === 'classic') saveGhost(race.trackId, candidate, storage);
    else saveModeGhost(race.trackId, race.config, candidate, storage);
    cache.set(keyFor(race), candidate);
    return true;
  }
  return { forRace, capture, save };
}
