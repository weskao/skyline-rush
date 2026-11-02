import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUD_FEEDBACK_KEY, normalizeHudFeedback, readHudFeedback, writeHudFeedback, resetHudPreferences, HUD_MODE_KEY, HUD_WIDGETS_KEY } from '../src/control-settings.ts';

test('Given missing or corrupt preferences, readiness feedback stays informative by default', () => {
  assert.deepEqual(normalizeHudFeedback(null), { sound: true, animation: true });
  assert.deepEqual(normalizeHudFeedback({ sound: false, animation: 'no' }), { sound: false, animation: true });
  assert.deepEqual(readHudFeedback({ getItem: () => '{invalid' }), { sound: true, animation: true });
});
test('Given opted-out READY sound, preference survives a reload independently of audio volume', () => {
  const saved = new Map();
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, v) => saved.set(key, v) };
  writeHudFeedback({ sound: false, animation: false }, storage);
  assert.deepEqual(readHudFeedback(storage), { sound: false, animation: false });
  assert.equal(saved.has(HUD_FEEDBACK_KEY), true);
  assert.equal(saved.has('skyline-rush-sound'), false);
});
test('Given Reset to Defaults, both HUD modes, widget options and feedback return to safe defaults', () => {
  const saved = new Map([[HUD_MODE_KEY, 'competitive'], [HUD_WIDGETS_KEY, '{"map":false}'], [HUD_FEEDBACK_KEY, '{"sound":false,"animation":false}']]);
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, v) => saved.set(key, v) };
  const defaults = resetHudPreferences(storage);
  assert.deepEqual(defaults, { mode: 'hybrid', widgets: { leaderboard: true, map: true, telemetry: true }, feedback: { sound: true, animation: true } });
  assert.equal(saved.get(HUD_MODE_KEY), 'hybrid');
  assert.deepEqual(readHudFeedback(storage), { sound: true, animation: true });
});
test('If localStorage is blocked then Reset to Defaults does not throw', () => {
  const storage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
  assert.doesNotThrow(() => resetHudPreferences(storage));
});
