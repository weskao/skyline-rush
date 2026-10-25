import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tutorialHintKey } from '../src/tutorial-ui.js';

test('touch guide distinguishes slider, tilt and toggle-to-land variants', () => {
  assert.equal(tutorialHintKey('left', 'slide', 'hold'), 'tutorial.slide.left');
  assert.equal(tutorialHintKey('brake', 'slide', 'hold'), 'tutorial.slide.brake');
  assert.equal(tutorialHintKey('right', 'tilt', 'hold'), 'tutorial.tilt.right');
  assert.equal(tutorialHintKey('land', 'buttons', 'toggle'), 'tutorial.touch.landToggle');
  assert.equal(tutorialHintKey('land', 'buttons', 'hold'), 'tutorial.touch.land');
  assert.equal(tutorialHintKey('fly', 'buttons', 'toggle'), 'tutorial.touch.flyToggle');
  assert.equal(tutorialHintKey('throttle', 'buttons', 'hold'), 'tutorial.touch.throttle');
});
