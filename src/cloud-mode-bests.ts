import { isModeTrack } from './race-tracks.ts';
import { circuitLaps } from './circuit-track.ts';

// Versioned permanent bests are separate from the rolling 50-race history.
export const MODE_NAMES = ['custom', 'time', 'gauntlet', 'checkpoint', 'cup', 'stunt', 'elimination', 'circuit'] as const;
const BESTS_LIMIT = 200;
type Mode = (typeof MODE_NAMES)[number];
type RecordValue = Record<string, unknown>;
interface StuntPeak { score: number; maxCombo: number; airTime: number; medal: string }
export interface PermanentModeBests {
  version: 1;
  bests: Record<string, number>;
  stunts: Record<string, StuntPeak>;
}
const asRecord = (value: unknown): RecordValue | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null;

function validModeKey(key: string): Mode | null {
  if (key.length > 4200) return null;
  try {
    const parsed: unknown = JSON.parse(key);
    if (!Array.isArray(parsed) || ![2, 3].includes(parsed.length)) return null;
    const config = asRecord(parsed[1]);
    const mode = config?.mode;
    if (parsed.length === 3 && (mode !== 'circuit' || parsed[2] !== 'lap')) return null;
    return typeof mode === 'string' && MODE_NAMES.includes(mode as Mode) && isModeTrack(parsed[0], mode) &&
      (mode !== 'circuit' || circuitLaps(config) !== null) ? mode as Mode : null;
  } catch { return null; }
}

export function mergeModeBests(local: unknown = {}, remote: unknown = null): PermanentModeBests {
  const left = asRecord(local);
  const right = asRecord(remote);
  if (remote && right?.version !== 1) throw new Error('Unsupported mode bests');
  const bests: Record<string, number> = {};
  const stunts: Record<string, StuntPeak> = {};
  for (const data of [right?.bests, left?.bests]) {
    const records = asRecord(data);
    if (!records) continue;
    for (const [key, value] of Object.entries(records)) {
      const mode = validModeKey(key);
      if (!mode || typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
          (mode !== 'stunt' && value === 0)) continue;
      bests[key] = bests[key] === undefined ? value
        : mode === 'stunt' ? Math.max(bests[key], value) : Math.min(bests[key], value);
    }
  }
  for (const data of [right?.stunts, left?.stunts]) {
    const records = asRecord(data);
    if (!records) continue;
    for (const [key, raw] of Object.entries(records)) {
      const value = asRecord(raw);
      if (validModeKey(key) !== 'stunt' || !value ||
          typeof value.score !== 'number' || !Number.isFinite(value.score) || value.score < 0) continue;
      const old = stunts[key];
      const peak = (n: unknown): number => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;
      const score = value.score;
      stunts[key] = {
        score: Math.max(score, old?.score ?? 0),
        maxCombo: Math.max(peak(value.maxCombo), old?.maxCombo ?? 0),
        airTime: Math.max(peak(value.airTime), old?.airTime ?? 0),
        medal: score >= (old?.score ?? -1) ? (typeof value.medal === 'string' ? value.medal.slice(0, 32) : '')
          : old.medal,
      };
      bests[key] = Math.max(bests[key] ?? 0, stunts[key].score);
    }
  }
  return {
    version: 1,
    bests: Object.fromEntries(Object.entries(bests).slice(-BESTS_LIMIT)),
    stunts: Object.fromEntries(Object.entries(stunts).slice(-BESTS_LIMIT)),
  };
}
