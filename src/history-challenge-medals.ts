import { RACE_TRACKS } from './game.js';
import { readStored, writeStored, type HistoryStorage } from './history-storage.ts';

export const CHALLENGE_MEDALS_KEY = 'skyline-rush-challenge-medals-v1';
export const CHALLENGE_MEDALS = ['checkpoint-clean', 'long-flight', 'time-clean', 'aerial-combo', 'gauntlet-clear'] as const;
export type ChallengeMedalId = typeof CHALLENGE_MEDALS[number];
export interface ChallengeMedalState {
  version: 1;
  awards: Partial<Record<ChallengeMedalId, string>>;
  longestFlight: number;
  maxAerialCombo: number;
}
export interface ChallengeFinish {
  phase?: string;
  mode?: string;
  trackId?: string;
  result?: { success?: boolean; time?: number; collisions?: number };
  styleAttack?: { longestFlight?: number; maxAerialCombo?: number } | null;
  checkpoint?: { passed: number; missed: number; gates: readonly MedalGate[] } | null;
  hazards?: readonly MedalGate[];
}
interface MedalGate { passed?: boolean; missed?: boolean; hit?: boolean }
const MAX_SECONDS = 7 * 24 * 60 * 60;
const asRecord = (raw: unknown): Record<string, unknown> =>
  raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
const bounded = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const empty = (): ChallengeMedalState => ({ version: 1, awards: {}, longestFlight: 0, maxAerialCombo: 0 });

/** Local-only, allowlisted data; future backup versions must fail before any mutation. */
export function parseChallengeMedals(raw: unknown): ChallengeMedalState {
  if (raw === null || raw === undefined) return empty();
  const value = asRecord(raw);
  if (value.version !== 1) throw new TypeError('Unsupported personal medal data');
  const state = empty(), awards = asRecord(value.awards);
  for (const id of CHALLENGE_MEDALS) {
    const date = Object.hasOwn(awards, id) ? awards[id] : undefined;
    if (typeof date === 'string' && date.length <= 40 && Number.isFinite(Date.parse(date))) state.awards[id] = date;
  }
  if (bounded(value.longestFlight, MAX_SECONDS)) state.longestFlight = value.longestFlight;
  if (bounded(value.maxAerialCombo, 5) && Number.isInteger(value.maxAerialCombo)) state.maxAerialCombo = value.maxAerialCombo;
  return state;
}
export function loadChallengeMedals(storage?: HistoryStorage): ChallengeMedalState {
  try { return parseChallengeMedals(readStored(CHALLENGE_MEDALS_KEY, storage)); }
  catch { return empty(); }
}
export function mergeChallengeMedals(left: unknown, right: unknown): ChallengeMedalState {
  const a = parseChallengeMedals(left), b = parseChallengeMedals(right), awards = { ...a.awards };
  for (const id of CHALLENGE_MEDALS) {
    const date = b.awards[id];
    if (date && (!awards[id] || Date.parse(date) < Date.parse(awards[id]!))) awards[id] = date;
  }
  return { version: 1, awards, longestFlight: Math.max(a.longestFlight, b.longestFlight),
    maxAerialCombo: Math.max(a.maxAerialCombo, b.maxAerialCombo) };
}
export function canWriteChallengeMedals(storage?: HistoryStorage): boolean {
  const saved = asRecord(readStored(CHALLENGE_MEDALS_KEY, storage));
  return !(typeof saved.version === 'number' && saved.version > 1);
}

function validFinish(race: ChallengeFinish): boolean {
  return race.phase === 'finished' && typeof race.trackId === 'string' && Object.hasOwn(RACE_TRACKS, race.trackId) &&
    race.result?.success === true && bounded(race.result.time, MAX_SECONDS) && race.result.time > 0;
}
/** Called at completed settlement, never from the render loop or from imported History. */
export function recordChallengeMedals(race: ChallengeFinish, previous: ChallengeMedalState,
  storage?: HistoryStorage, now = new Date()): { state: ChallengeMedalState; awarded: ChallengeMedalId[] } {
  const state = mergeChallengeMedals(loadChallengeMedals(storage), previous);
  const awarded: ChallengeMedalId[] = [];
  if (!validFinish(race)) return { state, awarded };
  const eligible = new Set<ChallengeMedalId>();
  const checkpoint = race.checkpoint;
  if (race.mode === 'checkpoint' && race.result!.collisions === 0 && checkpoint?.missed === 0 &&
      Array.isArray(checkpoint.gates) && checkpoint.gates.length > 0 && checkpoint.passed === checkpoint.gates.length &&
      checkpoint.gates.every((gate: MedalGate | null) => gate?.passed === true && gate.missed !== true))
    eligible.add('checkpoint-clean');
  if (race.mode === 'time' && race.result!.collisions === 0) eligible.add('time-clean');
  if (race.mode === 'stunt') {
    const flight = race.styleAttack?.longestFlight, combo = race.styleAttack?.maxAerialCombo;
    if (bounded(flight, race.result!.time! + 1e-6)) {
      state.longestFlight = Math.max(state.longestFlight, flight);
      if (flight + 1e-6 >= 8) eligible.add('long-flight');
    }
    if (bounded(combo, 5) && Number.isInteger(combo)) {
      state.maxAerialCombo = Math.max(state.maxAerialCombo, combo);
      if (combo >= 3) eligible.add('aerial-combo');
    }
  }
  if (race.mode === 'gauntlet' && race.result!.collisions === 0 && Array.isArray(race.hazards) && race.hazards.length > 0 &&
      race.hazards.every((hazard: MedalGate | null) => hazard?.passed === true && hazard.hit === false))
    eligible.add('gauntlet-clear');
  for (const id of CHALLENGE_MEDALS) if (eligible.has(id) && !state.awards[id]) {
    state.awards[id] = now.toISOString(); awarded.push(id);
  }
  if (canWriteChallengeMedals(storage)) writeStored(CHALLENGE_MEDALS_KEY, state, storage);
  return { state, awarded };
}
