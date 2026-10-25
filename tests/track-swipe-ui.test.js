import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canBeginTrackSwipe } from '../src/track-swipe-ui.js';

const base = { button: 0, phase: 'ready', tutorial: false, editing: false, busy: false, dialogOpen: false,
  pointerType: 'touch', clientX: 200, width: 390 };
test('track swipe admits touch drag in center and rejects back-edge gestures', () => {
  assert.equal(canBeginTrackSwipe(base), true);
  assert.equal(canBeginTrackSwipe({ ...base, clientX: 0 }), false);
  assert.equal(canBeginTrackSwipe({ ...base, clientX: 390 }), false);
  assert.equal(canBeginTrackSwipe({ ...base, clientX: 0, pointerType: 'mouse' }), true);
});
test('track swipe cannot capture inputs during game play, modal and layout editing', () => {
  for (const state of [{ phase: 'racing' }, { tutorial: true }, { editing: true }, { busy: true }, { dialogOpen: true }, { button: 2 }]) {
    assert.equal(canBeginTrackSwipe({ ...base, ...state }), false);
  }
});
