import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSound } from '../src/audio.js';
import { createRace, startRace, stepRace } from '../src/game.js';
import { installRecordingAudio } from './helpers/audio-recorder.js';

// Wave 1 / workstream 14: sound.update() only touches an AudioParam when the continuous target really moved, at a
// bounded rate, never when SFX and music are both off, and never delays a one-shot cue.
const DT = 1 / 60;
function setup(t, { sfx = true, music = true } = {}) {
  const rec = installRecordingAudio();
  t.after(() => rec.uninstall());
  const sound = createSound(); t.after(() => sound.dispose());
  if (sfx) sound.setEnabled(true);
  if (music) sound.setMusic(true);
  const race = createRace('coast', {}); startRace(race);
  for (let i = 0; i < 400 && race.phase === 'countdown'; i++) stepRace(race, {}, DT);
  return { rec, sound, race, ctx: rec.contexts.at(-1) };
}
const targets = rec => rec.stats.paramCallsByMethod.setTargetAtTime ?? 0;

test('a steady race state writes almost no continuous AudioParam targets', t => {
  const { rec, sound, race, ctx } = setup(t);
  for (let i = 0; i < 30; i++) { stepRace(race, { up: true }, DT); ctx.currentTime += DT; sound.update(race); }
  const base = targets(rec);
  race.player.speed = 60; race.player.thrusting = false; // freeze the engine state
  for (let i = 0; i < 300; i++) { ctx.currentTime += DT; sound.update(race); }
  const writes = targets(rec) - base;
  assert.ok(writes < 60, `${writes} setTargetAtTime calls in 300 steady ticks (was ~6 per tick)`);
});

test('continuous writes per param are bounded by the update interval while the engine ramps', t => {
  const { rec, sound, race, ctx } = setup(t);
  const base = targets(rec);
  for (let i = 0; i < 120; i++) { race.player.speed = i * 0.7; ctx.currentTime += DT; sound.update(race); }
  const writes = targets(rec) - base;
  assert.ok(writes <= 7 * 2 * 31, `${writes} writes in 2 s of continuous ramping exceeds the 30 Hz per-param bound`);
});

test('no AudioParam writes while SFX and music are both off', t => {
  const { rec, sound, race, ctx } = setup(t);
  sound.setEnabled(false); sound.setMusic(false); // context stays open, as after switching both settings off
  const base = rec.stats.paramCalls;
  for (let i = 0; i < 120; i++) { stepRace(race, { up: true }, DT); ctx.currentTime += DT; sound.update(race); }
  assert.equal(rec.stats.paramCalls - base, 0);
});

test('one-shot cues are immediate and unthrottled', t => {
  const { rec, sound, race, ctx } = setup(t);
  for (let i = 0; i < 5; i++) { ctx.currentTime += DT; sound.update(race); }
  for (const name of ['boost', 'go', 'pickup-cell']) {
    const before = rec.stats.nodes;
    sound.cue(name);
    assert.ok(rec.stats.nodes > before, `${name} must create voices in the same call`);
  }
  race.player.nitroTime = 2; // BOOST transition in the very next update, 1 frame after the previous one
  const before = rec.stats.nodes;
  ctx.currentTime += DT; sound.update(race);
  assert.ok(rec.stats.nodes > before, 'boost cue from update() plays on the first frame it is detected');
});

test('engine parameters resume after the page is hidden and shown again', t => {
  const { rec, sound, race, ctx } = setup(t);
  for (let i = 0; i < 60; i++) { stepRace(race, { up: true }, DT); ctx.currentTime += DT; sound.update(race); }
  sound.setHidden(true); sound.setHidden(false);
  const base = targets(rec);
  race.player.speed = 10;
  for (let i = 0; i < 30; i++) { ctx.currentTime += DT; sound.update(race); }
  assert.ok(targets(rec) > base, 'a changed engine state must still reach the audio thread after resume');
});
