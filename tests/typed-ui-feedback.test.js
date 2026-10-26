import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRace } from '../src/game.js';
import { createModeAudioState, modeAudioCues, musicForMode } from '../src/mode-audio.ts';
import { createCallouts } from '../src/callouts.ts';

test('audio and callout business services share typed canonical implementations without duplicate JS', () => {
  for (const name of ['mode-audio', 'callouts']) {
    assert.equal(existsSync(new URL(`../src/${name}.ts`, import.meta.url)), true, name + ' should be typed');
    assert.equal(existsSync(new URL(`../src/${name}.js`, import.meta.url)), false, name + ' should not retain legacy source');
  }
});
test('checkpoint audio gives one clear event when passed counter increments', () => {
  const state = createModeAudioState();
  const race = { phase:'racing', mode:'checkpoint', trackId:'coast', player:{ distance:1 },
    checkpoint:{ passed:0, missed:0, timeLeft:28 } };
  assert.equal(musicForMode(race), 'checkpoint');
  assert.deepEqual(modeAudioCues(race,state),[]);
  race.checkpoint.passed=1;
  assert.deepEqual(modeAudioCues(race,state),['gate-clear']);
  assert.deepEqual(modeAudioCues(race,state),[]);
});
test('locale-based in-race callouts coalesce and never emit duplicate nitro refills', () => {
  const race = createRace();
  race.phase='racing';
  const events = createCallouts();
  assert.equal(events.update(race), null);
  race.player.nitro=0.5;
  assert.equal(events.update(race)?.title, '+0.5');
  assert.equal(events.update(race)?.title, '+0.5');
  race.elapsed=1.3;
  assert.equal(events.update(race),null);
});
