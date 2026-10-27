// Pure driving key map: action -> KeyboardEvent.code values.
// Persisted under its own key so control-settings stays v1.
export const KEYMAP_KEY = 'skyline-rush-keymap';
export const DEFAULT_KEY_MAP = {
  throttle: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  fly: ['Space'], boost: ['ShiftLeft', 'ShiftRight'], nitro: ['KeyE', 'KeyX'],
};
export type DriveAction = keyof typeof DEFAULT_KEY_MAP;
export type KeyMap = Record<DriveAction, string[]>;
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface RebindResult { map: KeyMap; swapped: DriveAction | null; error?: 'unknown-action' | 'invalid' | 'reserved' }

// Fixed one-shot actions cannot be rebound, so shortcuts never conflict with driving.
export const ACTION_KEYS = { Escape: 'pause', KeyP: 'pause', Backspace: 'restart', KeyC: 'camera', KeyM: 'sound', F2: 'assist', KeyV: 'airflow', KeyQ: 'item', Enter: 'start' };
const copyKeyMap = (map: KeyMap): KeyMap =>
  Object.fromEntries(Object.entries(map).map(([action, codes]) => [action, [...codes]])) as KeyMap;

export const resetKeyMap = (): KeyMap => copyKeyMap(DEFAULT_KEY_MAP);

export function rebind(map: KeyMap, action: string, key: unknown): RebindResult {
  if (!Object.hasOwn(map, action)) return { map, swapped: null, error: 'unknown-action' };
  if (typeof key !== 'string' || !key) return { map, swapped: null, error: 'invalid' };
  if (Object.hasOwn(ACTION_KEYS, key)) return { map, swapped: null, error: 'reserved' };
  const name = action as DriveAction;
  if (map[name].length === 1 && map[name][0] === key) return { map, swapped: null };
  const next = copyKeyMap(map);
  const other = (Object.keys(next) as DriveAction[]).find(otherAction =>
    otherAction !== name && next[otherAction].includes(key));
  const previous = next[name].filter(code => code !== key);
  next[name] = [key];
  if (other) next[other] = [...previous, ...next[other].filter(code => code !== key)];
  return { map: next, swapped: other ?? null };
}

export function validateKeyMap(value: unknown): KeyMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return resetKeyMap();
  const stored = value as Record<string, unknown>;
  const seen = new Set<string>();
  for (const action of Object.keys(DEFAULT_KEY_MAP)) {
    const codes = stored[action];
    if (!Array.isArray(codes) || !codes.length) return resetKeyMap();
    for (const code of codes) {
      if (typeof code !== 'string' || !code || Object.hasOwn(ACTION_KEYS, code) || seen.has(code)) return resetKeyMap();
      seen.add(code);
    }
  }
  return Object.fromEntries(Object.keys(DEFAULT_KEY_MAP).map(action => [action, [...(stored[action] as string[])]])) as KeyMap;
}

export function loadKeyMap(storage?: StorageLike): KeyMap {
  try { return validateKeyMap(JSON.parse((storage ?? globalThis.localStorage).getItem(KEYMAP_KEY) ?? 'null')); }
  catch { return resetKeyMap(); }
}

export function saveKeyMap(map: KeyMap, storage?: StorageLike): void {
  try { (storage ?? globalThis.localStorage).setItem(KEYMAP_KEY, JSON.stringify(map)); }
  catch { /* Remapping remains usable in memory. */ }
}
