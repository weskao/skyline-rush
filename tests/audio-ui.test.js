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
  for (const owned of [/\[data-audio\]/, /#mute-all/, /unlockAudio, \{ capture: true \}/])
    assert.match(controller, owned);
});
