import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coachView, updateCoachView } from '../src/tutorial-coach-state.ts';

test('tutorial coach Vue state changes only between steps, while progress is maintained separately', () => {
  updateCoachView({ visible: true, step: 'fly', title: 'Lift off', hintKeys: 'fly', hintText: '', skipHidden: false });
  assert.equal(coachView.visible, true);
  assert.equal(coachView.step, 'fly');
  assert.equal(coachView.hintKeys, 'fly');
  updateCoachView({ visible: false, step: 'complete', hintKeys: '', skipHidden: true });
  assert.equal(coachView.visible, false);
  assert.equal(coachView.skipHidden, true);
});
