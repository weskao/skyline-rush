import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('release opener visibility and unread marker are owned by its Vue view model', async () => {
  const { releaseView, updateReleaseView } = await import('../src/release-view-state.ts');
  updateReleaseView({ openHidden: false, openHasUpdate: true });
  assert.equal(releaseView.openHidden, false);
  assert.equal(releaseView.openHasUpdate, true);
  const app = readFileSync(new URL('../src/ReleaseOpenButton.vue', import.meta.url), 'utf8');
  assert.match(app, /:hidden="releaseView\.openHidden"/);
  assert.match(app, /'has-update': releaseView\.openHasUpdate/);
  const controller = readFileSync(new URL('../src/release-notes-ui.ts', import.meta.url), 'utf8');
  assert.match(controller, /updateReleaseView\(\{ openHasUpdate:/);
  assert.match(controller, /updateReleaseView\(\{ openHidden:/);
  assert.doesNotMatch(controller, /releaseOpen\.classList|releaseOpen\.hidden/, 'no competing imperative state writes');
});

test('home footer makes the current build and release-notes action discoverable without adding another menu', () => {
  const app = readFileSync(new URL('../src/ReleaseOpenButton.vue', import.meta.url), 'utf8');
  assert.match(app, /class="build-version-number">v\{\{ version \}\}<\/span>/);
  assert.match(app, /class="build-version-caption" data-i18n="release\.open">What's new<\/span>/);
  assert.match(app, /:aria-label="[^"]*t\('release\.open'/, 'version opener describes its action in the current locale');
  assert.match(app, /v-if="releaseView\.openHasUpdate" class="release-tab-unread"/, 'version opener uses the release tab badge');
  assert.match(app, /<Teleport to="#startup-release-entry" :disabled="!releaseView\.openOnStartup">/);
});
