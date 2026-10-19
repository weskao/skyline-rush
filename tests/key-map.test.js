import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_KEY_MAP, KEYMAP_KEY, rebind, resetKeyMap, validateKeyMap, loadKeyMap, saveKeyMap } from '../src/key-map.js';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); } };
};

test('defaults keep the original keys and add J/K/L and E alternates', () => {
  assert.deepEqual(DEFAULT_KEY_MAP.fly, ['Space', 'KeyJ']);
  assert.deepEqual(DEFAULT_KEY_MAP.boost, ['ShiftLeft', 'ShiftRight', 'KeyK']);
  assert.deepEqual(DEFAULT_KEY_MAP.nitro, ['KeyE', 'KeyL']);
  assert.deepEqual(DEFAULT_KEY_MAP.throttle, ['KeyW', 'ArrowUp']);
});

test('rebinding to a free key replaces that action keys and leaves others alone', () => {
  const { map, swapped } = rebind(DEFAULT_KEY_MAP, 'fly', 'KeyF');
  assert.deepEqual(map.fly, ['KeyF']);
  assert.equal(swapped, null);
  assert.deepEqual(map.boost, DEFAULT_KEY_MAP.boost);
  assert.deepEqual(DEFAULT_KEY_MAP.fly, ['Space', 'KeyJ'], 'input map is not mutated');
});

test('rebinding to a key another action holds swaps the two actions', () => {
  const { map, swapped } = rebind(DEFAULT_KEY_MAP, 'fly', 'KeyK');
  assert.equal(swapped, 'boost');
  assert.deepEqual(map.fly, ['KeyK']);
  assert.deepEqual(map.boost, ['Space', 'KeyJ', 'ShiftLeft', 'ShiftRight']);
  const keys = Object.values(map).flat();
  assert.equal(new Set(keys).size, keys.length, 'no key is bound twice');
});

test('rebinding to a key the action already owns narrows it to that key without a swap', () => {
  const { map, swapped } = rebind(DEFAULT_KEY_MAP, 'fly', 'KeyJ');
  assert.equal(swapped, null);
  assert.deepEqual(map, { ...DEFAULT_KEY_MAP, fly: ['KeyJ'] });
});

test('reserved action keys and unknown actions are refused', () => {
  assert.equal(rebind(DEFAULT_KEY_MAP, 'fly', 'Escape').map, DEFAULT_KEY_MAP);
  assert.equal(rebind(DEFAULT_KEY_MAP, 'fly', 'Escape').error, 'reserved');
  assert.equal(rebind(DEFAULT_KEY_MAP, 'warp', 'KeyF').error, 'unknown-action');
});

test('reset returns an independent copy of the defaults', () => {
  const map = resetKeyMap();
  assert.deepEqual(map, DEFAULT_KEY_MAP);
  map.fly.push('KeyZ');
  assert.deepEqual(DEFAULT_KEY_MAP.fly, ['Space', 'KeyJ']);
});

test('validate keeps a good map and falls back to defaults for bad ones', () => {
  const good = rebind(DEFAULT_KEY_MAP, 'fly', 'KeyF').map;
  assert.deepEqual(validateKeyMap(good), good);
  for (const bad of [null, 'x', [], {}, { ...good, fly: [] }, { ...good, fly: 'KeyF' }, { ...good, boost: ['KeyF'] }, { ...good, nitro: ['Escape'] }, { ...good, fly: [5] }]) {
    assert.deepEqual(validateKeyMap(bad), DEFAULT_KEY_MAP);
  }
});

test('save and load round-trip under its own key; bad storage falls back', () => {
  const storage = memoryStorage();
  const map = rebind(DEFAULT_KEY_MAP, 'nitro', 'KeyN').map;
  saveKeyMap(map, storage);
  assert.ok(storage.data[KEYMAP_KEY]);
  assert.equal(KEYMAP_KEY, 'skyline-rush-keymap');
  assert.deepEqual(loadKeyMap(storage), map);
  assert.deepEqual(loadKeyMap(memoryStorage({ [KEYMAP_KEY]: '{not json' })), DEFAULT_KEY_MAP);
  assert.deepEqual(loadKeyMap(memoryStorage()), DEFAULT_KEY_MAP);
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.deepEqual(loadKeyMap(throwing), DEFAULT_KEY_MAP);
  assert.doesNotThrow(() => saveKeyMap(map, throwing));
});

test('rebind rejects empty, non-string and undefined keys without changing the map', () => {
  for (const key of ['', undefined, null, 42, {}]) {
    const result = rebind(DEFAULT_KEY_MAP, 'fly', key);
    assert.equal(result.error, 'invalid');
    assert.equal(result.map, DEFAULT_KEY_MAP);
    assert.equal(result.swapped, null);
  }
});

test('blocked storage getter falls back to defaults on load and never throws on save', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('blocked'); }, configurable: true });
  try {
    assert.deepEqual(loadKeyMap(), DEFAULT_KEY_MAP);
    assert.doesNotThrow(() => saveKeyMap(DEFAULT_KEY_MAP));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
  }
});
