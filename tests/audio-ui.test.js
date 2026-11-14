import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audioChannelPresentation } from '../src/audio-ui.ts';

test('muted audio keeps saved level but renders accessible zero slider', () => {
  assert.deepEqual(audioChannelPresentation(false, 0.65), { level: 0, percent: '65%', enabled: false });
});
test('enabled channel displays its saved volume without changing it', () => {
  assert.deepEqual(audioChannelPresentation(true, 0.65), { level: 65, percent: '65%', enabled: true });
  assert.deepEqual(audioChannelPresentation(true, 1), { level: 100, percent: '100%', enabled: true });
});

test('audio switches, sliders, Mute all and the autoplay unlock are wired by the audio controller, not main.js', async () => {
  const { readFileSync } = await import('node:fs');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const moved of [/audioSwitches/, /#mute-all/, /previewChannel/, /addEventListener\(type, unlockAudio/])
    assert.doesNotMatch(main, moved);
  const controller = readFileSync(new URL('../src/audio-ui.ts', import.meta.url), 'utf8');
  for (const owned of [/\[data-audio\]/, /#mute-all/, /onUserActivation\(unlockAudio\)/])
    assert.match(controller, owned);
});

// Minimal DOM for the controller: no channel rows, one Mute all button, window listeners and storage recorded.
async function setupWithEngine(t, sound) {
  const listeners = {}, writes = [];
  let muteAll;
  globalThis.document = { hidden: false, querySelectorAll: () => [], querySelector: () => ({ addEventListener: (type, fn) => { muteAll = fn; } }) };
  globalThis.window = { addEventListener: (type, fn) => { (listeners[type] ??= []).push(fn); } };
  globalThis.localStorage = { setItem: (key, value) => writes.push([key, value]) };
  t.after(() => { delete globalThis.document; delete globalThis.window; delete globalThis.localStorage; });
  const { setupAudioUI } = await import('../src/audio-ui.ts');
  const audio = { music: true, sfx: true };
  setupAudioUI({ audio, volume: { music: 1, sfx: 1 }, sound });
  return { audio, listeners, writes, muteAll: () => muteAll() };
}
const failingEngine = (calls = []) => ({
  setMusic: () => false, setEnabled: () => false, running: () => false, cue() {}, setHidden: hidden => calls.push(hidden),
});

test('an engine that fails to start on load or on a tap never saves the player\'s audio as off', async t => {
  const { listeners, writes } = await setupWithEngine(t, failingEngine());
  assert.deepEqual(writes, [], 'the start-up unlock leaves storage alone');
  for (const fn of listeners.pointerdown) fn();
  assert.deepEqual(writes, [], 'a gesture unlock leaves storage alone');
});

test('the player\'s own Mute all still saves the choice', async t => {
  const { writes, muteAll } = await setupWithEngine(t, failingEngine());
  muteAll();
  assert.ok(writes.some(([key, value]) => key === 'skyline-rush-music' && value === 'off'));
});

test('pageshow and focus resync the engine\'s hidden flag from the live page', async t => {
  const calls = [];
  const { listeners } = await setupWithEngine(t, failingEngine(calls));
  for (const type of ['pageshow', 'focus']) {
    calls.length = 0;
    assert.ok(listeners[type]?.length, `${type} is watched`);
    for (const fn of listeners[type]) fn();
    assert.deepEqual(calls, [false], `${type} passes document.hidden`);
  }
});

test('the VITE_DIAG snapshot carries the live audio state, inside the diagnostic-only branch', async () => {
  const { readFileSync } = await import('node:fs');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const diagLine = main.split('\n').find(line => line.includes('startDiag('));
  assert.match(diagLine, /^if \(import\.meta\.env\.VITE_DIAG\)/, 'production drops the snapshot');
  assert.match(diagLine, /audio: sound\.diagnostics\(\)/);
});
