import { DEMO_BALANCE_LIMIT, DEMO_REPLAY_LIMIT, DEMO_RETENTION_MS, WAVE3_CATALOG_VERSION, WAVE3_EXPERIENCE_VERSION, validDemoEconomy } from './wave3-experience-contract.ts';
import type { ExperienceSnapshot } from './wave3-experience-contract.ts';
import type { Wave3DemoCheckpoint } from './wave3-local-demo.ts';

/** Disposable cache only: never Cloud Save, real ownership, money or server migration. */
export const WAVE3_DEMO_STORAGE_PREFIX = 'skyline-rush-wave3-demo:v1:';
const MAX_BYTES = 64 * 1024;
const FUTURE_SKEW_MS = 5 * 60 * 1000;
const ACCOUNT = /^[A-Za-z0-9_-]{1,128}$/;
const ITEM = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

type DemoStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Replay = Readonly<Pick<Wave3DemoCheckpoint, 'seenEvents' | 'settledCompletions' | 'generation' | 'missionTime'>>;
type Entry = { snapshot: ExperienceSnapshot; savedAt: number; checkpoint?: Replay };
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const nonnegativeInt = (value: unknown, limit = DEMO_BALANCE_LIMIT): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= limit;
const account = (id: string | null): string | null => id === null ? 'guest' : ACCOUNT.test(id) ? id : null;
const withinTime = (time: unknown, min: number, max: number): time is number =>
  typeof time === 'number' && Number.isSafeInteger(time) && time >= min && time <= max;

function validSnapshot(value: unknown, id: string, savedAt: number): value is ExperienceSnapshot {
  if (!isRecord(value)) return false;
  const keys = ['version', 'catalogVersion', 'mode', 'authority',
    'syncState', 'accountId', 'missions', 'demoPoints', 'demoInventory', 'equippedPreview', 'updatedAt'];
  if (Object.hasOwn(value, 'demoEconomy')) {
    if (!validDemoEconomy(value.demoEconomy)) return false;
    keys.push('demoEconomy');
  }
  if (!exact(value, keys)) return false;
  if (value.version !== WAVE3_EXPERIENCE_VERSION || value.catalogVersion !== WAVE3_CATALOG_VERSION ||
    value.mode !== 'local-demo' || value.authority !== 'local' || value.syncState !== 'local-only' ||
    value.accountId !== id || !nonnegativeInt(value.demoPoints) ||
    !withinTime(value.updatedAt, Math.max(0, savedAt - DEMO_RETENTION_MS), savedAt + FUTURE_SKEW_MS)) return false;
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

const validReplay = (value: unknown): value is Replay => isRecord(value) &&
  Object.keys(value).every(key => ['seenEvents', 'settledCompletions', 'generation', 'missionTime'].includes(key)) &&
  (!Object.hasOwn(value, 'generation') || typeof value.generation === 'string' &&
    value.generation.length >= 4 && ITEM.test(value.generation)) &&
  (!Object.hasOwn(value, 'missionTime') || withinTime(value.missionTime, 0, Number.MAX_SAFE_INTEGER)) &&
  Array.isArray(value.seenEvents) && Array.isArray(value.settledCompletions) &&
  value.seenEvents.length <= DEMO_REPLAY_LIMIT && value.settledCompletions.length <= DEMO_REPLAY_LIMIT &&
  [...value.seenEvents, ...value.settledCompletions].every(
    id => typeof id === 'string' && ITEM.test(id) && id.length >= 4,
  ) &&
  new Set(value.seenEvents).size === value.seenEvents.length &&
  new Set(value.settledCompletions).size === value.settledCompletions.length;

function readEntry(raw: string, id: string, now: number): Entry | null {
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!isRecord(parsed) || !(exact(parsed, ['version', 'accountId', 'savedAt', 'snapshot']) ||
    exact(parsed, ['version', 'accountId', 'savedAt', 'snapshot', 'checkpoint'])) ||
    parsed.version !== WAVE3_EXPERIENCE_VERSION || parsed.accountId !== id ||
    !withinTime(parsed.savedAt, 0, now + FUTURE_SKEW_MS) || now - parsed.savedAt > DEMO_RETENTION_MS ||
    !validSnapshot(parsed.snapshot, id, parsed.savedAt) ||
    (Object.hasOwn(parsed, 'checkpoint') && !validReplay(parsed.checkpoint))) return null;
  return { savedAt: parsed.savedAt, snapshot: parsed.snapshot,
    ...(Object.hasOwn(parsed, 'checkpoint') ? { checkpoint: parsed.checkpoint as Replay } : {}) };
}

/** The wallet and ownership are the priority. Keep the newest completion IDs, then fit telemetry. */
function serializeEntry(snapshot: ExperienceSnapshot, savedAt: number, replay?: Replay): string {
  const base = { version: WAVE3_EXPERIENCE_VERSION, accountId: snapshot.accountId, savedAt, snapshot };
  if (!replay) return JSON.stringify(base);
  const checkpoint = { ...replay, seenEvents: [] as string[], settledCompletions: [] as string[] };
  const entry = { ...base, checkpoint };
  let bytes = new TextEncoder().encode(JSON.stringify(entry)).byteLength;
  const keepRecent = (ids: readonly string[], retained: string[]) => {
    for (const id of ids.slice(-DEMO_REPLAY_LIMIT).reverse()) {
      // Valid IDs are ASCII and need no JSON escaping.
      const size = id.length + 2 + Number(retained.length > 0);
      if (bytes + size > MAX_BYTES) break;
      bytes += size;
      retained.push(id);
    }
    retained.reverse();
  };
  keepRecent(replay.settledCompletions, checkpoint.settledCompletions);
  keepRecent(replay.seenEvents, checkpoint.seenEvents);
  return JSON.stringify(entry);
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
  const persist = (snapshot: ExperienceSnapshot, expectedAccount: string | null, checkpoint?: Replay): boolean => {
    const id = account(expectedAccount);
    const time = now();
    if (!id || !withinTime(time, 0, Number.MAX_SAFE_INTEGER) || !validSnapshot(snapshot, id, time) ||
      (checkpoint && !validReplay(checkpoint))) return false;
    let raw: string;
    try { raw = serializeEntry(snapshot, time, checkpoint); }
    catch { return false; }
    if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return false;
    const entry = readEntry(raw, id, time);
    if (!entry) return false;
    memory.set(id, entry);
    resetAccounts.delete(id);
    try { storage?.setItem(WAVE3_DEMO_STORAGE_PREFIX + id, raw); return !!storage; }
    catch { return false; }
  };

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
      return persist(snapshot, expectedAccountId);
    },
    saveCheckpoint(checkpoint: Wave3DemoCheckpoint, expectedAccountId: string | null = checkpoint.snapshot.accountId): boolean {
      return persist(checkpoint.snapshot, expectedAccountId, {
        seenEvents: checkpoint.seenEvents, settledCompletions: checkpoint.settledCompletions,
        ...(checkpoint.generation === undefined ? {} : { generation: checkpoint.generation }),
        ...(checkpoint.missionTime === undefined ? {} : { missionTime: checkpoint.missionTime }),
      });
    },
    loadCheckpoint(accountId: string | null): Wave3DemoCheckpoint | null {
      const id = account(accountId);
      const snapshot = this.load(accountId, 'local-demo');
      const replay = id ? memory.get(id)?.checkpoint : null;
      return snapshot && replay ? { snapshot, ...replay } : null;
    },
    /** Read the shared source while holding the profile lock, bypassing this tab's memory fallback. */
    readDiskCheckpoint(id: string): { raw: string | null; checkpoint: Wave3DemoCheckpoint | null } | undefined {
      if (!storage || !ACCOUNT.test(id)) return undefined;
      try {
        const raw = storage.getItem(WAVE3_DEMO_STORAGE_PREFIX + id);
        const entry = raw === null ? null : readEntry(raw, id, now());
        return { raw, checkpoint: entry ? { snapshot: entry.snapshot,
          seenEvents: [], settledCompletions: [], ...entry.checkpoint } : null };
      } catch { return undefined; }
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
