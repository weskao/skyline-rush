import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupCloudUI, cloudStatusState, safeAvatarUrl } from '../src/cloud-ui.ts';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../src/cloud-ui.ts', import.meta.url), 'utf8');

test('Cloud Save has one controller: main.js only wires it', () => {
  assert.equal(typeof setupCloudUI, 'function');
  for (const moved of [/function saveCloudProgress/, /CLOUD_STATE/, /#cloud-delete/, /#cloud-import-file/, /watchCloudUser\(/])
    assert.doesNotMatch(main, moved);
});

test('the controller never loads Firebase itself: services are injected', () => {
  assert.doesNotMatch(controller, /from '\.\/cloud-save\.ts'/);
  assert.doesNotMatch(controller, /from 'firebase/);
});

test('each status message maps to one visual sync state, unknown keys read as errors', () => {
  assert.equal(cloudStatusState('cloud.saved'), 'synced');
  assert.equal(cloudStatusState('cloud.pendingAt'), 'offline');
  assert.equal(cloudStatusState('cloud.otherAccount'), 'other-account');
  assert.equal(cloudStatusState('cloud.deletePending'), 'deleting');
  assert.equal(cloudStatusState('cloud.nope'), 'error');
});

test('only https avatars are shown; anything else falls back to initials', () => {
  assert.equal(safeAvatarUrl('https://example.com/a.png'), 'https://example.com/a.png');
  assert.equal(safeAvatarUrl('http://example.com/a.png'), '');
  assert.equal(safeAvatarUrl('javascript:alert(1)'), '');
  assert.equal(safeAvatarUrl(null), '');
  assert.equal(safeAvatarUrl(undefined), '');
});
