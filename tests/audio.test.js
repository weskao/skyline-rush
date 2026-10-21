import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, sprintFactor, createSound } from '../src/audio.js';
import { createRace } from '../src/game.js';

test('both music tracks are complete loops of about one minute', () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    const seconds = 32 * 16 * 15 / track.bpm;
    assert.ok(seconds >= 50 && seconds <= 70, `${name} loops in ${seconds}s`);
    assert.equal(track.chords.length, 8, name);
    assert.ok(track.chords.every(chord => chord.length === 4), name);
    assert.equal(track.lead.length, 64, name);
  }
});

const midiHz = note => 440 * 2 ** ((note - 69) / 12);

// Record the Web Audio boundary; synthesizers, cue selection and event tracking stay real.
function installAudio(t) {
  const nodes = [];
  const param = () => ({ value: 0, setValueAtTime(value) { this.value = value; },
    setTargetAtTime(value) { this.value = value; }, linearRampToValueAtTime(value) { this.value = value; },
    exponentialRampToValueAtTime(value) { this.value = value; } });
  const node = kind => {
    const result = { kind, frequency: param(), gain: param(), Q: param(), threshold: param(), ratio: param(),
      connect(destination) { this.destination = destination; return destination; }, disconnect() {}, start() {}, stop() {} };
    nodes.push(result); return result;
  };
  globalThis.AudioContext = class {
    currentTime = 0; sampleRate = 100; state = 'running'; destination = {};
    createOscillator() { return node('oscillator'); }
    createGain() { return node('gain'); }
    createBiquadFilter() { return node('filter'); }
    createDynamicsCompressor() { return node('compressor'); }
    createBufferSource() { return node('buffer'); }
    createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
  t.after(() => { delete globalThis.AudioContext; });
  const sound = createSound();
  t.after(() => sound.dispose());
  return { nodes, sound };
}

// Sky Spiral's first pad (MIDI 56) is not the shared intro pad (57) or race pad (55).
function heardFrequencies(t, trackId, phase) {
  const { nodes, sound } = installAudio(t);
  const race = createRace(trackId);
  race.phase = phase;
  race.player.speed = 40;
  assert.equal(sound.setMusic(true), true);
  sound.update(race);
  return nodes.filter(item => item.kind === 'oscillator').map(item => item.frequency.value);
}

test('selecting Sky Spiral on the menu keeps the shared intro', t => {
  const heard = heardFrequencies(t, 'spiral', 'ready');
  assert.ok(heard.some(hz => Math.abs(hz - midiHz(57)) < 0.05), 'shared intro plays on the menu');
  assert.equal(heard.some(hz => Math.abs(hz - midiHz(56)) < 0.05), false, 'Sky Spiral music stays silent until the race starts');
});

test('racing Sky Spiral keeps its background music instead of the shared race song', t => {
  const heard = heardFrequencies(t, 'spiral', 'racing');
  assert.ok(heard.some(hz => Math.abs(hz - midiHz(56)) < 0.05), 'Sky Spiral pad plays during the race');
  assert.equal(heard.some(hz => Math.abs(hz - midiHz(55)) < 0.05), false, 'shared race song stays silent');
});

// Opening pads sit outside the shared intro (57) and race (55) pads.
const WORLD_TOUR_PADS = { taipei: 62, tokyo: 63, alpine: 58, coastal: 65, cosmic: 66 };

for (const [trackId, pad] of Object.entries(WORLD_TOUR_PADS)) {
  test(`selecting ${trackId} on the menu keeps the shared intro`, t => {
    const heard = heardFrequencies(t, trackId, 'ready');
    assert.ok(heard.some(hz => Math.abs(hz - midiHz(57)) < 0.05), `${trackId} menu keeps the intro`);
    assert.equal(heard.some(hz => Math.abs(hz - midiHz(pad)) < 0.05), false, `${trackId} music stays silent on the menu`);
  });

  test(`racing ${trackId} plays its own music instead of the shared race song`, t => {
    const heard = heardFrequencies(t, trackId, 'racing');
    assert.ok(heard.some(hz => Math.abs(hz - midiHz(pad)) < 0.05), `${trackId} pad plays during the race`);
    assert.equal(heard.some(hz => Math.abs(hz - midiHz(55)) < 0.05), false, `${trackId} leaves the shared race song silent`);
  });
}

test('sprintFactor leaves the tempo alone until the last 500 m, then ramps to 1.15 at the finish', () => {
  assert.equal(sprintFactor(0, 5000), 1);
  assert.equal(sprintFactor(4500, 5000), 1);
  assert.ok(Math.abs(sprintFactor(4750, 5000) - 1.075) < 1e-9);
  assert.ok(Math.abs(sprintFactor(5000, 5000) - 1.15) < 1e-9);
  assert.ok(Math.abs(sprintFactor(9999, 5000) - 1.15) < 1e-9);
  assert.ok(sprintFactor(3600, 4000) > 1);
});

function audioScene(t) {
  const { nodes, sound } = installAudio(t);
  const race = createRace();
  race.phase = 'racing'; race.player.speed = 60;
  assert.equal(sound.setEnabled(true), true);
  sound.update(race);
  return { sound, race, nodes, tones: () => nodes.filter(node => node.kind === 'oscillator').length };
}

test('collected pickups produce one cue and never replay while muted, paused or after restart', t => {
  const { sound, race, tones } = audioScene(t);
  const pickup = race.pickups[0];
  const before = tones();
  pickup.taken = true; sound.update(race);
  assert.ok(tones() > before, 'collection emits a synthesized pickup tone');
  const collected = tones(); sound.update(race);
  assert.equal(tones(), collected);
  race.phase = 'paused'; race.pickups[1].taken = true; sound.update(race);
  race.phase = 'racing'; sound.update(race);
  assert.equal(tones(), collected);
  sound.setEnabled(false); race.pickups[2].taken = true; sound.update(race);
  sound.setEnabled(true); sound.update(race);
  assert.equal(tones(), collected);
  const next = createRace(); next.phase = 'racing'; next.pickups[0].taken = true;
  sound.update(next);
  assert.equal(tones(), collected, 'new race does not replay preexisting collection state');
});

test('NITRO reuses boost ignition once per activation and sustains the thrust sound', t => {
  const { sound, race, nodes, tones } = audioScene(t);
  const before = tones();
  race.player.nitroTime = 2.5; sound.update(race);
  assert.ok(tones() > before);
  const after = tones(); sound.update(race);
  assert.equal(tones(), after);
  const thrust = nodes.find(node => node.kind === 'filter' && node.frequency.value === 950).destination;
  assert.ok(thrust.gain.value > 0);
  race.player.nitroTime = 0; sound.update(race);
  assert.equal(thrust.gain.value, 0);
});

test('drift screech builds with charge thresholds and silences on release/pause', t => {
  const { sound, race, nodes } = audioScene(t);
  const skid = nodes.find(node => node.kind === 'filter' && node.frequency.value === 2300).destination;
  const levels = [];
  for (const time of [0.5, 1, 2, 3]) {
    race.player.drift = { time, dir: 1 }; sound.update(race); levels.push(skid.gain.value);
  }
  assert.ok(levels[0] > 0, 'drift state alone drives screech');
  assert.ok(levels.every((level, i) => i === 0 || level > levels[i - 1]));
  race.phase = 'paused'; sound.update(race); assert.equal(skid.gain.value, 0);
  race.phase = 'racing'; race.player.drift = null; sound.update(race); assert.equal(skid.gain.value, 0);
});

test('each roll starts one noise whoosh; mute and pause consume it without replaying', t => {
  const { sound, race, nodes } = audioScene(t);
  const bursts = () => nodes.filter(node => node.kind === 'buffer' && !node.loop).length;
  const before = bursts();
  race.player.trick = { dir: 1, time: 0, done: false };
  sound.update(race);
  assert.equal(bursts(), before + 1);
  race.player.trick.time = .3; sound.update(race);
  assert.equal(bursts(), before + 1);
  race.phase = 'paused';
  race.player.trick = { dir: -1, time: 0, done: false }; sound.update(race);
  race.phase = 'racing'; sound.update(race);
  assert.equal(bursts(), before + 1);
  sound.setEnabled(false);
  race.player.trick = { dir: 1, time: 0, done: false }; sound.update(race);
  sound.setEnabled(true); sound.update(race);
  assert.equal(bursts(), before + 1);
  race.player.trick = { dir: -1, time: 0, done: false }; sound.update(race);
  assert.equal(bursts(), before + 2);
});

test('volume sliders scale the effects and music buses on a perceptual curve', t => {
  const { nodes, sound } = installAudio(t);
  const race = createRace();
  race.phase = 'racing';
  sound.setEnabled(true, 0.5);
  sound.setMusic(true, 0.5);
  sound.update(race);
  const [effects, music] = nodes.filter(node => node.kind === 'gain' && node.destination?.kind === 'compressor');
  assert.equal(effects.gain.value, 0.8 * 0.25);
  assert.equal(music.gain.value, 0.5 * 0.25);
  sound.setEnabled(true);
  sound.setMusic(true);
  sound.update(race);
  assert.equal(effects.gain.value, 0.8, 'full volume keeps the original mix');
  assert.equal(music.gain.value, 0.5);
});
