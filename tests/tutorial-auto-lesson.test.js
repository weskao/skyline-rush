import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stepRace } from '../src/game.js';
import { CATALOGS } from '../src/i18n.ts';
import { TUTORIAL_STEPS, createInteractiveTutorial, prepareTutorialInput } from '../src/interactive-tutorial.ts';
import { TUTORIAL_COPY } from '../src/locales/tutorial-copy.ts';
import { tutorialAutoStatus, tutorialCueView, tutorialHighlight, tutorialHintKey, tutorialInstructionKey } from '../src/tutorial-ui.ts';
import { DEFAULT_KEY_MAP } from '../src/key-map.ts';

const DT = 1 / 60;
const seconds = s => Math.round(s * 60);
function tick(session, auto, action = {}) {
  const input = prepareTutorialInput({ ...action }, auto);
  stepRace(session.race, input, DT);
  session.update(input, DT);
}
const run = (session, auto, s, action) => { for (let i = 0; i < seconds(s); i++) tick(session, auto, action); };
function lesson(initial) {
  const state = { auto: initial };
  state.session = createInteractiveTutorial(() => state.auto);
  return state;
}

test('tutorial throttle follows the race rule for AUTO and never steers', () => {
  for (const auto of [true, false]) for (const brake of [true, false]) {
    const input = { steer: .3, brake, throttle: false, laneAssist: true };
    assert.equal(prepareTutorialInput(input, auto), input);
    assert.equal(input.throttle, auto && !brake);
    assert.equal(input.steer, .3);
    assert.equal(input.laneAssist, false);
  }
  assert.equal(prepareTutorialInput({ throttle: true }, false).throttle, true, 'AUTO off keeps the held accelerator');
});

test('AUTO on: lesson 1 rolls by itself and clears only after the 3 second read', () => {
  const { session } = lesson(true), car = session.race.player, startX = car.x;
  run(session, true, 2.9);
  assert.ok(car.speed > 5, 'AUTO accelerates the car');
  assert.equal(session.step, 'throttle', 'not skipped before it can be read');
  assert.equal(car.x, startX, 'AUTO never moves the car sideways');
  run(session, true, .2);
  assert.equal(session.step, 'left');
});

test('AUTO on: paused time does not count toward the read', () => {
  const { session } = lesson(true);
  run(session, true, 1);
  session.race.phase = 'paused';
  run(session, true, 5);
  session.race.phase = 'racing';
  run(session, true, 1.5);
  assert.equal(session.step, 'throttle');
  run(session, true, .7);
  assert.equal(session.step, 'left');
});

test('AUTO off: lesson 1 clears only on the held accelerator above 5 m/s', () => {
  const { session } = lesson(false), car = session.race.player;
  car.speed = 12;
  run(session, false, .8);
  assert.ok(car.speed > 5);
  assert.equal(session.step, 'throttle', 'rolling without the accelerator is not a pass');
  run(session, false, .6, { throttle: true });
  assert.equal(session.step, 'left');
});

test('toggling AUTO mid-lesson switches the clear rule at once and restarts the read', () => {
  const state = lesson(true), { session } = state;
  run(session, true, 2.5);
  state.auto = false;
  run(session, false, 1);
  assert.equal(session.step, 'throttle', 'AUTO off now needs the accelerator');
  state.auto = true;
  run(session, true, 2.9);
  assert.equal(session.step, 'throttle', 'the newly shown copy gets its own 3 seconds');
  state.auto = false;
  run(session, false, .6, { throttle: true });
  assert.equal(session.step, 'left', 'the held accelerator clears it without waiting for the read');
});

test('the lesson 1 cue follows AUTO', () => {
  const on = lesson(true);
  tick(on.session, true);
  assert.equal(on.session.cue, null, 'AUTO on never asks for the accelerator');
  tick(on.session, true, { brake: true });
  assert.equal(on.session.cue?.key, 'tutorial.cue.autoBrake', 'a held brake is what stops AUTO');
  const off = lesson(false), car = off.session.race.player;
  tick(off.session, false);
  assert.equal(off.session.cue?.key, 'tutorial.cue.throttle');
  car.speed = 12;
  tick(off.session, false);
  assert.equal(off.session.cue?.key, 'tutorial.cue.throttle', 'still rolling, but the accelerator is not held');
  tick(off.session, false, { throttle: true });
  assert.equal(off.session.cue, null);
});

test('lesson 1 copy, key chips and outline follow AUTO and the input device', () => {
  const key = (touch, auto) => tutorialInstructionKey('throttle', 'ready', null, false, { touch, steerMode: 'buttons', flyMode: 'hold', auto });
  assert.equal(key(false, true), 'tutorial.throttleAuto');
  assert.equal(key(false, false), 'tutorial.throttle');
  assert.equal(key(true, true), 'tutorial.throttleAutoTouch');
  assert.equal(key(true, false), 'tutorial.throttleTouch');
  assert.equal(tutorialHintKey('throttle', 'slide', 'hold', true), 'tutorial.touch.throttleAuto');
  assert.equal(tutorialHintKey('throttle', 'slide', 'hold', false), 'tutorial.touch.throttle');
  assert.deepEqual(tutorialHighlight('throttle', 'ready', true), { action: null, keys: null });
  assert.deepEqual(tutorialHighlight('throttle', 'ready', false), { action: 'throttle', keys: 'throttle' });
  assert.equal(tutorialCueView({ key: 'tutorial.cue.autoBrake', actions: ['brake'] }, true, 'hold', DEFAULT_KEY_MAP, 'slide').cueId, 'tutorial.cue.autoBrakeSlide');
});

test('desktop copy names F2; touch copy never does and names the real Settings path', () => {
  const BRAKE_BUTTON = { en: /\bBRAKE\b|\b[Hh]old(ing)? (the )?brake\b/, 'zh-TW': /按住煞車|放開煞車|煞車鍵/ };
  for (const lang of ['en', 'zh-TW']) {
    const copy = TUTORIAL_COPY[lang], labels = CATALOGS[lang];
    for (const name of ['tutorial.throttle', 'tutorial.throttleAuto']) assert.match(copy[name], /F2/, `${lang} ${name}`);
    for (const name of ['tutorial.throttleTouch', 'tutorial.throttleAutoTouch', 'tutorial.touch.throttle', 'tutorial.touch.throttleAuto', 'tutorial.cue.autoBrakeSlide']) {
      assert.ok(copy[name], `${lang} ${name}`);
      assert.doesNotMatch(copy[name], /F2/, `${lang} ${name}`);
      assert.doesNotMatch(copy[name], BRAKE_BUTTON[lang], `${lang} ${name}: the slide pad has no BRAKE button`);
    }
    const path = [lang === 'en' ? 'Pause' : '暫停', labels['settings.game'], labels['settings.driving'], labels['assist.label']].join(' → ');
    for (const name of ['tutorial.touch.throttle', 'tutorial.touch.throttleAuto']) assert.ok(copy[name].includes(path), `${lang} ${name} names ${path}`);
  }
});

test('copy that claimed assisted driving holds with AUTO off too', () => {
  for (const lang of ['en', 'zh-TW']) {
    const copy = TUTORIAL_COPY[lang];
    assert.doesNotMatch(copy['tutorial.assist'], /assisted|輔助/, lang);
    for (const name of ['tutorial.driftRetry.slow', 'tutorial.driftRetry.slowSlide']) {
      assert.doesNotMatch(copy[name], /to speed up/, `${lang} ${name}: releasing alone does not accelerate with AUTO off`);
    }
  }
  assert.doesNotMatch(TUTORIAL_COPY['zh-TW']['tutorial.driftRetry.slow'], /放開煞車加速/);
});

test('the coach status label reads the shared AUTO copy, without F2 on touch', () => {
  assert.equal(tutorialAutoStatus(true, false), 'Auto accelerator on · F2');
  assert.equal(tutorialAutoStatus(false, false), 'Auto accelerator off · F2');
  assert.equal(tutorialAutoStatus(true, true), 'Auto accelerator on');
  assert.equal(tutorialAutoStatus(false, true), 'Auto accelerator off');
  assert.equal(CATALOGS['zh-TW']['assist.titleOn'], '自動油門：開 · F2');
  assert.equal(CATALOGS['zh-TW']['assist.titleOff'], '自動油門：關 · F2');
});

test('the guide explains both AUTO states in both languages and keeps F2', () => {
  for (const lang of ['en', 'zh-TW']) {
    assert.match(CATALOGS[lang]['guide.throttle'], /F2/, lang);
    assert.match(CATALOGS[lang]['guide.throttle'], lang === 'en' ? /AUTO on.*AUTO off/ : /開啟.*關閉/, lang);
  }
});

test('main.js drives the tutorial from AUTO and leaves the race rule alone', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /isLocked/);
  assert.doesNotMatch(main, /\['assist-button'\]\.disabled/);
  assert.match(main, /prepareTutorialInput\(input, autoAssist\.isOn\(\)\)/);
  assert.match(main, /createInteractiveTutorial\(autoAssist\.isOn\)/);
  assert.match(main, /if \(autoAssist\.isOn\(\) && !input\.brake\) input\.throttle = true;/);
  assert.match(main, /input\.laneAssist = autoAssist\.isOn\(\);/);
});

test('with AUTO on, no touch lesson line names the accelerator: GAS is hidden then', () => {
  // touch-sprint-buttons.css hides GAS whenever AUTO is on, in the tutorial too (.claude/rules/touch-sprint-buttons.md).
  const ACCELERATOR = { en: /\b(throttle|accelerator|GAS)\b/i, 'zh-TW': /油門|加速鍵/ };
  const phases = ['ready', 'retry', 'airborne', 'rolling', 'flicked', 'readyToLand', 'sprinting'];
  const reasons = [null, 'noBoost', 'short', 'hard', 'slow', 'noRoll', 'early', 'timeout', 'noBrake'];
  const keys = new Set();
  for (const step of TUTORIAL_STEPS) for (const steerMode of ['buttons', 'slide', 'tilt']) for (const flyMode of ['hold', 'toggle']) {
    keys.add(tutorialHintKey(step, steerMode, flyMode, true));
    for (const phase of phases) for (const reason of reasons) {
      keys.add(tutorialInstructionKey(step, phase, reason, false, { touch: true, steerMode, flyMode, auto: true }));
    }
  }
  for (const lang of ['en', 'zh-TW']) for (const key of keys) {
    const line = TUTORIAL_COPY[lang][key];
    if (line) assert.doesNotMatch(line, ACCELERATOR[lang], `${lang} ${key}`);
  }
});
