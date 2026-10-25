import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidePracticeLabelKey, guideDeviceForPointer } from '../src/guide-ui.ts';

test('guide practice action reflects completed tutorial progress', () => {
  assert.equal(guidePracticeLabelKey(false), 'tutorial.start');
  assert.equal(guidePracticeLabelKey(true), 'tutorial.retry');
});

test('guide picks mobile instructions for touch displays only', () => {
  assert.equal(guideDeviceForPointer(true), 'mobile');
  assert.equal(guideDeviceForPointer(false), 'desktop');
});
