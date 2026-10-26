// Cloud-sync metadata is per account and never substitutes for a confirmed Firestore write.
export interface CloudSyncStatus {
  pending: boolean;
  lastSuccess: string | null;
}

type SyncStorage = Pick<Storage, 'getItem' | 'setItem'>;
type SyncPatch = { pending?: unknown; lastSuccess?: unknown };
const cloudSyncKey = (uid: string): string => 'skyline-rush-cloud-sync:' + uid;
const validCloudUser = (uid: unknown): uid is string => typeof uid === 'string' && uid.length > 0 && uid.length <= 128;
const EMPTY_SYNC: Readonly<CloudSyncStatus> = Object.freeze({ pending: false, lastSuccess: null });
const validDate = (value: unknown): string | null =>
  typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

// Success means Firestore answered successfully, never merely a successful localStorage write.
export function readCloudSyncStatus(uid: unknown, storage?: SyncStorage): CloudSyncStatus {
  if (!validCloudUser(uid)) return { ...EMPTY_SYNC };
  try {
    const raw: unknown = JSON.parse((storage ?? globalThis.localStorage).getItem(cloudSyncKey(uid)) ?? 'null');
    const saved = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown> : null;
    return { pending: saved?.pending === true, lastSuccess: validDate(saved?.lastSuccess) };
  } catch { return { ...EMPTY_SYNC }; }
}

export function writeCloudSyncStatus(uid: unknown, patch: SyncPatch | null | undefined, storage?: SyncStorage): boolean {
  if (!validCloudUser(uid) || typeof patch?.pending !== 'boolean' ||
      (patch.lastSuccess !== undefined && !validDate(patch.lastSuccess))) return false;
  try {
    const target = storage ?? globalThis.localStorage;
    const previous = readCloudSyncStatus(uid, target);
    target.setItem(cloudSyncKey(uid), JSON.stringify({
      pending: patch.pending,
      lastSuccess: patch.lastSuccess === undefined ? previous.lastSuccess : validDate(patch.lastSuccess),
    }));
    return true;
  } catch { return false; }
}
