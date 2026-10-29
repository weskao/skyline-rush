import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRACKS, LOOP_STEPS, sprintFactor, pitch } from '../src/music-tracks.ts';

test('music data has one home: the synth engine imports it instead of defining songs', () => {
  const engine = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /export const TRACKS|const MODE_THEMES|export const sprintFactor/);
});

test('both music tracks are complete loops of about one minute', () => {
  assert.equal(LOOP_STEPS, 32 * 16);
  for (const [name, track] of Object.entries(TRACKS)) {
    const seconds = LOOP_STEPS * 15 / track.bpm;
    assert.ok(seconds >= 50 && seconds <= 70, `${name} loops in ${seconds}s`);
    assert.equal(track.chords.length, 8, name);
    assert.ok(track.chords.every(chord => chord.length === 4), name);
    assert.equal(track.lead.length, 64, name);
  }
});

test('each new arcade mode has a playable 50–70 second synthesized music loop', () => {
  for (const [name, firstPad] of Object.entries({checkpoint:60,stunt:62,gauntlet:52,cup:64,cruise:67})) {
    const track = TRACKS[name];
    assert.ok(track, `${name} must define an original theme`);
    assert.ok(track.bpm >= 110 && track.bpm <= 150, name);
    assert.equal(track.lead.length, 64);
    assert.equal(track.chords.length, 8);
    assert.equal(track.chords[0][1], firstPad, `${name} has a distinct opening pad`);
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

test('pitch converts MIDI notes to equal-tempered hertz around A4', () => {
  assert.equal(pitch(69), 440);
  assert.equal(pitch(81), 880);
  assert.ok(Math.abs(pitch(60) - 261.6256) < 1e-3);
});
