import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createRace } from '../src/game.js';
import { createRivalCues, RIVAL_CUE_GAP, RIVAL_CUE_RANGE } from '../src/rival-cues.ts';
import { createRaceAudioEvents } from '../src/race-audio-events.ts';
import { createSound } from '../src/audio.js';
import { createEffects } from '../src/effects.js';

// R9 (user, 2026-11-02): a rival collecting or firing NITRO near the player gets a visual cue, and the player's
// own sounds at a lower rival volume; several cars at once are throttled to one cue per RIVAL_CUE_GAP.
function racing() {
  const race = createRace('coast');
  race.phase = 'racing'; race.elapsed = 20; race.player.distance = 1000;
  race.rivals.forEach((r, i) => Object.assign(r, { distance: 1010 + i * 5, nitroTime: 0, nitroUses: 0, lastTake: null }));
  return race;
}
const take = (race, i, kind = 'cell') => {
  const r = race.rivals[i];
  r.lastTake = { time: race.elapsed, distance: r.distance, x: r.x, altitude: 0, kind };
};
const fire = (race, i) => { race.rivals[i].nitroUses++; race.rivals[i].nitroTime = 2.5; };

test('R9: one take cue per gap however many rivals collect at once, and only near the player', () => {
  const cues = createRivalCues(), race = racing();
  cues.update(race);
  take(race, 0); take(race, 1); take(race, 2);
  assert.deepEqual(cues.update(race).map(c => c.kind), ['take'], 'three takes in one frame: one cue');
  race.elapsed += RIVAL_CUE_GAP / 2; take(race, 3);
  assert.deepEqual(cues.update(race), [], 'throttled');
  race.elapsed += RIVAL_CUE_GAP; take(race, 4);
  assert.deepEqual(cues.update(race).map(c => c.kind), ['take'], 'after the gap');
  race.elapsed += RIVAL_CUE_GAP; race.rivals[5].distance = race.player.distance + RIVAL_CUE_RANGE + 1; take(race, 5);
  assert.deepEqual(cues.update(race), [], 'too far to notice');
});

test('R9: a rival firing NITRO near the player is cued once, throttled separately from takes', () => {
  const cues = createRivalCues(), race = racing();
  cues.update(race);
  fire(race, 0); take(race, 1); fire(race, 2);
  assert.deepEqual(cues.update(race).map(c => c.kind).sort(), ['nitro', 'take']);
  assert.deepEqual(cues.update(race), [], 'never replayed');
  const fresh = racing(); fire(fresh, 0);
  assert.deepEqual(cues.update(fresh), [], 'a new race starts from what it already shows');
});

test('R9: race audio plays the rival cues; the synth plays them quieter than the player\'s own', t => {
  const events = createRaceAudioEvents(), race = racing();
  events.update(race, true);
  take(race, 0); fire(race, 1);
  assert.deepEqual(events.update(race, true).sounds.filter(s => typeof s === 'string').sort(), ['rival-nitro', 'rival-pickup']);

  const peaks = [];
  globalThis.AudioContext = class {
    currentTime = 0; sampleRate = 100; state = 'running'; destination = {};
    node(kind) { const gain = { value: 0, setValueAtTime(v) { this.value = v; peaks.push(v); }, setTargetAtTime() {}, linearRampToValueAtTime(v) { peaks.push(v); }, exponentialRampToValueAtTime() {} };
      return { kind, frequency: { ...gain, setValueAtTime() {} }, gain, Q: { value: 0 }, threshold: { value: 0 }, ratio: { value: 0 }, connect: d => d, disconnect() {}, start() {}, stop() {} }; }
    createOscillator() { return this.node('oscillator'); } createGain() { return this.node('gain'); } createBiquadFilter() { return this.node('filter'); }
    createDynamicsCompressor() { return this.node('compressor'); } createBufferSource() { return this.node('buffer'); }
    createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
    resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); } close() { return Promise.resolve(); }
  };
  t.after(() => { delete globalThis.AudioContext; });
  const sound = createSound();
  t.after(() => sound.dispose());
  sound.setEnabled(true);
  const loudest = name => { peaks.length = 0; sound.cue(name); return Math.max(0, ...peaks); };
  assert.ok(loudest('rival-pickup') > 0 && loudest('rival-pickup') < loudest('pickup'), 'rival pickup is quieter');
  assert.ok(loudest('rival-nitro') > 0 && loudest('rival-nitro') < loudest('boost'), 'rival NITRO is quieter');
});

test('R9: the cue is visual too: a small burst where the rival took the item, with no new scene objects', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), effects = createEffects(scene, () => 0), race = racing();
  t.after(() => effects.dispose());
  race.pickups = []; race.rings = [];
  const points = scene.children.find(object => object.isPoints), lit = () => [...points.geometry.attributes.alpha.array].filter(a => a > 0).length;
  effects.update(race, 0.016, 0, false, false);
  const objects = scene.children.length, before = lit();
  take(race, 0, 'can');
  effects.update(race, 0.016, 0, false, false);
  assert.ok(lit() > before, 'particles burst at the take');
  assert.equal(scene.children.length, objects, 'reuses the shared particle system');
});
