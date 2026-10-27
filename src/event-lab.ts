import { RACE_TRACKS, RING_RADIUS } from './game.js';
import { seededRng } from './rng.ts';
import type { Hazard } from './hazards.ts';
import type { TrackConfig } from './game-types.ts';
import { createRaceSessionContract } from './race-session.ts';

export const COURSE_BYTES = 16384;
export const COURSE_OBJECTS = 24;
export const COURSE_LANES = Object.freeze([-7.5, -2.5, 2.5, 7.5]);
export type CourseKind = 'barrier' | 'ring' | 'pickup';
export interface CourseObject { readonly kind: CourseKind; readonly distance: number; readonly lane: number }
export interface CourseDocument {
  readonly version: 1; readonly label: string; readonly trackId: string; readonly seed: number;
  readonly modifier: 'standard' | 'relaxed'; readonly objects: readonly CourseObject[];
}
export interface CourseObstacle { from: number; to: number; left: number; right: number; bottom: number; top: number }
interface CourseStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
const STORE = 'skyline-rush-event-lab-v1';
const tracks = RACE_TRACKS as Record<string, TrackConfig>;
const EXCLUDED = new Set(['gap', 'launch', 'tunnel', 'boost-tunnel', 'shortcut']);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export class CourseError extends RangeError {
  code: string;
  constructor(code: string) { super('Invalid course: ' + code); this.code = code; }
}
const requireCourse: (condition: unknown, code: string) => asserts condition = (condition, code) => {
  if (!condition) throw new CourseError(code);
};
const keys = (v: Record<string, unknown>, allowed: readonly string[]) => Object.keys(v).every(key => allowed.includes(key));

/** One trust boundary for editor, import, saved draft and every launch/retry. */
export function validateCourse(value: unknown, unlocked: ReadonlySet<string>, obstacles: readonly CourseObstacle[] = []): CourseDocument {
  requireCourse(record(value) && keys(value, ['version', 'label', 'trackId', 'seed', 'modifier', 'objects']), 'format');
  requireCourse(value.version === 1, 'version');
  requireCourse(typeof value.trackId === 'string' && Object.hasOwn(tracks, value.trackId), 'track');
  requireCourse(unlocked.has(value.trackId), 'locked');
  requireCourse(typeof value.label === 'string' && /^[\p{L}\p{N} ._'()!?-]{1,40}$/u.test(value.label) && value.label.trim().length, 'label');
  requireCourse(typeof value.seed === 'number' && Number.isInteger(value.seed) && value.seed >= 0 && value.seed <= 0xffffffff, 'seed');
  requireCourse(value.modifier === 'standard' || value.modifier === 'relaxed', 'format');
  requireCourse(Array.isArray(value.objects) && value.objects.length > 0 && value.objects.length <= COURSE_OBJECTS, 'count');
  const track = tracks[value.trackId];
  const objects = value.objects.map(raw => {
    requireCourse(record(raw) && keys(raw, ['kind', 'distance', 'lane']), 'format');
    requireCourse(raw.kind === 'barrier' || raw.kind === 'ring' || raw.kind === 'pickup', 'kind');
    requireCourse(typeof raw.lane === 'number' && Number.isInteger(raw.lane) && raw.lane >= 0 && raw.lane <= 3, 'bounds');
    requireCourse(raw.kind !== 'ring' || [1, 2].includes(raw.lane), 'bounds');
    requireCourse(typeof raw.distance === 'number' && Number.isInteger(raw.distance) && raw.distance % 10 === 0 &&
      raw.distance >= 200 && raw.distance <= track.length - 200, 'bounds');
    requireCourse(!track.sections.some(s => EXCLUDED.has(s.type) && raw.distance as number >= s.from - 80 && (raw.distance as number) <= s.to + 80), 'section');
    const x = COURSE_LANES[raw.lane], half = raw.kind === 'ring' ? RING_RADIUS : raw.kind === 'barrier' ? 1.55 : 1;
    const bottom = raw.kind === 'ring' ? 5 - RING_RADIUS : 0, top = raw.kind === 'ring' ? 5 + RING_RADIUS : 2.5;
    requireCourse(!obstacles.some(o => (raw.distance as number) >= o.from - 8 && (raw.distance as number) <= o.to + 8 &&
      x + half >= o.left - 1 && x - half <= o.right + 1 && bottom <= o.top && top >= o.bottom), 'blocked');
    return Object.freeze({ kind: raw.kind, distance: raw.distance, lane: raw.lane });
  }).sort((a, b) => a.distance - b.distance);
  // At most one barrier per 40 m leaves three lanes open. Rings need 150 m so all fit the 7-ring pool.
  for (let i = 1; i < objects.length; i++) requireCourse(objects[i].distance - objects[i - 1].distance >= 40, 'spacing');
  const rings = objects.filter(o => o.kind === 'ring');
  for (let i = 1; i < rings.length; i++) requireCourse(rings[i].distance - rings[i - 1].distance >= 150, 'spacing');
  return Object.freeze({ version: 1, label: value.label.trim(), trackId: value.trackId, seed: value.seed,
    modifier: value.modifier, objects: Object.freeze(objects) });
}

export function importCourse(json: string, unlocked: ReadonlySet<string>, obstacles: readonly CourseObstacle[] = []): CourseDocument {
  requireCourse(typeof json === 'string' && json.length <= COURSE_BYTES && new TextEncoder().encode(json).byteLength <= COURSE_BYTES, 'size');
  let value: unknown;
  try { value = JSON.parse(json); } catch { throw new CourseError('format'); }
  return validateCourse(value, unlocked, obstacles);
}
export const exportCourse = (document: CourseDocument): string => JSON.stringify(document, null, 2);

export function createCourse(trackId: string, template: 'slalom' | 'collect', seed: number, unlocked: ReadonlySet<string>, obstacles: readonly CourseObstacle[] = []): CourseDocument {
  requireCourse(typeof trackId === 'string' && Object.hasOwn(tracks, trackId), 'track');
  const random = seededRng(seed, 'event-lab-template-v1');
  const objects: CourseObject[] = [];
  for (let distance = 300; distance < tracks[trackId].length - 200 && objects.length < 12; distance += 160) {
    const kind: CourseKind = template === 'slalom' ? objects.length % 2 ? 'pickup' : 'barrier' : objects.length % 2 ? 'ring' : 'pickup';
    const lane = kind === 'ring' ? 1 + Math.floor(random() * 2) : Math.floor(random() * 4);
    try {
      validateCourse({ version: 1, label: 'My course', trackId, seed, modifier: 'standard', objects: [{ kind, distance, lane }] }, unlocked, obstacles);
      objects.push({ kind, distance, lane });
    } catch (error) { if (!(error instanceof CourseError) || !['section', 'blocked'].includes(error.code)) throw error; }
  }
  return validateCourse({ version: 1, label: 'My course', trackId, seed, modifier: 'standard', objects }, unlocked, obstacles);
}

export function createCourseHistory(initial: CourseDocument) {
  let current = initial;
  const past: CourseDocument[] = [], future: CourseDocument[] = [];
  const commit = (next: CourseDocument): CourseDocument => {
    if (JSON.stringify(next) === JSON.stringify(current)) return current;
    past.push(current); if (past.length > 30) past.shift();
    future.length = 0; current = next; return current;
  };
  return { current: () => current, commit, reset: commit, canUndo: () => past.length > 0, canRedo: () => future.length > 0,
    undo(): CourseDocument { if (past.length) { future.push(current); current = past.pop()!; } return current; },
    redo(): CourseDocument { if (future.length) { past.push(current); current = future.pop()!; } return current; } };
}
export function saveCourse(document: CourseDocument, storage?: CourseStorage): boolean {
  try { (storage ?? globalThis.localStorage).setItem(STORE, exportCourse(document)); return true; } catch { return false; }
}
export function loadCourse(unlocked: ReadonlySet<string>, storage?: CourseStorage): CourseDocument | null {
  try { const value = (storage ?? globalThis.localStorage).getItem(STORE); return value ? importCourse(value, unlocked) : null; } catch { return null; }
}

interface RuntimeCourseRace {
  trackId: string; config: Record<string, unknown>; props: CourseObstacle[];
}
/** Compile into existing pooled renderer/simulation arrays, never editor-only metadata. */
export function compileCourse<T extends RuntimeCourseRace>(race: T, raw: CourseDocument, unlocked: ReadonlySet<string>) {
  const document = validateCourse(raw, unlocked, race.props);
  requireCourse(race.trackId === document.trackId, 'track');
  const course = JSON.stringify(document);
  const config = Object.freeze({ ...race.config, mode: 'eventlab', course, ...(document.modifier === 'relaxed' ? { collision: 'relaxed' } : {}) });
  const baseSession = createRaceSessionContract(document.trackId, document.seed, race.config);
  const hazards: Hazard[] = document.objects.filter(o => o.kind === 'barrier').map(o => ({ distance: o.distance,
    x: COURSE_LANES[o.lane], altitude: 0, moving: false, phase: 0, speed: 0, hit: false, passed: false }));
  return Object.assign(race, { mode: 'eventlab', config, eventCourse: document, seed: document.seed,
    session: Object.freeze({ ...baseSession, mode: 'eventlab', rulesSignature: JSON.stringify(config) }),
    hazards, pickups: document.objects.filter(o => o.kind === 'pickup').map(o => ({ distance: o.distance, x: COURSE_LANES[o.lane], altitude: 0, tier: 'can', taken: false })),
    rings: document.objects.filter(o => o.kind === 'ring').map((o, i) => ({ distance: o.distance, x: COURSE_LANES[o.lane], altitude: 5, radius: RING_RADIUS, type: 'nitro', group: i, collected: false })),
  });
}
