import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL_COPY } from '../src/locales/tutorial-copy.ts';
import { TUTORIAL_STEPS } from '../src/interactive-tutorial.ts';
import { tutorialHintKey, tutorialTouchTarget, tutorialCueView, tutorialInstructionKey } from '../src/tutorial-ui.ts';
import { DEFAULT_KEY_MAP } from '../src/key-map.ts';

// Every hint names the control the player's own Controls settings give them. Toggle FLY is tapped on and off, never
// held or released; the slide pad (slide mode, and tilt, which brakes on the same pad) has no BRAKE button.
// Keyboard FLY is always held: the FLY mode setting only latches the touch button (src/input.ts bindButton).
const HELD_FLY = { en: /\b(hold|holding|release|releasing)\s+(FLY|it to glide)\b|FLY[^.!]*\bheld\b|FLY released|FLY once/i, 'zh-TW': /按住 FLY|放開 FLY|FLY 保持按住|放開後|起飛後放開|輕點一下 FLY/ };
const BRAKE_BUTTON = { en: /\bBRAKE\b|\b[Hh]old(ing)? (the )?brake\b/, 'zh-TW': /按住煞車|放開煞車|煞車鍵/ };
const REASONS = { left: ['missed'], right: ['missed'], brake: ['missed', 'noBrake'], boost: ['timeout'], drift: ['short', 'slow'],
  airChain: ['noBoost', 'short', 'hard', 'slow'], barrelRoll: ['noRoll', 'early', 'hard'], nitro: [null] };
const PHASES = ['ready', 'cleared', 'finishing', 'airborne', 'rolling', 'readyToLand', 'flicked', 'sprinting'];
const CUES = ['throttle', 'brakeAhead', 'brakeHold', 'driftSpeed', 'driftStart', 'driftHold', 'driftRelease', 'driftMax', 'chainFly', 'chainBoost',
  'chainHold', 'chainRelease', 'chainLanding', 'rollFly', 'rollClimb', 'rollRelease', 'rollFlick', 'rollOpposite', 'rollSpin', 'rollSoften',
  'rollLand', 'boostAhead', 'boostGo', 'finishing'];
// Desktop plus each touch steering mode the tutorial can run (tilt before permission falls back to slide).
const INPUTS = [{ touch: false, steerMode: 'buttons' }, { touch: true, steerMode: 'buttons' }, { touch: true, steerMode: 'slide' }, { touch: true, steerMode: 'tilt' }];

function shownKeys(step, input, flyMode) {
  const controls = { ...input, flyMode };
  const keys = PHASES.map(phase => tutorialInstructionKey(step, phase, null, false, controls));
  for (const reason of REASONS[step] ?? []) keys.push(tutorialInstructionKey(step, 'retry', reason, false, controls));
  if (input.touch) keys.push(tutorialHintKey(step, input.steerMode, flyMode));
  return keys;
}

test('every lesson hint resolves to copy in both languages under every control setting', () => {
  for (const step of TUTORIAL_STEPS) for (const input of INPUTS) for (const flyMode of ['hold', 'toggle']) {
    for (const key of shownKeys(step, input, flyMode)) {
      for (const lang of ['en', 'zh-TW']) assert.ok(TUTORIAL_COPY[lang][key], `${lang} ${key} (${step} ${input.steerMode} ${flyMode})`);
    }
  }
  for (const name of CUES) for (const input of INPUTS) for (const flyMode of ['hold', 'toggle']) {
    const { cueId } = tutorialCueView({ key: 'tutorial.cue.' + name, actions: [] }, input.touch, flyMode, DEFAULT_KEY_MAP, input.steerMode);
    for (const lang of ['en', 'zh-TW']) assert.ok(TUTORIAL_COPY[lang][cueId], `${lang} ${cueId}`);
  }
});

test('toggle FLY on touch never tells the player to hold or release FLY', () => {
  for (const input of INPUTS.filter(input => input.touch)) {
    const keys = TUTORIAL_STEPS.flatMap(step => shownKeys(step, input, 'toggle'))
      .concat(CUES.map(name => tutorialCueView({ key: 'tutorial.cue.' + name, actions: [] }, true, 'toggle', DEFAULT_KEY_MAP, input.steerMode).cueId));
    for (const key of keys) for (const lang of ['en', 'zh-TW']) {
      assert.doesNotMatch(TUTORIAL_COPY[lang][key], HELD_FLY[lang], `${lang} ${key} (${input.steerMode})`);
    }
  }
});

test('keyboard FLY is always held, so desktop keeps the hold copy whatever the touch FLY setting', () => {
  const desktop = { touch: false, steerMode: 'buttons', flyMode: 'toggle' };
  assert.equal(tutorialInstructionKey('airChain', 'ready', null, false, desktop), 'tutorial.airChain');
  assert.equal(tutorialInstructionKey('barrelRoll', 'rolling', null, false, desktop), 'tutorial.barrelRollRolling');
  for (const name of ['chainRelease', 'rollFly', 'rollSoften']) {
    assert.equal(tutorialCueView({ key: 'tutorial.cue.' + name, actions: ['fly'] }, false, 'toggle', DEFAULT_KEY_MAP).cueId, 'tutorial.cue.' + name);
  }
});

test('the slide pad and tilt never name a BRAKE button: braking is a pull down on the pad', () => {
  for (const steerMode of ['slide', 'tilt']) {
    const input = { touch: true, steerMode };
    const keys = ['brake', 'drift'].flatMap(step => shownKeys(step, input, 'hold'))
      .concat(CUES.map(name => tutorialCueView({ key: 'tutorial.cue.' + name, actions: [] }, true, 'hold', DEFAULT_KEY_MAP, steerMode).cueId));
    for (const key of keys) for (const lang of ['en', 'zh-TW']) {
      assert.doesNotMatch(TUTORIAL_COPY[lang][key], BRAKE_BUTTON[lang], `${lang} ${key} (${steerMode})`);
    }
    assert.match(TUTORIAL_COPY.en[tutorialHintKey('brake', steerMode, 'hold')], /pull down/i, steerMode);
    assert.match(TUTORIAL_COPY.en[tutorialHintKey('drift', steerMode, 'hold')], /pull down/i, steerMode);
  }
  assert.equal(tutorialHintKey('brake', 'buttons', 'hold'), 'tutorial.touch.brake', 'buttons mode keeps its brake button');
  assert.equal(tutorialInstructionKey('drift', 'ready', null, false, { touch: true, steerMode: 'buttons', flyMode: 'hold' }), 'tutorial.drift');
});

test('the outlined touch control exists in the current steering mode', () => {
  assert.equal(tutorialTouchTarget('drift', 'ready', 'buttons', 'drift'), '#touch-controls [data-control="brake"]', 'buttons-mode drift outlines BRAKE');
  for (const [step, action] of [['left', 'left'], ['right', 'right'], ['brake', 'brake'], ['drift', 'drift']]) {
    assert.equal(tutorialTouchTarget(step, 'ready', 'tilt', action), null, `tilt ${step}: the steer buttons are hidden and the pad is never outlined`);
  }
  assert.equal(tutorialTouchTarget('fly', 'ready', 'tilt', 'fly'), '#touch-controls [data-control="fly"]');
});
