import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('release opener visibility and unread marker are owned by its Vue view model', async () => {
  const { releaseView, updateReleaseView } = await import('../src/release-view-state.ts');
  updateReleaseView({ openHidden: false, openHasUpdate: true });
  assert.equal(releaseView.openHidden, false);
  assert.equal(releaseView.openHasUpdate, true);
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  assert.match(app, /:hidden="releaseView\.openHidden"/);
  assert.match(app, /'has-update': releaseView\.openHasUpdate/);
  const controller = readFileSync(new URL('../src/release-notes-ui.ts', import.meta.url), 'utf8');
  assert.match(controller, /updateReleaseView\(\{ openHasUpdate:/);
  assert.match(controller, /updateReleaseView\(\{ openHidden:/);
  assert.doesNotMatch(controller, /releaseOpen\.classList|releaseOpen\.hidden/, 'no competing imperative state writes');
});
