import { RACE_TRACKS } from './race-tracks.ts';
import { CIRCUIT_ID, CIRCUIT_TRACK } from './circuit-track.ts';

// One source of truth for which ring/pickup layout a timed record was set on. A layout change makes
// older times incomparable, so layout 2+ records live under `<track>@<layout>` while layout 1 keeps
// the bare track id: saved data from before the change stays bit-for-bit where it was.

/** Modes with their own course: the track's ring layout never reaches them. */
const OWN_COURSE_MODES: ReadonlySet<unknown> = new Set(['endless', 'eventlab']);

export function layoutVersion(trackId: unknown): number {
  const track = trackId === CIRCUIT_ID ? CIRCUIT_TRACK : typeof trackId === 'string' && Object.hasOwn(RACE_TRACKS, trackId) ? RACE_TRACKS[trackId] : null;
  return track?.layoutVersion ?? 1;
}

/** The layout a race runs on; a Cup counts as its newest track. */
export function raceLayout(trackId: string, config?: unknown): number {
  const rules = config && typeof config === 'object' ? config as { mode?: unknown; cupTracks?: unknown } : {};
  if (OWN_COURSE_MODES.has(rules.mode)) return 1;
  const cup = Array.isArray(rules.cupTracks) ? rules.cupTracks : [];
  return Math.max(layoutVersion(trackId), ...cup.map(layoutVersion));
}

/** Storage id for a record: bare for layout 1, `<track>@<layout>` after a layout change. */
export function recordTrackId(trackId: string, config?: unknown): string {
  const layout = raceLayout(trackId, config);
  return layout > 1 ? `${trackId}@${layout}` : trackId;
}

/** Every record id a track has had: bare (layout 1) through its current layout. Older ones stay readable. */
export function recordTrackIds(trackId: string): string[] {
  return Array.from({ length: layoutVersion(trackId) }, (_, i) => i ? `${trackId}@${i + 1}` : trackId);
}

/** Inverse of recordTrackId for the given rules, older layouts included; null for ids no build ever wrote. */
export function parseRecordTrackId(id: unknown, config?: unknown): { trackId: string; layout: number } | null {
  if (typeof id !== 'string') return null;
  const [trackId, version, ...rest] = id.split('@');
  if (version === undefined) return trackId ? { trackId, layout: 1 } : null;
  const layout = Number(version);
  return !rest.length && trackId && layout > 1 && layout <= raceLayout(trackId, config) && String(layout) === version ? { trackId, layout } : null;
}

/** Runs saved before layout versions existed have no field and are layout 1. */
export function runLayout(run: object | null | undefined): number {
  const layout = (run as { layout?: unknown } | null | undefined)?.layout;
  return typeof layout === 'number' && Number.isSafeInteger(layout) && layout > 1 ? layout : 1;
}

/** Field added to a saved run, empty for layout 1 so those records keep their exact shape. */
export const layoutField = (trackId: string, config?: unknown): { layout?: number } => {
  const layout = raceLayout(trackId, config);
  return layout > 1 ? { layout } : {};
};

/** True when a saved run was set on the layout its track (or Cup) has today. */
export function isCurrentLayout(run: { track: string; rules?: unknown; layout?: unknown }): boolean {
  let config: unknown;
  try { config = typeof run.rules === 'string' ? JSON.parse(run.rules) : undefined; } catch { /* Opaque legacy rules: track layout only. */ }
  return runLayout(run) === raceLayout(run.track, config);
}
