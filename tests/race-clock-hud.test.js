import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { raceClockState, raceClockTime } from '../src/race-clock.ts';
import { createRace, stepRace } from '../src/game.js';
import { CATALOGS } from '../src/i18n.ts';

test('race clock formats a stable three-digit millisecond readout', () => {
  assert.equal(raceClockTime(0), '00:00.000');
  assert.equal(raceClockTime(24.317), '00:24.317');
  assert.equal(raceClockTime(59.999), '00:59.999');
  assert.equal(raceClockTime(60), '01:00.000');
  assert.equal(raceClockTime(6000.125), '100:00.125');
  assert.equal(raceClockTime(-10), '00:00.000');
  assert.equal(raceClockTime(NaN), '00:00.000');
});

test('one race phase maps to one readable clock state', () => {
  for (const phase of ['ready', 'countdown']) assert.equal(raceClockState(phase), 'ready');
  assert.equal(raceClockState('racing'), 'running');
  assert.equal(raceClockState('paused'), 'paused');
  assert.equal(raceClockState('finished'), 'finished');
});

test('the authoritative race clock starts at GO, freezes on pause, resumes and freezes at finish', () => {
  const race = createRace();
  const tick = () => stepRace(race, {}, 1 / 60);
  assert.equal(race.elapsed, 0);
  race.phase = 'countdown';
  tick();
  assert.equal(race.elapsed, 0, 'countdown must not count as racing');
  race.phase = 'racing';
  tick();
  const afterGo = race.elapsed;
  assert.ok(afterGo > 0);
  race.phase = 'paused';
  for (let i = 0; i < 8; i++) tick();
  assert.equal(race.elapsed, afterGo, 'pause must freeze time');
  race.phase = 'racing';
  tick();
  assert.ok(race.elapsed > afterGo, 'resume must continue rather than reset');
  race.phase = 'finished';
  const finalTime = race.elapsed;
  tick();
  assert.equal(race.elapsed, finalTime, 'finish must freeze the result');
  assert.equal(createRace().elapsed, 0, 'a fresh heat resets the clock');
});

test('the in-race clock uses one existing #timer source, with SVG art and translated state', () => {
  const app = readFileSync(new URL('../src/RaceInfo.vue', import.meta.url), 'utf8');
  const hud = readFileSync(new URL('../src/race-hud.ts', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(app, /id="race-clock"/);
  assert.match(app, /id="race-clock-state"/);
  assert.match(app, /race-stopwatch\.svg/);
  assert.equal((app.match(/id="timer"/g) ?? []).length, 1, 'no duplicated timer');
  assert.match(hud, /raceClockTime\(race\.elapsed\)/);
  assert.match(hud, /raceClockState\(race\.phase\)/);
  assert.match(css, /\.race-clock\[data-state="paused"\]/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  for (const locale of ['en', 'zh-TW']) {
    for (const key of ['race.elapsed', 'race.clock.ready', 'race.clock.running', 'race.clock.paused', 'race.clock.finished'])
      assert.ok(CATALOGS[locale][key], `${locale}: ${key}`);
  }
});
