import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { prepareTutorialInput, createInteractiveTutorial } from '../src/interactive-tutorial.ts';

test('interactive tutorial uses one typed state controller without a duplicate legacy file', () => {
  assert.equal(existsSync(new URL('../src/interactive-tutorial.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/interactive-tutorial.js', import.meta.url)), false);
});
test('guided input only supplies safe auto-throttle and never invents steering', () => {
  const input = { steer: 0, brake: false, throttle: false, laneAssist: true };
  assert.equal(prepareTutorialInput(input, 'left'), input);
  assert.equal(input.steer, 0);
  assert.equal(input.throttle, true);
  assert.equal(input.laneAssist, false);
  const braking = { steer: 0, brake: true, throttle: false };
  prepareTutorialInput(braking, 'left');
  assert.equal(braking.throttle, false);
  const session = createInteractiveTutorial();
  assert.equal(session.step, 'throttle');
  assert.equal(session.race.phase, 'racing');
  assert.equal(session.race.rivals.length, 0);
});
