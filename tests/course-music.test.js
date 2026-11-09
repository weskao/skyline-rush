import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { musicForMode } from '../src/mode-audio.ts';
import { TRACKS } from '../src/music-tracks.ts';
import { COURSE_TRACKS, RACE_TRACKS } from '../src/race-tracks.ts';

const COURSE_IDS = [...Object.keys(RACE_TRACKS), ...Object.keys(COURSE_TRACKS), CIRCUIT_ID];

const racing = (trackId) => musicForMode({
  phase: 'racing', mode: trackId === CIRCUIT_ID ? 'circuit' : 'classic', trackId,
});

test('selecting a course on the home screen keeps the shared intro', () => {
  for (const trackId of COURSE_IDS) {
    const mode = trackId === CIRCUIT_ID ? 'circuit' : 'classic';
    assert.equal(musicForMode({ phase: 'ready', mode, trackId }), 'intro', trackId);
    assert.equal(musicForMode({ phase: 'finished', mode, trackId }), 'intro', trackId);
  }
});

test('every course plays its own song after the race starts, and no two courses share one', () => {
  const songs = COURSE_IDS.map(trackId => {
    const song = racing(trackId);
    assert.ok(TRACKS[song], `${trackId} has no song (${song})`);
    assert.notEqual(song, 'intro', trackId);
    return song;
  });
  assert.equal(new Set(songs).size, songs.length, `shared songs: ${songs.join(' ')}`);
  const bodies = songs.map(song => JSON.stringify({
    bpm: TRACKS[song].bpm, chords: TRACKS[song].chords, lead: TRACKS[song].lead,
  }));
  assert.equal(new Set(bodies).size, bodies.length, 'two course songs use the same loop');
  const pads = songs.map(song => TRACKS[song].chords[0][1]);
  assert.equal(new Set(pads).size, pads.length, `shared opening pads: ${pads.join(' ')}`);
});

test('a themed mode still replaces the course song, and Coast keeps its existing race loop', () => {
  assert.equal(racing('coast'), 'race');
  assert.equal(musicForMode({ phase: 'racing', mode: 'checkpoint', trackId: 'dune-tempest' }), 'checkpoint');
  assert.equal(TRACKS.neon.chords[0][1], 61);
  assert.equal(TRACKS.spiral.chords[0][1], 56);
});
