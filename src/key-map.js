// Pure driving key map: action -> list of KeyboardEvent.code values. Persisted under its own key so control-settings stays v1.
export const KEYMAP_KEY = 'skyline-rush-keymap';
export const DEFAULT_KEY_MAP = {
  throttle: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  fly: ['Space', 'KeyJ'], boost: ['ShiftLeft', 'ShiftRight', 'KeyK'], nitro: ['KeyE', 'KeyL'],
};
// Fixed one-shot actions; never rebindable so Esc/Enter/etc. always work.
export const ACTION_KEYS = { Escape: 'pause', KeyP: 'pause', KeyR: 'restart', KeyC: 'camera', KeyM: 'sound', KeyT: 'assist', KeyV: 'airflow', Enter: 'start' };

export const resetKeyMap = () => Object.fromEntries(Object.entries(DEFAULT_KEY_MAP).map(([action, keys]) => [action, [...keys]]));

// Binds `key` as the action's only key. If another action holds it, that action takes the old keys (swap).
export function rebind(map, action, key) {
  if (!Object.hasOwn(map, action)) return { map, swapped: null, error: 'unknown-action' };
  if (typeof key !== 'string' || !key) return { map, swapped: null, error: 'invalid' };
  if (ACTION_KEYS[key]) return { map, swapped: null, error: 'reserved' };
  if (map[action].length === 1 && map[action][0] === key) return { map, swapped: null };
  const next = Object.fromEntries(Object.entries(map).map(([name, keys]) => [name, [...keys]]));
  const other = Object.keys(next).find(name => name !== action && next[name].includes(key));
  const previous = next[action].filter(k => k !== key);
  next[action] = [key];
  if (other) next[other] = [...previous, ...next[other].filter(k => k !== key)];
  return { map: next, swapped: other ?? null };
}

export function validateKeyMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return resetKeyMap();
  const seen = new Set();
  for (const action of Object.keys(DEFAULT_KEY_MAP)) {
    const keys = value[action];
    if (!Array.isArray(keys) || !keys.length) return resetKeyMap();
    for (const key of keys) {
      if (typeof key !== 'string' || !key || ACTION_KEYS[key] || seen.has(key)) return resetKeyMap();
      seen.add(key);
    }
  }
  return Object.fromEntries(Object.keys(DEFAULT_KEY_MAP).map(action => [action, [...value[action]]]));
}

// globalThis.localStorage is read inside the try: a blocked-storage getter throws SecurityError.
export function loadKeyMap(storage) {
  try { return validateKeyMap(JSON.parse((storage ?? globalThis.localStorage).getItem(KEYMAP_KEY))); } catch { return resetKeyMap(); }
}

export function saveKeyMap(map, storage) {
  try { (storage ?? globalThis.localStorage).setItem(KEYMAP_KEY, JSON.stringify(map)); } catch { /* Remap stays usable in memory. */ }
}
