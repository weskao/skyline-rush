// Browser storage access is optional: iOS private mode or permission policies can throw SecurityError.
export interface HistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
export function readStored(key: string, storage?: HistoryStorage): unknown {
  try { return JSON.parse((storage ?? globalThis.localStorage).getItem(key) ?? 'null'); }
  catch { return null; }
}
export function writeStored(key: string, value: unknown, storage?: HistoryStorage): void {
  try { (storage ?? globalThis.localStorage).setItem(key, JSON.stringify(value)); }
  catch { /* Saving history is best effort; gameplay cannot depend on storage. */ }
}
