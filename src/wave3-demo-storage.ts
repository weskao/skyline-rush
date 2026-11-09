import { WAVE3_CATALOG_VERSION, WAVE3_EXPERIENCE_VERSION } from './wave3-experience-contract.ts';
import type { ExperienceSnapshot } from './wave3-experience-contract.ts';

/** Disposable cache only: never Cloud Save, real ownership, money or server migration. */
export const WAVE3_DEMO_STORAGE_PREFIX = 'skyline-rush-wave3-demo:v1:';
const MAX_BYTES = 64 * 1024;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 5 * 60 * 1000;
const ACCOUNT = /^[A-Za-z0-9_-]{1,128}$/;
const ITEM = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

type DemoStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Entry = { snapshot: ExperienceSnapshot; savedAt: number };
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const nonnegativeInt = (value: unknown, limit = 1_000_000_000): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= limit;
const account = (id: string | null): string | null => id === null ? 'guest' : ACCOUNT.test(id) ? id : null;
const withinTime = (time: unknown, min: number, max: number): time is number =>
  typeof time === 'number' && Number.isSafeInteger(time) && time >= min && time <= max;

function validSnapshot(value: unknown, id: string, savedAt: number): value is ExperienceSnapshot {
  if (!isRecord(value) || !exact(value, ['version', 'catalogVersion', 'mode', 'authority',
    'syncState', 'accountId', 'missions', 'demoPoints', 'demoInventory', 'equippedPreview', 'updatedAt'])) return false;
  if (value.version !== WAVE3_EXPERIENCE_VERSION || value.catalogVersion !== WAVE3_CATALOG_VERSION ||
    value.mode !== 'local-demo' || value.authority !== 'local' || value.syncState !== 'local-only' ||
    value.accountId !== id || !nonnegativeInt(value.demoPoints) ||
    !withinTime(value.updatedAt, Math.max(0, savedAt - RETENTION_MS), savedAt + FUTURE_SKEW_MS)) return false;
  if (!Array.isArray(value.demoInventory) || value.demoInventory.length > 256 ||
    !value.demoInventory.every(item => typeof item === 'string' && ITEM.test(item)) ||
    new Set(value.demoInventory).size !== value.demoInventory.length) return false;
  if (value.equippedPreview !== null &&
    (typeof value.equippedPreview !== 'string' || !value.demoInventory.includes(value.equippedPreview))) return false;
  if (!isRecord(value.missions) || Object.keys(value.missions).length > 64) return false;
  return Object.entries(value.missions).every(([missionId, raw]) => {
    if (!ITEM.test(missionId) || !isRecord(raw) ||
      !exact(raw, ['progress', 'goal', 'claimed', 'rewardDemoPoints'])) return false;
    return nonnegativeInt(raw.progress, 100_000) && nonnegativeInt(raw.goal, 100_000) && raw.goal > 0 &&
      raw.progress <= raw.goal && typeof raw.claimed === 'boolean' &&
      (!raw.claimed || raw.progress === raw.goal) && nonnegativeInt(raw.rewardDemoPoints, 1_000_000);
  });
}

function readEntry(raw: string, id: string, now: number): Entry | null {
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!isRecord(parsed) || !exact(parsed, ['version', 'accountId', 'savedAt', 'snapshot']) ||
    parsed.version !== WAVE3_EXPERIENCE_VERSION || parsed.accountId !== id ||
    !withinTime(parsed.savedAt, 0, now + FUTURE_SKEW_MS) || now - parsed.savedAt > RETENTION_MS ||
    !validSnapshot(parsed.snapshot, id, parsed.savedAt)) return null;
  return { savedAt: parsed.savedAt, snapshot: parsed.snapshot };
}

export function browserWave3DemoStorage(): DemoStorage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** A failed disk write returns false, but the current in-memory demo remains usable. */
export function createWave3DemoStorage(options: { storage?: DemoStorage | null; now?: () => number } = {}) {
  const storage = options.storage === undefined ? browserWave3DemoStorage() : options.storage;
  const now = options.now ?? Date.now;
  const memory = new Map<string, Entry>();
  const resetAccounts = new Set<string>();

  return {
    load(accountId: string | null, mode: 'local-demo' | 'server' = 'local-demo'): ExperienceSnapshot | null {
      const id = account(accountId);
      if (!id || mode !== 'local-demo' || resetAccounts.has(id)) return null;
      const currentTime = now();
      const cached = memory.get(id);
      if (cached) {
        if (readEntry(JSON.stringify({ version: WAVE3_EXPERIENCE_VERSION, accountId: id,
          savedAt: cached.savedAt, snapshot: cached.snapshot }), id, currentTime)) return cached.snapshot;
        memory.delete(id);
      }
      let raw: string | null;
      try { raw = storage?.getItem(WAVE3_DEMO_STORAGE_PREFIX + id) ?? null; } catch { return null; }
      if (raw === null) return null;
      const entry = readEntry(raw, id, currentTime);
      if (entry) { memory.set(id, entry); return entry.snapshot; }
      try { storage?.removeItem(WAVE3_DEMO_STORAGE_PREFIX + id); } catch { /* blocked storage */ }
      return null;
    },
    save(snapshot: ExperienceSnapshot, expectedAccountId: string | null = snapshot.accountId): boolean {
      const id = account(expectedAccountId);
      const time = now();
      if (!id || !withinTime(time, 0, Number.MAX_SAFE_INTEGER) || !validSnapshot(snapshot, id, time)) return false;
      let raw: string;
      try { raw = JSON.stringify({ version: WAVE3_EXPERIENCE_VERSION, accountId: id, savedAt: time, snapshot }); }
      catch { return false; }
      if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return false;
      const entry = readEntry(raw, id, time);
      if (!entry) return false;
      memory.set(id, entry);
      resetAccounts.delete(id);
      try { storage?.setItem(WAVE3_DEMO_STORAGE_PREFIX + id, raw); return !!storage; }
      catch { return false; }
    },
    resetDemo(accountId: string | null = null): void {
      const id = account(accountId);
      if (!id) return;
      memory.delete(id);
      resetAccounts.add(id);
      try { storage?.removeItem(WAVE3_DEMO_STORAGE_PREFIX + id); } catch { /* in-memory reset still applies */ }
    },
  };
}
