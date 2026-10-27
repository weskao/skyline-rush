import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseView, updateReleaseView } from '../src/release-view-state.ts';

test('release notes view model atomically replaces active tab and content', () => {
  updateReleaseView({ panelLabel: 'release-tab-1', tabs: [{ version: '0.22.0' }], entries: [{ title: 'New feature' }], heroSrc: '' });
  assert.equal(releaseView.panelLabel, 'release-tab-1');
  assert.equal(releaseView.tabs[0].version, '0.22.0');
  assert.equal(releaseView.entries[0].title, 'New feature');
  updateReleaseView({ panelLabel: 'release-tab-0', tabs: [{ version: '0.23.0' }], entries: [] });
  assert.equal(releaseView.panelLabel, 'release-tab-0');
  assert.deepEqual(releaseView.entries, []);
});
