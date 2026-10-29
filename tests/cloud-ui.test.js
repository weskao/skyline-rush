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

test('account switch snapshots session-only personal medals before the page reloads', async () => {
  const values = new Map([['skyline-rush-cloud-owner', 'alice']]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const personal = { version: 1, awards: { 'time-clean': '2026-10-29T01:00:00.000Z' }, longestFlight: 0, maxAerialCombo: 0 };
  const handlers = new Map();
  let onUser, reloads = 0;
  const mocks = {
    localStorage: storage, confirm: () => true, location: { reload: () => { reloads++; } },
    window: { addEventListener() {} },
    document: { querySelector: selector => ({ addEventListener: (event, handler) => handlers.set(`${selector}:${event}`, handler) }) },
  };
  const originals = new Map(Object.keys(mocks).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(mocks)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  try {
    setupCloudUI({ services: { watchCloudUser(callback) { onUser = callback; } },
      getProgress: () => ({ version: 2, unlocked: ['coast'], stars: {}, bests: {}, medals: {}, history: [], modeHistory: [], daily: [] }),
      getLocalChallengeMedals: () => personal, applyProgress() {} });
    onUser({ uid: 'bob' });
    await handlers.get('#cloud-switch:click')();
    assert.equal(reloads, 1);
    assert.deepEqual(JSON.parse(values.get('skyline-rush-cloud-account:alice')).localChallengeMedals, personal);
    assert.deepEqual(JSON.parse(values.get('skyline-rush-challenge-medals-v1')).awards, {}, 'Bob must still start empty');
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
