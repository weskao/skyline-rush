import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, sprintFactor } from '../src/audio.js';

test('both music tracks are complete loops of about one minute', () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    const seconds = 32 * 16 * 15 / track.bpm;
    assert.ok(seconds >= 50 && seconds <= 70, `${name} loops in ${seconds}s`);
    assert.equal(track.chords.length, 8, name);
    assert.ok(track.chords.every(chord => chord.length === 4), name);
    assert.equal(track.lead.length, 64, name);
  }
});

test('sprintFactor leaves the tempo alone until the last 500 m, then ramps to 1.15 at the finish', () => {
  assert.equal(sprintFactor(0, 5000), 1);
  assert.equal(sprintFactor(4500, 5000), 1);
  assert.ok(Math.abs(sprintFactor(4750, 5000) - 1.075) < 1e-9);
  assert.ok(Math.abs(sprintFactor(5000, 5000) - 1.15) < 1e-9);
  assert.ok(Math.abs(sprintFactor(9999, 5000) - 1.15) < 1e-9);
  assert.ok(sprintFactor(3600, 4000) > 1);
});
