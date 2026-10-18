import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS } from '../src/audio.js';

test('both music tracks are complete loops of about one minute', () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    const seconds = 32 * 16 * 15 / track.bpm;
    assert.ok(seconds >= 50 && seconds <= 70, `${name} loops in ${seconds}s`);
    assert.equal(track.chords.length, 8, name);
    assert.ok(track.chords.every(chord => chord.length === 4), name);
    assert.equal(track.lead.length, 64, name);
  }
});
