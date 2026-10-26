import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_KEY_MAP, KEYMAP_KEY, rebind, resetKeyMap, validateKeyMap, loadKeyMap, saveKeyMap } from '../src/key-map.ts';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); } };
};

test('defaults serve WASD and arrow hands: Space fly, Shift boost, E or X nitro', () => {
  assert.deepEqual(DEFAULT_KEY_MAP.fly, ['Space']);
  assert.deepEqual(DEFAULT_KEY_MAP.boost, ['ShiftLeft', 'ShiftRight']);
  assert.deepEqual(DEFAULT_KEY_MAP.nitro, ['KeyE', 'KeyX']);
  assert.deepEqual(DEFAULT_KEY_MAP.throttle, ['KeyW', 'ArrowUp']);
});

test('rebinding to a free key replaces that action keys and leaves others alone', () => {
  const { map, swapped } = rebind(DEFAULT_KEY_MAP, 'fly', 'KeyF');
  assert.deepEqual(map.fly, ['KeyF']);
  assert.equal(swapped, null);
  assert.deepEqual(map.boost, DEFAULT_KEY_MAP.boost);
  assert.deepEqual(DEFAULT_KEY_MAP.fly, ['Space'], 'input map is not mutated');
});

test('rebinding to a key another action holds swaps the two actions', () => {
  const { map, swapped } = rebind(DEFAULT_KEY_MAP, 'fly', 'KeyX');
  assert.equal(swapped, 'nitro');
  assert.deepEqual(map.fly, ['KeyX']);
  assert.deepEqual(map.nitro, ['Space', 'KeyE']);
  const keys = Object.values(map).flat();
  assert.equal(new Set(keys).size, keys.length, 'no key is bound twice');
});

test('rebinding to a key the action already owns narrows it to that key without a swap', () => {
  const { map, swapped } = rebind(DEFAULT_KEY_MAP, 'nitro', 'KeyX');
  assert.equal(swapped, null);
  assert.deepEqual(map, { ...DEFAULT_KEY_MAP, nitro: ['KeyX'] });
});

test('reserved action keys and unknown actions are refused', () => {
  assert.equal(rebind(DEFAULT_KEY_MAP, 'fly', 'Escape').map, DEFAULT_KEY_MAP);
  assert.equal(rebind(DEFAULT_KEY_MAP, 'fly', 'Escape').error, 'reserved');
  for (const key of ['Backspace', 'F2']) assert.equal(rebind(DEFAULT_KEY_MAP, 'nitro', key).error, 'reserved', key);
  for (const key of ['KeyR', 'KeyT']) assert.equal(rebind(DEFAULT_KEY_MAP, 'nitro', key).error, undefined, `${key} is free to bind`);
  assert.equal(rebind(DEFAULT_KEY_MAP, 'warp', 'KeyF').error, 'unknown-action');
});

test('reset returns an independent copy of the defaults', () => {
  const map = resetKeyMap();
  assert.deepEqual(map, DEFAULT_KEY_MAP);
  map.fly.push('KeyZ');
  assert.deepEqual(DEFAULT_KEY_MAP.fly, ['Space']);
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
