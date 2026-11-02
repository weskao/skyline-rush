import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORIENTATION_LAYOUT_KEY, normalizeOrientationLayouts, readOrientationLayouts, writeOrientationLayouts, orientationForViewport } from '../src/control-settings.ts';

test('legacy v1 touch positions migrate without losing saved positions in either orientation', () => {
  const legacy = { fly: { x: 0.75, y: 0.8 } };
  const actual = normalizeOrientationLayouts(null, legacy);
  assert.deepEqual(actual.portrait, legacy);
  assert.deepEqual(actual.landscape, legacy);
  assert.notStrictEqual(actual.portrait, actual.landscape);
});

test('independent portrait and landscape layouts validate unsafe points and drop unknown controls', () => {
  const result = normalizeOrientationLayouts({ version: 2,
    portrait: { nitro: { x: 0.6, y: 0.7 }, fly: { x: -1, y: 2 } },
    landscape: { nitro: { x: 0.8, y: 0.4 }, extra: { x: 0.2, y: 0.3 } },
  });
  assert.deepEqual(result.portrait, { nitro: { x: 0.6, y: 0.7 } });
  assert.deepEqual(result.landscape, { nitro: { x: 0.8, y: 0.4 } });
  assert.equal(orientationForViewport(844, 390), 'landscape');
  assert.equal(orientationForViewport(390, 844), 'portrait');
  assert.equal(orientationForViewport(400, 400), 'portrait');
});

test('custom layouts round-trip in a separate key without overwriting v1 controls and reset cleanly', () => {
  const storageMap = new Map([['skyline-rush-controls', '{"version":1}']]);
  const storage = { getItem: key => storageMap.get(key) ?? null, setItem: (key, value) => storageMap.set(key, value) };
  const layouts = normalizeOrientationLayouts({ version: 2, portrait: { fly: { x: 0.7, y: 0.9 } }, landscape: {} });
  writeOrientationLayouts(layouts, storage);
  assert.equal(readOrientationLayouts({}, storage).portrait.fly.x, 0.7);
  assert.equal(storageMap.get('skyline-rush-controls'), '{"version":1}');
  writeOrientationLayouts(normalizeOrientationLayouts(null), storage);
  assert.deepEqual(readOrientationLayouts({}, storage).portrait, {});
  assert.equal(storageMap.has(ORIENTATION_LAYOUT_KEY), true);
});

test('orientation layout preferences keep defaults if storage getter throws', () => {
  const legacy = { boost: { x: 0.7, y: 0.8 } };
  const blocked = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } };
  assert.deepEqual(readOrientationLayouts(legacy, blocked).portrait, legacy);
  assert.doesNotThrow(() => writeOrientationLayouts(normalizeOrientationLayouts(null), blocked));
});
