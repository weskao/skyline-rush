import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tutorialHintKey, tutorialTouchTarget, tutorialCueView, tutorialInstructionKey } from '../src/tutorial-ui.ts';
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

test('slide-mode Turn left lesson draws no box over the slide pad', () => {
  assert.equal(tutorialTouchTarget('left', 'ready', 'slide', 'left'), null);
  assert.equal(tutorialTouchTarget('right', 'ready', 'slide', 'right'), '.touch-pad');
  assert.equal(tutorialTouchTarget('barrelRoll', 'flicked', 'slide', null), '.touch-pad');
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
