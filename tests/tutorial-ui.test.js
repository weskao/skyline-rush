import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL_COPY } from '../src/locales/tutorial-copy.ts';
import { tutorialHintKey, tutorialHighlight, tutorialTouchTarget, tutorialCueView, tutorialInstructionKey } from '../src/tutorial-ui.ts';
import { DEFAULT_KEY_MAP } from '../src/key-map.ts';

test('touch guide distinguishes slider, tilt and toggle-to-land variants', () => {
  assert.equal(tutorialHintKey('left', 'slide', 'hold'), 'tutorial.slide.left');
  assert.equal(tutorialHintKey('brake', 'slide', 'hold'), 'tutorial.slide.brake');
  assert.equal(tutorialHintKey('right', 'tilt', 'hold'), 'tutorial.tilt.right');
  assert.equal(tutorialHintKey('land', 'buttons', 'toggle'), 'tutorial.touch.landToggle');
  assert.equal(tutorialHintKey('land', 'buttons', 'hold'), 'tutorial.touch.land');
  assert.equal(tutorialHintKey('fly', 'buttons', 'toggle'), 'tutorial.touch.flyToggle');
  assert.equal(tutorialHintKey('throttle', 'buttons', 'hold'), 'tutorial.touch.throttle');
  assert.equal(tutorialHintKey('airChain', 'buttons', 'hold'), 'tutorial.touch.airChain');
  assert.equal(tutorialHintKey('barrelRoll', 'buttons', 'hold'), 'tutorial.touch.barrelRoll');
  assert.equal(tutorialHintKey('barrelRoll', 'slide', 'hold'), 'tutorial.slide.barrelRoll');
  assert.equal(tutorialHintKey('barrelRoll', 'tilt', 'hold'), 'tutorial.tilt.barrelRoll');
  assert.equal(tutorialHintKey('airChain', 'slide', 'toggle'), 'tutorial.touch.airChain');
});

test('slide-mode lessons never draw a box over the slide pad', () => {
  for (const [step, phase, action] of [['left', 'ready', 'left'], ['right', 'ready', 'right'], ['brake', 'ready', 'brake'],
    ['drift', 'ready', 'drift'], ['barrelRoll', 'flicked', null]]) {
    assert.equal(tutorialTouchTarget(step, phase, 'slide', action), null, `${step}/${phase}`);
  }
  assert.equal(tutorialTouchTarget('left', 'ready', 'buttons', 'left'), '#touch-controls [data-control="left"]');
  assert.equal(tutorialTouchTarget('throttle', 'ready', 'slide', 'throttle'), '#touch-controls [data-control="throttle"]');
});

test('the live cue toast names the bound desktop keys, the countdown and the toggle-FLY release', () => {
  const keyMap = { ...DEFAULT_KEY_MAP, fly: ['KeyJ'], boost: ['ShiftLeft'] };
  const hold = tutorialCueView({ key: 'tutorial.cue.chainHold', actions: ['fly', 'boost'], count: 0.3 }, false, 'hold', keyMap);
  assert.deepEqual(hold.cueKeys, ['J', 'Shift']);
  assert.equal(hold.cueCount, '0.3s');
  assert.ok(hold.cue.length > 0);
  assert.equal(tutorialCueView({ key: 'tutorial.cue.chainRelease', actions: ['fly'] }, false, 'toggle', keyMap).cueId, 'tutorial.cue.chainReleaseToggle');
  assert.deepEqual(tutorialCueView({ key: 'tutorial.cue.driftStart', actions: ['brake'] }, true, 'hold', keyMap).cueKeys, [], 'touch shows no key chips');
  assert.match(tutorialCueView({ key: 'tutorial.cue.driftRelease', actions: ['brake'], n: 2 }, false, 'hold', keyMap).cue, /2/);
  assert.equal(tutorialCueView(null, false, 'hold', keyMap).cue, '');
  assert.equal(tutorialInstructionKey('drift', 'finishing', null, false), 'tutorial.finishing');
});

test('cue text follows the live settings: toggle FLY, slide pad and rebound keys', () => {
  const keyMap = { ...DEFAULT_KEY_MAP, brake: ['KeyB'] };
  const cueId = (key, touch, flyMode, steer) => tutorialCueView({ key, actions: ['brake'] }, touch, flyMode, keyMap, steer).cueId;
  for (const name of ['chainFly', 'chainBoost', 'chainHold', 'chainLanding', 'chainRelease', 'rollFly', 'rollClimb', 'rollRelease', 'rollSpin']) {
    assert.equal(cueId('tutorial.cue.' + name, false, 'toggle', 'buttons'), 'tutorial.cue.' + name + 'Toggle', name);
    assert.equal(cueId('tutorial.cue.' + name, false, 'hold', 'buttons'), 'tutorial.cue.' + name, name);
  }
  assert.equal(cueId('tutorial.cue.brakeAhead', true, 'hold', 'slide'), 'tutorial.cue.brakeAheadSlide');
  assert.equal(cueId('tutorial.cue.brakeHold', true, 'hold', 'slide'), 'tutorial.cue.brakeHoldSlide');
  assert.equal(cueId('tutorial.cue.brakeAhead', true, 'hold', 'buttons'), 'tutorial.cue.brakeAhead', 'a brake button is named as such');
  assert.equal(cueId('tutorial.cue.brakeAhead', false, 'hold', 'slide'), 'tutorial.cue.brakeAhead', 'desktop has no slide pad');
  assert.deepEqual(tutorialCueView({ key: 'tutorial.cue.brakeAhead', actions: ['brake'] }, false, 'hold', keyMap, 'buttons').cueKeys, ['B']);
});

test('every cue variant has copy in both languages', () => {
  for (const lang of ['en', 'zh-TW']) {
    for (const name of ['brakeAhead', 'brakeHold', 'brakeAheadSlide', 'brakeHoldSlide', 'chainFlyToggle', 'chainBoostToggle', 'chainHoldToggle',
      'chainLandingToggle', 'rollFlyToggle', 'rollClimbToggle', 'rollReleaseToggle', 'rollSpinToggle']) {
      assert.ok(TUTORIAL_COPY[lang]['tutorial.cue.' + name], `${lang} ${name}`);
    }
    for (const key of ['tutorial.slide.right', 'tutorial.slide.brake']) assert.doesNotMatch(TUTORIAL_COPY[lang][key], /highlight|高亮/, 'the pad is no longer outlined');
  }
});

test('the landing lesson shows no FLY outline, ripple target or key chip', () => {
  for (const mode of ['buttons', 'slide', 'tilt']) {
    for (const phase of ['ready', 'airborne', 'retry']) {
      assert.equal(tutorialTouchTarget('land', phase, mode, 'fly'), null, `land/${phase}/${mode}`);
    }
  }
  assert.deepEqual(tutorialHighlight('land', 'ready'), { action: null, keys: null });
  assert.equal(tutorialHighlight('fly', 'ready').keys, 'fly');
  assert.equal(tutorialHighlight('airChain', 'ready').keys, 'fly boost nitro');
  assert.equal(tutorialHighlight('barrelRoll', 'ready').action, 'fly');
  assert.equal(tutorialTouchTarget('fly', 'ready', 'buttons', 'fly'), '#touch-controls [data-control="fly"]');
});
