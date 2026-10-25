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
