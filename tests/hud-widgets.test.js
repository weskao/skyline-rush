import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as hud from '../src/control-settings.ts';

test('Competitive widgets default to visible and reject malformed persisted values', () => {
  assert.deepEqual(hud.normalizeHudWidgets(null), { leaderboard: true, map: true, telemetry: true });
  assert.deepEqual(hud.normalizeHudWidgets({ leaderboard: false, map: false, telemetry: 'no' }),
    { leaderboard: false, map: false, telemetry: true });
});

test('each optional Competitive widget persists independently across reload without touching race HUD mode', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  hud.writeHudWidgets({ leaderboard: false, map: true, telemetry: false }, storage);
  assert.deepEqual(hud.readHudWidgets(storage), { leaderboard: false, map: true, telemetry: false });
  assert.equal(values.has(hud.HUD_MODE_KEY), false);
});

test('widget preferences tolerate unavailable localStorage and use full visible default', () => {
  const blocked = { getItem() { throw Error('SecurityError'); }, setItem() { throw Error('SecurityError'); } };
  assert.deepEqual(hud.readHudWidgets(blocked), { leaderboard: true, map: true, telemetry: true });
  assert.doesNotThrow(() => hud.writeHudWidgets({ leaderboard: true, map: false, telemetry: true }, blocked));
});
