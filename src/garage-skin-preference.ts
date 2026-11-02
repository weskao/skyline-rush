import { SKIN_CATEGORIES, findSkin } from './garage-skin-catalog.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';

/**
 * Remembered Garage skin picks: a display PREFERENCE, never ownership.
 * Stores only `{version, accountId, picks}`; whether a pick may apply is decided by the
 * caller's equip gate (owned/default/acquisition), so editing storage cannot unlock anything.
 * Skin ids are permanent storage values: never rename or reuse one.
 */
export const SKIN_PICK_STORAGE_KEY = 'skyline-rush-garage-skin-picks';
const PICK_VERSION = 1;
const MAX_RECORD_CHARS = 2_048;

type PickStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type SkinPicks = Partial<Record<SkinCategory, SkinId>>;

const validAccount = (accountId: string): boolean => /^[A-Za-z0-9_-]{1,128}$/.test(accountId);
const storageKey = (accountId: string): string => `${SKIN_PICK_STORAGE_KEY}:${accountId}`;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// Strict parse: any violation discards the whole record rather than repairing it.
function parsePicks(raw: string | null, accountId: string): SkinPicks {
  if (typeof raw !== 'string' || raw.length > MAX_RECORD_CHARS) return {};
  let record: unknown;
  try { record = JSON.parse(raw); } catch { return {}; }
  if (!isRecord(record) || record.version !== PICK_VERSION || record.accountId !== accountId) return {};
  const picks = record.picks;
  if (!isRecord(picks)) return {};
  const result: SkinPicks = {};
  for (const slot of Object.keys(picks)) {
    const skin = findSkin(picks[slot]);
    if (!skin || skin.category !== slot) return {};
    result[skin.category] = skin.id;
  }
  return result;
}

export function readSkinPicks(storage: PickStorage | null, accountId: string): SkinPicks {
  if (!storage || !validAccount(accountId)) return {};
  try { return parsePicks(storage.getItem(storageKey(accountId)), accountId); } catch { return {}; }
}

export function rememberSkinPick(storage: PickStorage | null, accountId: string, id: unknown): void {
  const skin = findSkin(id);
  if (!storage || !skin || !validAccount(accountId)) return;
  const picks = { ...readSkinPicks(storage, accountId), [skin.category]: skin.id };
  try {
    storage.setItem(storageKey(accountId), JSON.stringify({ version: PICK_VERSION, accountId, picks }));
  } catch { /* Quota/blocked storage: the pick simply is not remembered. */ }
}

// Every pick re-enters through `equip`, the same gate a click uses; refused picks stay stored but inert.
export function restoreSkinPicks(storage: PickStorage | null, accountId: string, equip: (id: SkinId) => boolean): void {
  const picks = readSkinPicks(storage, accountId);
  for (const category of SKIN_CATEGORIES) {
    const id = picks[category];
    if (id) equip(id);
  }
}

export function browserSkinPickStorage(): PickStorage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
