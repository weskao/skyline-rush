import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseTabIndex } from '../src/release-notes-ui.ts';

test('release notes keyboard tabs wrap and keep home/end behavior', () => {
  assert.equal(releaseTabIndex(0, 5, 'ArrowLeft'), 4);
  assert.equal(releaseTabIndex(4, 5, 'ArrowRight'), 0);
  assert.equal(releaseTabIndex(1, 5, 'ArrowDown'), 2);
  assert.equal(releaseTabIndex(1, 5, 'ArrowUp'), 0);
  assert.equal(releaseTabIndex(2, 5, 'Home'), 0);
  assert.equal(releaseTabIndex(2, 5, 'End'), 4);
  assert.equal(releaseTabIndex(2, 5, 'Escape'), null);
});
