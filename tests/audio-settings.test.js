import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_COOKIES, readAudio, setVolume } from '../src/audio-settings.js';

test('a fresh visit starts music and sound effects on at full volume', () => {
  assert.deepEqual(AUDIO_COOKIES, { music: 'skyline-rush-music', sfx: 'skyline-rush-sound' });
  for (const cookie of ['', 'other=1', 'skyline-rush-music=on; skyline-rush-sound=on']) {
    assert.deepEqual(readAudio(cookie), { audio: { music: true, sfx: true }, volume: { music: 1, sfx: 1 } });
  }
});

test('saved off choices and volume levels are read back per channel', () => {
  const saved = readAudio('a=b; skyline-rush-music=off; skyline-rush-music-volume=40; skyline-rush-sound-volume=65');
  assert.deepEqual(saved, { audio: { music: false, sfx: true }, volume: { music: 0.4, sfx: 0.65 } });
});

test('malformed or out-of-range volumes never load as silent or louder than full', () => {
  const read = value => readAudio(`skyline-rush-music-volume=${value}`).volume.music;
  assert.equal(read(''), 1);
  assert.equal(read('loud'), 1);
  assert.equal(read('0'), 0.05);
  assert.equal(read('-20'), 0.05);
  assert.equal(read('250'), 1);
});

test('dragging a volume to zero mutes but keeps the last audible level for unmute', () => {
  assert.deepEqual(setVolume(0.4, 0.7), { on: true, volume: 0.7 });
  assert.deepEqual(setVolume(0.4, 0), { on: false, volume: 0.4 });
});
