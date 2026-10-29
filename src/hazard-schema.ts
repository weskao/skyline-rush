// ENV-02: the bounded, deterministic description of one authored or generated
// hazard. Validation is the trust boundary for imported/edited courses.
import { OBJECT_CATALOG, isGameplayType, type GameplayType, type Hitbox } from './object-catalog.ts';
import { RACE_TRACKS } from './game.js';

export type MovementPattern =
  | { readonly kind: 'static' }
  | { readonly kind: 'sweep'; readonly amplitude: number; readonly period: number; readonly phase: number }
  | { readonly kind: 'pulse' | 'rotate' | 'fall'; readonly period: number; readonly phase: number };
export type HazardDifficulty = 'standard' | 'extreme';

export interface HazardPlacement {
  readonly id: string; readonly trackId: string; readonly type: GameplayType;
  readonly distance: number; readonly lateralOffset: number; readonly altitude: number;
  readonly hitbox: Hitbox;
  /** Road distances over which the hazard is armed; it must include the hazard itself. */
  readonly triggerWindow: { readonly from: number; readonly to: number };
  readonly warningLeadSeconds: number; readonly movementPattern: MovementPattern;
  readonly difficulty: HazardDifficulty; readonly seed: number;
}

export const HAZARD_LIMITS = Object.freeze({
  maxDistance: 100000, maxLateral: 9, maxAltitude: 60, maxHalfExtent: 12, maxWindow: 2000,
  minWarning: 0.5, maxWarning: 6, maxSweep: 1.8, minPeriod: 0.5, maxPeriod: 30,
});
const KEYS = ['id', 'trackId', 'type', 'distance', 'lateralOffset', 'altitude', 'hitbox', 'triggerWindow',
  'warningLeadSeconds', 'movementPattern', 'difficulty', 'seed'];

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
function fail(field: string): never { throw new RangeError(`Invalid hazard placement: ${field}`); }

function readHitbox(value: unknown, fallback: Hitbox): Hitbox {
  if (value === undefined) return fallback;
  const box = value as Record<string, unknown>;
  const { maxHalfExtent: max } = HAZARD_LIMITS;
  if (!box || typeof box !== 'object' || !inRange(box.halfWidth, 0.1, max) || !inRange(box.halfLength, 0.1, max) ||
    !inRange(box.height, 0.1, max)) fail('hitbox');
  return Object.freeze({ halfWidth: box.halfWidth as number, halfLength: box.halfLength as number, height: box.height as number });
}

function readMovement(value: unknown): MovementPattern {
  const move = value as Record<string, unknown>;
  if (!move || typeof move !== 'object') fail('movementPattern');
  if (move.kind === 'static') return Object.freeze({ kind: 'static' });
  if (!['sweep', 'pulse', 'rotate', 'fall'].includes(move.kind as string) ||
    !inRange(move.period, HAZARD_LIMITS.minPeriod, HAZARD_LIMITS.maxPeriod) || !inRange(move.phase, 0, Math.PI * 2)) fail('movementPattern');
  if (move.kind !== 'sweep') return Object.freeze({ kind: move.kind, period: move.period, phase: move.phase } as MovementPattern);
  // A sweep never travels further than one lane, so the other lanes stay open.
  if (!inRange(move.amplitude, 0, HAZARD_LIMITS.maxSweep)) fail('movementPattern');
  return Object.freeze({ kind: 'sweep', amplitude: move.amplitude, period: move.period as number, phase: move.phase as number });
}

/** Returns a frozen, normalized copy or throws RangeError naming the first bad field. */
export function validateHazardPlacement(input: unknown): HazardPlacement {
  const raw = input as Record<string, unknown>;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('object');
  if (Object.keys(raw).some(key => !KEYS.includes(key))) fail('unknown key');
  const { id, trackId, type, distance, lateralOffset, altitude, triggerWindow, warningLeadSeconds, difficulty, seed } = raw;
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) fail('id');
  if (typeof trackId !== 'string' || !Object.hasOwn(RACE_TRACKS, trackId)) fail('trackId');
  if (typeof type !== 'string' || !isGameplayType(type)) fail('type');
  if (!inRange(distance, 0, HAZARD_LIMITS.maxDistance)) fail('distance');
  if (!inRange(lateralOffset, -HAZARD_LIMITS.maxLateral, HAZARD_LIMITS.maxLateral)) fail('lateralOffset');
  if (!inRange(altitude, 0, HAZARD_LIMITS.maxAltitude)) fail('altitude');
  const hitbox = readHitbox(raw.hitbox, OBJECT_CATALOG[type].hitbox);
  const window = triggerWindow as Record<string, unknown>;
  if (!window || typeof window !== 'object' || !inRange(window.from, 0, HAZARD_LIMITS.maxDistance) ||
    !inRange(window.to, 0, HAZARD_LIMITS.maxDistance) || window.to - window.from > HAZARD_LIMITS.maxWindow ||
    window.from > distance - hitbox.halfLength || window.to < distance + hitbox.halfLength) fail('triggerWindow');
  if (!inRange(warningLeadSeconds, HAZARD_LIMITS.minWarning, HAZARD_LIMITS.maxWarning)) fail('warningLeadSeconds');
  if (difficulty !== 'standard' && difficulty !== 'extreme') fail('difficulty');
  if (!Number.isInteger(seed) || !inRange(seed, 0, 0xffffffff)) fail('seed');
  return Object.freeze({ id, trackId, type, distance, lateralOffset, altitude, hitbox,
    triggerWindow: Object.freeze({ from: window.from as number, to: window.to as number }),
    warningLeadSeconds, movementPattern: readMovement(raw.movementPattern), difficulty, seed: seed as number });
}

/** World-space collision box in the same {from,to,left,right,bottom,top} shape as course obstacles. */
export function hazardBox({ distance, lateralOffset, altitude, hitbox }: HazardPlacement) {
  const round = (n: number) => Math.round(n * 1000) / 1000; // keep authored decimals exact across devices
  return { from: round(distance - hitbox.halfLength), to: round(distance + hitbox.halfLength),
    left: round(lateralOffset - hitbox.halfWidth), right: round(lateralOffset + hitbox.halfWidth),
    bottom: altitude, top: round(altitude + hitbox.height) };
}
