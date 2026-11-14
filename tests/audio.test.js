import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSound } from '../src/audio.js';
import { createRace } from '../src/game.js';

const midiHz = note => 440 * 2 ** ((note - 69) / 12);

// Record the Web Audio boundary; synthesizers, cue selection and event tracking stay real.
function installAudio(t) {
  const nodes = [];
  const param = () => ({ value: 0, setValueAtTime(value) { this.value = value; },
    setTargetAtTime(value) { this.value = value; }, linearRampToValueAtTime(value) { this.value = value; },
    exponentialRampToValueAtTime(value) { this.value = value; }, cancelScheduledValues() {} });
  const node = kind => {
    const result = { kind, frequency: param(), gain: param(), Q: param(), threshold: param(), ratio: param(),
      connect(destination) { this.destination = destination; return destination; }, disconnect() {}, start(time) { this.started = time; }, stop(time) { this.stopped = time; } };
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
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
  t.after(() => { delete globalThis.AudioContext; });
  const sound = createSound();
  t.after(() => sound.dispose());
  return { nodes, sound };
}

test('opening audio asks iOS for media playback so the silent switch does not mute it', t => {
  const session = { type: 'auto' };
  Object.defineProperty(navigator, 'audioSession', { value: session, configurable: true });
  t.after(() => { delete navigator.audioSession; });
  const { sound } = installAudio(t);
  assert.equal(session.type, 'auto', 'nothing changes before audio is enabled');
  assert.equal(sound.setMusic(true), true);
  assert.equal(session.type, 'playback');
});

test('a tap rebuilds a context iOS left suspended so saved music starts on the first touch', t => {
  const activation = { isActive: false };
  Object.defineProperty(navigator, 'userActivation', { value: activation, configurable: true });
  t.after(() => { delete navigator.userActivation; });
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const { nodes, sound } = installAudio(t);
  const made = [];
  globalThis.AudioContext = class extends globalThis.AudioContext {
    state = 'suspended'; closed = false;
    constructor() { super(); made.push(this); }
    close() { this.closed = true; return super.close(); }
    resume() { return new Promise(() => {}); } // iOS leaves a resume outside a gesture pending, so the context stays suspended
  };
  sound.setMusic(true);
  sound.setEnabled(true);
  assert.equal(made.length, 1, 'page load opens one context without rebuilding it');
  activation.isActive = true;
  sound.setMusic(true);
  assert.equal(made.length, 2, 'the first tap replaces the context made outside a gesture');
  assert.ok(made[0].closed);
  assert.equal(nodes.filter(item => item.kind === 'compressor').at(-1).destination, made[1].destination);
  sound.setEnabled(true);
  assert.equal(made.length, 2, 'later events of the same tap leave the fresh context to start');
  now = 5000;
  sound.setMusic(true);
  assert.equal(made.length, 3, 'a tapped context still stuck later (iOS interruption) is rebuilt');
  const limiter = nodes.filter(item => item.kind === 'compressor').at(-1);
  assert.ok(nodes.some(item => item.kind === 'gain' && item.destination === limiter && item.gain.value > 0),
    'the rebuilt context keeps effects audible without another settings change');
});

test('a hidden page suspends audio so the playback session cannot keep music going in the background', t => {
  const { sound } = installAudio(t);
  sound.setHidden(true);
  assert.equal(sound.setMusic(true), true);
  assert.equal(sound.running(), false, 'enabling audio while hidden does not start it');
  sound.setHidden(false);
  assert.equal(sound.running(), true);
  sound.setHidden(true);
  assert.equal(sound.running(), false);
  sound.setEnabled(true);
  assert.equal(sound.running(), false, 'a settings change while hidden does not resume it');
  sound.setHidden(false);
  assert.equal(sound.running(), true);
});

// Sky Spiral's first pad (MIDI 56) is not the shared intro pad (57) or race pad (55).
function heardFrequencies(t, trackId, phase) {
  const { nodes, sound } = installAudio(t);
  const race = createRace(trackId);
  race.phase = phase;
  race.player.speed = 40;
  assert.equal(sound.setMusic(true), true);
  sound.update(race);
  // The opening bar identifies the song: notes starting in the first 0.25 s and not cancelled by a song change
  // (stop() with no time). The intro's later lead notes legitimately reach course pitches.
  return nodes.filter(item => item.kind === 'oscillator' && 'stopped' in item && item.stopped !== undefined && item.started < 0.25)
    .map(item => item.frequency.value);
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
const COURSE_PADS = { spiral:56, neon:61, canyon:68, aurora:74, taipei:62, tokyo:63, alpine:58, coastal:65, cosmic:66 };

for (const [trackId, pad] of Object.entries(COURSE_PADS)) {
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
  for (const time of [0.3, 0.61, 1.21, 2.01]) { // below, then just past each DRIFT_REWARDS threshold
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

test('louder channel gains preserve slider curves, phase balance and mute', t => {
  const { nodes, sound } = installAudio(t);
  const race = createRace();
  race.phase = 'racing';
  sound.setEnabled(true, 0.5);
  sound.setMusic(true, 0.5);
  sound.update(race);
  const [effects, music] = nodes.filter(node => node.kind === 'gain' && node.destination?.kind === 'compressor');
  assert.equal(effects.gain.value, 1.6 * 0.25);
  assert.equal(music.gain.value, 1.25 * 0.25);
  sound.setEnabled(true);
  sound.setMusic(true);
  sound.update(race);
  assert.equal(effects.gain.value, 1.6);
  assert.equal(music.gain.value, 1.25);
  race.phase = 'ready'; sound.update(race);
  assert.equal(music.gain.value, 1.625);
  race.phase = 'paused'; sound.update(race);
  assert.equal(music.gain.value, 0.625);
  sound.setEnabled(false); sound.setMusic(false); sound.update(race);
  assert.equal(effects.gain.value, 0);
  assert.equal(music.gain.value, 0);
});

test('Checkpoint Rush plays its own soundtrack instead of the general racing pad', t => {
  const { nodes, sound } = installAudio(t);
  const race = createRace('coast', {mode:'checkpoint'});
  race.phase='racing';
  sound.setMusic(true);
  sound.update(race);
  // Intro notes queued before the first update and cancelled by it (stop() with no time) are never heard.
  const frequencies = nodes.filter(n=>n.kind==='oscillator' && n.stopped !== undefined).map(n=>n.frequency.value);
  assert.ok(frequencies.some(hz=>Math.abs(hz-midiHz(60))<0.05));
  assert.equal(frequencies.some(hz=>Math.abs(hz-midiHz(55))<0.05),false);
});

test('checkpoint pass triggers a new Web Audio tone once, and muted changes cannot replay', t => {
  const { nodes, sound } = installAudio(t);
  const race = createRace('coast',{mode:'checkpoint'});
  race.phase='racing';
  sound.setEnabled(true);
  const tones=()=>nodes.filter(n=>n.kind==='oscillator').length;
  sound.update(race);
  const count=tones();
  race.checkpoint.passed++;
  sound.update(race);
  assert.ok(tones()>count, 'passed checkpoint emits special synthetic chime');
  const after=tones();
  sound.update(race);
  assert.equal(tones(),after,'same gate cannot chime repeatedly');
  sound.setEnabled(false);
  race.checkpoint.passed++;
  sound.update(race);
  sound.setEnabled(true);
  sound.update(race);
  assert.equal(tones(),after,'events during mute are consumed');
});


test('racing Coast retains the shared race pad after new course songs are added', t => {
  const heard = heardFrequencies(t, 'coast', 'racing');
  assert.ok(heard.some(hz => Math.abs(hz - midiHz(55)) < 0.05));
  assert.equal(heard.some(hz => Math.abs(hz - midiHz(57)) < 0.05), false);
});

test('ITEM-12: item use, cooldown ready and a shield block each have their own sound, not the generic UI blip', t => {
  const { nodes, sound } = installAudio(t);
  sound.setEnabled(true);
  const pitches = name => {
    const start = nodes.length;
    sound.cue(name);
    return nodes.slice(start).filter(n => n.kind === 'oscillator').map(n => n.frequency.value).join();
  };
  const generic = pitches('ui'), pickup = pitches('pickup');
  const use = pitches('item-use'), ready = pitches('item-ready'), block = pitches('shield-block');
  assert.ok(use && ready && block);
  assert.equal(new Set([generic, pickup, use, ready, block]).size, 5);
});

test('risk ring envelopes stay below the pickup mix while retaining three audible notes', t => {
  const { sound } = installAudio(t);
  const original = globalThis.AudioContext.prototype.createGain;
  const peaks = [];
  globalThis.AudioContext.prototype.createGain = function() {
    const node = original.call(this), ramp = node.gain.linearRampToValueAtTime;
    node.gain.linearRampToValueAtTime = function(value, time) {
      peaks.push(value);
      return ramp.call(this, value, time);
    };
    return node;
  };
  sound.setEnabled(true);
  const levels = name => {
    peaks.length = 0;
    sound.cue(name);
    return [...peaks];
  };
  const pickup = levels('pickup'), risk = levels('ring-risk');
  assert.equal(risk.length, 3, 'keep the three-note risk warning');
  assert.ok(risk.every(value => value > 0), 'every note remains audible');
  assert.ok(risk.reduce((a, b) => a + b, 0) < pickup.reduce((a, b) => a + b, 0) * 0.85,
    'risk chime is quieter than the pickup before mixing with engine sound');
});

test('every ring type has its own bright chime, and a quick train steps up in pitch then resets after a pause', t => {
  const { nodes, sound } = installAudio(t);
  const made = [];
  globalThis.AudioContext = class extends globalThis.AudioContext { constructor() { super(); made.push(this); } };
  sound.setEnabled(true);
  const pitches = name => {
    const start = nodes.length;
    sound.cue(name);
    return nodes.slice(start).filter(n => n.kind === 'oscillator').map(n => Math.round(n.frequency.value)).join();
  };
  const types = ['charge', 'nitro', 'slipstream', 'risk', 'mystery', 'speed-pad'];
  const heard = types.map(type => { made[0].currentTime += 10; return pitches(`ring-${type}`); });
  assert.ok(heard.every(Boolean), 'each ring type makes sound');
  assert.equal(new Set([...heard, pitches('pickup'), pitches('ui')]).size, types.length + 2, 'distinct from each other, pickup and the UI blip');
  made[0].currentTime += 10;
  const train = Array.from({ length: 6 }, () => { made[0].currentTime += 0.3; return pitches('ring-charge'); });
  assert.equal(new Set(train).size, 6, 'six quick rings climb to six different pitches');
  made[0].currentTime += 10;
  assert.equal(pitches('ring-charge'), train[0], 'a pause resets the climb');
});


test('road supplies have distinct timbres and capacity-sized tails, with bounded voices and mute', t => {
  const { nodes, sound } = installAudio(t);
  sound.setEnabled(true);
  const signatures = [];
  for (const [tier, duration] of [['cell', .22], ['can', .36], ['tank', .54], ['overcharge', .76]]) {
    const start = nodes.length;
    sound.cue(`pickup-${tier}`);
    const voices = nodes.slice(start).filter(n => n.kind === 'oscillator' || n.kind === 'buffer');
    assert.ok(voices.length >= 2, `${tier} has a layered collection sound`);
    assert.ok(Math.abs(Math.max(...voices.map(n => n.stopped)) - duration) < .001, `${tier} tail ends on time`);
    assert.ok(voices.every(n => Number.isFinite(n.stopped)), 'every voice has a stop time');
    signatures.push(voices.map(n => `${n.kind}:${n.type}:${n.frequency.value}`).join());
  }
  assert.equal(new Set(signatures).size, 4, 'each supply is recognizable');
  sound.setEnabled(false);
  const muted = nodes.length;
  sound.cue('pickup-overcharge');
  assert.equal(nodes.length, muted, 'muted supplies allocate no voices');
  sound.setEnabled(true);
  for (let i = 0; i < 40; i++) sound.cue('pickup-overcharge');
  const capped = nodes.length;
  sound.cue('pickup-overcharge');
  assert.equal(nodes.length, capped, 'rapid collections respect the voice cap');
});

test('reward and victory play distinct notes on SFX and mute cancels their tails', t => {
  const { nodes, sound } = installAudio(t);
  sound.setEnabled(true);
  sound.setMusic(false);
  const cueVoices = start => nodes.slice(start).filter(node => node.kind === 'oscillator' && node.started !== undefined);
  let start = nodes.length;
  sound.cue('reward-credited');
  const reward = cueVoices(start);
  assert.equal(reward.length, 2);
  assert.ok(reward[1].frequency.value > reward[0].frequency.value);
  start = nodes.length;
  sound.cue('victory');
  const victory = cueVoices(start);
  assert.ok(victory.length >= 5);
  assert.ok(Math.max(...victory.map(node => node.stopped)) >= 1.5);
  sound.setEnabled(false);
  assert.ok(victory.every(node => node.stopped === undefined));
  start = nodes.length;
  sound.cue('reward-credited');
  assert.deepEqual(cueVoices(start), []);
});

test('backgrounding cancels pending stingers and suppresses new sounds', t => {
  const { nodes, sound } = installAudio(t);
  sound.setEnabled(true);
  const start = nodes.length;
  sound.cue('victory');
  const scheduled = nodes.slice(start).filter(node => node.kind === 'oscillator');
  assert.ok(scheduled.length >= 5);
  sound.setHidden(true);
  assert.ok(scheduled.every(node => node.stopped === undefined));
  const hidden = nodes.length;
  sound.cue('reward-credited');
  assert.equal(nodes.length, hidden);
});

// --- Music from the first moment (prelude), stale hidden flag, resume retry, diagnostics ---
// A prelude note is any music oscillator: cues are sine tones and none play here; the engine hum starts without a time.
const musicNotes = nodes => nodes.filter(node => node.kind === 'oscillator' && typeof node.started === 'number' && node.type !== 'sine');
const musicBus = nodes => nodes.filter(node => node.kind === 'gain' && node.destination?.kind === 'compressor')[1];
function trackContexts() {
  const made = [];
  globalThis.AudioContext = class extends globalThis.AudioContext { constructor() { super(); made.push(this); } };
  return made;
}
// The mock Web Audio boundary plus the contexts the engine makes, so a test can drive their clocks.
function installTracked(t) {
  const { nodes } = installAudio(t);
  const made = trackContexts();
  const sound = createSound();
  t.after(() => sound.dispose());
  return { nodes, made, sound };
}

test('switching music on queues 8 s of the intro at once, before any frame or 3D world exists', t => {
  const { nodes, sound } = installAudio(t);
  assert.equal(sound.setMusic(true), true);
  const onsets = musicNotes(nodes).map(node => node.started);
  assert.ok(onsets.length > 0, 'notes are queued without waiting for update()');
  assert.ok(Math.min(...onsets) < 0.1, 'the intro starts right away');
  assert.ok(Math.max(...onsets) >= 7.5, `the intro covers a long loading stall (last onset ${Math.max(...onsets)} s)`);
  assert.ok(musicBus(nodes).gain.value > 0, 'the music bus is audible before the first frame');
  assert.ok(nodes.some(node => node.kind === 'oscillator' && node.frequency.value > 0 && Math.abs(node.frequency.value - midiHz(57)) < 0.05),
    'it is the shared intro (pad MIDI 57)');
});

test('the frame loop continues the queued intro on the same beat grid without overlap or a skipped step', t => {
  const { nodes, made, sound } = installTracked(t);
  const race = createRace();
  const start = nodes.length;
  sound.setMusic(true);
  for (let time = 0; time <= 10; time += 1 / 60) { made[0].currentTime = time; sound.update(race); }
  const notes = musicNotes(nodes.slice(start));
  const sixteenth = 15 / 120;
  const seen = new Set();
  for (const note of notes) {
    const key = `${note.type}@${note.started.toFixed(4)}@${note.frequency.value.toFixed(2)}`;
    assert.equal(seen.has(key), false, `no note is scheduled twice (${key})`);
    seen.add(key);
    const steps = (note.started - notes[0].started) / sixteenth;
    assert.ok(Math.abs(steps - Math.round(steps)) < 1e-6, `every onset sits on the sixteenth grid (${note.started})`);
  }
  const onsets = [...new Set(notes.map(note => note.started))].sort((a, b) => a - b);
  assert.ok(onsets.at(-1) > 9.8, 'the frame loop keeps the intro going past the prelude');
  for (let i = 1; i < onsets.length; i++) assert.ok(onsets[i] - onsets[i - 1] <= 2 * sixteenth + 1e-6, `no gap at ${onsets[i - 1]} s`);
});

test('switching music off during the queued intro silences it at once and drops every note not yet started', t => {
  const { nodes, made: tracked, sound: fresh } = installTracked(t);
  const start = nodes.length;
  fresh.setMusic(true);
  const queued = musicNotes(nodes.slice(start));
  assert.ok(queued.some(note => note.started > 2), 'notes are queued beyond two seconds');
  tracked[0].currentTime = 2;
  fresh.setMusic(false);
  assert.equal(musicBus(nodes.slice(start)).gain.value, 0, 'the music bus is silent immediately, not on the next frame');
  for (const note of queued.filter(note => note.started > 2)) assert.equal(note.stopped, undefined, `queued note at ${note.started} s is cancelled`);
});

test('starting a race while the intro is queued switches to the course song at once', t => {
  const { nodes, made: tracked, sound: fresh } = installTracked(t);
  const start = nodes.length;
  fresh.setMusic(true);
  const intro = musicNotes(nodes.slice(start));
  assert.ok(intro.some(note => note.started > 3.5), 'the intro was queued past the start');
  tracked[0].currentTime = 3;
  const race = createRace('spiral');
  race.phase = 'racing';
  const before = nodes.length;
  fresh.update(race);
  for (const note of intro.filter(note => note.started > 3.05)) assert.equal(note.stopped, undefined, `stale intro note at ${note.started} s is dropped`);
  const course = nodes.slice(before).filter(node => node.kind === 'oscillator' && Math.abs(node.frequency.value - midiHz(56)) < 0.05);
  assert.ok(course.length && Math.min(...course.map(node => node.started)) < 3.1, 'the Sky Spiral pad starts now, not after the prelude');
});

test('switching music on mid-race does not queue the intro over the race song', t => {
  const { nodes, sound } = installAudio(t);
  const race = createRace('spiral');
  race.phase = 'racing';
  sound.setMusic(true);
  sound.update(race);
  sound.setMusic(false);
  sound.update(race);
  const start = nodes.length;
  sound.setMusic(true);
  assert.equal(musicNotes(nodes.slice(start)).length, 0, 'the race song resumes from the frame loop, not an intro prelude');
});

test('opening audio trusts the live page visibility over a stale hidden flag', t => {
  globalThis.document = { hidden: false };
  t.after(() => { delete globalThis.document; });
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const { sound } = installAudio(t);
  const made = trackContexts();
  sound.setMusic(true);
  assert.equal(sound.running(), true);
  document.hidden = true;
  sound.setHidden(true);
  assert.equal(sound.running(), false);
  document.hidden = false; // the page came back without a visibilitychange event
  for (let tap = 0; tap < 4; tap++) { now += 1300; sound.setMusic(true); sound.setEnabled(true); }
  assert.equal(sound.running(), true, 'a tap resumes audio instead of re-suspending it');
  assert.ok(made.length <= 2, `taps do not keep rebuilding contexts (${made.length} made)`);
});

test('update retries a stuck resume at most once a second while sound should play and the page is visible', t => {
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const { sound } = installAudio(t);
  let resumes = 0;
  globalThis.AudioContext = class extends globalThis.AudioContext {
    state = 'suspended';
    resume() { resumes++; return new Promise(() => {}); }
  };
  const race = createRace();
  sound.setMusic(true);
  const opened = resumes;
  const frames = seconds => { for (let i = 0; i < seconds * 60; i++) { now += 1000 / 60; sound.update(race); } };
  frames(3);
  assert.ok(resumes - opened >= 2 && resumes - opened <= 3, `retried once per second (${resumes - opened} in 3 s)`);
  sound.setHidden(true);
  const hidden = resumes;
  frames(3);
  assert.equal(resumes, hidden, 'no retry while hidden');
  sound.setHidden(false);
  sound.setMusic(false);
  sound.setEnabled(false);
  const silent = resumes;
  frames(3);
  assert.equal(resumes, silent, 'no retry while both channels are off');
});

test('diagnostic builds can read the live audio state', t => {
  const { sound } = installAudio(t);
  sound.setMusic(true);
  assert.deepEqual(sound.diagnostics(), { state: 'running', hidden: false, documentHidden: false, musicOn: true, currentTime: 0 });
});
