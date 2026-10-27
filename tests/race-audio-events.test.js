import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace } from '../src/game.js';
import { createRaceAudioEvents } from '../src/race-audio-events.ts';

const racing = () => { const race = createRace(); race.phase = 'racing'; race.player.speed = 40; return race; };
const cues = frame => frame.sounds.filter(sound => typeof sound === 'string');
const impulses = frame => frame.sounds.filter(sound => typeof sound !== 'string');

test('cue detection has one home: the synth engine keeps no race-transition bookkeeping', () => {
  const engine = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /collectedPickups|lastNearMiss|wasThrusting|lowCharge/);
});

test('countdown ticks once per new second and GO fires once on the switch to racing', () => {
  const events = createRaceAudioEvents();
  const race = createRace();
  race.phase = 'countdown'; race.countdown = 2.5;
  assert.deepEqual(cues(events.update(race, true)), ['tick']);
  race.countdown = 2.1;
  assert.deepEqual(cues(events.update(race, true)), []);
  race.countdown = 1.9;
  assert.deepEqual(cues(events.update(race, true)), ['tick']);
  race.phase = 'racing';
  assert.deepEqual(cues(events.update(race, true)), ['go']);
  assert.deepEqual(cues(events.update(race, true)), []);
});

test('a new race asks for silence once and does not replay pickups already taken', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  race.pickups[0].taken = true;
  const first = events.update(race, true);
  assert.equal(first.silence, true);
  assert.deepEqual(cues(first), []);
  assert.equal(events.update(race, true).silence, false);
});

test('a pickup collected while muted is consumed and never cues after unmuting', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  race.pickups[0].taken = true;
  assert.deepEqual(cues(events.update(race, false)), []);
  assert.deepEqual(cues(events.update(race, true)), []);
  race.pickups[1].taken = true;
  assert.deepEqual(cues(events.update(race, true)), ['pickup']);
});

test('fresh impacts and landings become impulses in order, sized like before', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  race.elapsed = 5;
  race.player.impact = { time: 4.9, intensity: 0.7, kind: 'barrier' };
  race.player.landing = { time: 4.95, speed: 28 };
  assert.deepEqual(impulses(events.update(race, true)), [
    { intensity: 0.7, landing: false, barrier: true },
    { intensity: 1, landing: true, barrier: false },
  ]);
  assert.deepEqual(impulses(events.update(race, true)), [], 'the same impact never repeats');
});

test('entering pause asks for silence once', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  race.phase = 'paused';
  assert.equal(events.update(race, true).silence, true);
  assert.equal(events.update(race, true).silence, false);
});

test('low charge warns once below 20 % and re-arms only after recovering to 30 %', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  events.update(race, true);
  race.player.fuel = 15;
  assert.deepEqual(cues(events.update(race, true)), ['low']);
  race.player.fuel = 25;
  assert.deepEqual(cues(events.update(race, true)), []);
  race.player.fuel = 15;
  assert.deepEqual(cues(events.update(race, true)), [], 'no re-arm between 20 and 30');
  race.player.fuel = 35; events.update(race, true);
  race.player.fuel = 15;
  assert.deepEqual(cues(events.update(race, true)), ['low']);
});

test('the frame reports racing and boosting state for the engine mix', () => {
  const events = createRaceAudioEvents();
  const race = racing();
  race.player.nitroTime = 1;
  assert.deepEqual([events.update(race, true).active, events.update(race, true).boosting], [true, true]);
  race.phase = 'ready'; race.player.nitroTime = 0;
  assert.deepEqual([events.update(race, true).active, events.update(race, true).boosting], [false, false]);
});
