import { validGhost, type GhostRun } from './ghost.ts';
import { readStored as read, writeStored as write, type HistoryStorage } from './history-storage.ts';

const GHOSTS_KEY = 'skyline-rush-ghosts';
const MODE_GHOST_KEY = 'skyline-rush-mode-ghosts-v1';
const GHOST_STORAGE_LIMIT = 512 * 1024;

const asRecord = (input: unknown): Record<string, unknown> =>
  input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};

function boundedGhosts(previous: unknown, key: string, ghost: unknown): Record<string, unknown> | null {
  try {
    const entries = { ...asRecord(previous) };
    delete entries[key];
    entries[key] = ghost;
    while (JSON.stringify(entries).length > GHOST_STORAGE_LIMIT && Object.keys(entries).length > 1)
      delete entries[Object.keys(entries)[0]];
    return JSON.stringify(entries).length <= GHOST_STORAGE_LIMIT ? entries : null;
  } catch { return null; }
}
const loadGhosts = (storage?: HistoryStorage): Record<string, unknown> => asRecord(read(GHOSTS_KEY, storage));

export function loadGhost(trackId: string, storage?: HistoryStorage): GhostRun | null {
  const ghost = loadGhosts(storage)[trackId];
  return validGhost(ghost, trackId) ? ghost : null;
}
export function saveGhost(trackId: string, ghost: unknown, storage?: HistoryStorage): void {
  const entries = boundedGhosts(loadGhosts(storage), trackId, ghost);
  if (entries) write(GHOSTS_KEY, entries, storage);
}
const modeGhostId = (trackId: string, config: unknown): string => trackId + ':' + JSON.stringify(config);
export function loadModeGhost(trackId: string, config: unknown, storage?: HistoryStorage): GhostRun | null {
  const ghosts = asRecord(read(MODE_GHOST_KEY, storage));
  const item = ghosts[modeGhostId(trackId, config)];
  return validGhost(item, trackId) ? item : null;
}
export function saveModeGhost(trackId: string, config: unknown, ghost: unknown, storage?: HistoryStorage): boolean {
  if (!validGhost(ghost, trackId)) return false;
  const previous = asRecord(read(MODE_GHOST_KEY, storage));
  const bounded = boundedGhosts(previous, modeGhostId(trackId, config), ghost);
  if (!bounded) return false;
  write(MODE_GHOST_KEY, bounded, storage);
  return true;
}
