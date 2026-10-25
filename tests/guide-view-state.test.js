import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideView, updateGuideView } from '../src/guide-view-state.js';

test('guide Vue state keeps device panel and instruction text in sync', () => {
  updateGuideView({ selectedDevice: 'mobile', practiceKey: 'tutorial.retry', practiceText: 'Retry' });
  assert.deepEqual({ device: guideView.selectedDevice, key: guideView.practiceKey, text: guideView.practiceText },
    { device: 'mobile', key: 'tutorial.retry', text: 'Retry' });
  updateGuideView({ selectedDevice: 'desktop' });
  assert.equal(guideView.selectedDevice, 'desktop');
  assert.equal(guideView.practiceKey, 'tutorial.retry');
});
