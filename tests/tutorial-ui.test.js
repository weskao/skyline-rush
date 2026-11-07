import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tutorialHintKey, tutorialTouchTarget } from '../src/tutorial-ui.ts';

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
