import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resultCloudStatus, signInOutcome } from '../src/result-cloud-status.ts';
import { setupCloudUI, cloudStatusState } from '../src/cloud-ui.ts';
import { cloudView } from '../src/cloud-view-state.ts';
import { CATALOGS } from '../src/i18n.ts';
const UI = CATALOGS;

const status = (connected, statusKey, signIn = 'idle') => resultCloudStatus({ connected, statusKey, statusState: cloudStatusState(statusKey), signIn });

test('signed out: explain cloud backup and offer sign-in', () => {
  for (const key of ['cloud.local', 'cloud.signedOut', 'cloud.failed'])
    assert.deepEqual(status(false, key), { key: 'cloud.result.signedOut', state: 'signed-out', signIn: true, busy: false });
});

test('signed in: syncing until Firestore acknowledges, then saved', () => {
  assert.deepEqual(status(true, 'cloud.syncing'), { key: 'cloud.result.syncing', state: 'syncing', signIn: false, busy: true });
  assert.deepEqual(status(true, 'cloud.saved'), { key: 'cloud.result.saved', state: 'synced', signIn: false, busy: false });
});

test('signed in but the write failed or is offline: kept on this device, will retry', () => {
  for (const key of ['cloud.pending', 'cloud.pendingAt', 'cloud.failed', 'cloud.quota'])
    assert.deepEqual(status(true, key), { key: 'cloud.result.pending', state: 'failed', signIn: false, busy: false });
});

test('failures that need the Cloud save panel never claim a retry; a lost device copy keeps its warning', () => {
  assert.equal(status(true, 'cloud.localFailed').key, 'cloud.localFailed');
  for (const key of ['cloud.otherAccount', 'cloud.deletePending'])
    assert.deepEqual(status(true, key), { key: 'cloud.result.attention', state: 'failed', signIn: false, busy: false });
});

test('sign-in from the results: pending, cancelled (neutral), failed, then signed-in success or failure', () => {
  assert.deepEqual(status(false, 'cloud.local', 'pending'), { key: 'cloud.result.signingIn', state: 'syncing', signIn: true, busy: true });
  assert.deepEqual(status(false, 'cloud.failed', 'cancelled'), { key: 'cloud.result.cancelled', state: 'signed-out', signIn: true, busy: false });
  assert.deepEqual(status(false, 'cloud.failed', 'failed'), { key: 'cloud.result.signInFailed', state: 'failed', signIn: true, busy: false });
  // The popup resolved before the auth observer reported the account: still working.
  assert.equal(status(false, 'cloud.local', 'done').key, 'cloud.result.syncing');
  // The auth observer may report the account while the popup promise is still pending.
  assert.equal(status(true, 'cloud.syncing', 'pending').key, 'cloud.result.syncing');
  assert.equal(status(true, 'cloud.saved', 'done').key, 'cloud.result.signedInSaved');
  assert.equal(status(true, 'cloud.pending', 'done').key, 'cloud.result.signedInPending');
});

test('closing the provider popup is a cancel; anything else is a failure', () => {
  for (const code of ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'])
    assert.equal(signInOutcome({ code }), 'cancelled');
  for (const error of [{ code: 'auth/popup-blocked' }, { code: 'auth/network-request-failed' }, new Error('x'), null])
    assert.equal(signInOutcome(error), 'failed');
});

test('every results cloud message exists in English and Traditional Chinese', () => {
  const keys = ['signedOut', 'signingIn', 'syncing', 'saved', 'signedInSaved', 'pending', 'signedInPending', 'cancelled', 'signInFailed', 'attention'];
  for (const locale of ['en', 'zh-TW']) for (const key of keys) {
    const text = UI[locale][`cloud.result.${key}`];
    assert.equal(typeof text, 'string', `${locale} cloud.result.${key}`);
    assert.ok(text.length <= 64, `${locale} cloud.result.${key} stays short: ${text}`);
  }
});

test('main.js hands the finished race to Cloud Save once; the results block is not its code', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /cloud\.saveRaceProgress\(race\.mode !== 'free'\)/);
  assert.doesNotMatch(main, /result-cloud/);
});

// Fake DOM/storage for the controller: one click handler per selector, no Firebase.
async function withController(run) {
  const values = new Map();
  const handlers = new Map();
  const mocks = {
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    navigator: { onLine: true },
    window: { addEventListener() {} },
    document: { querySelector: selector => ({ addEventListener: (event, handler) => handlers.set(`${selector}:${event}`, handler) }) },
  };
  const originals = new Map(Object.keys(mocks).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(mocks)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  try { await run(handlers); } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
}
const progress = () => ({ version: 2, unlocked: ['coast'], stars: {}, bests: {}, medals: {}, history: [], modeHistory: [], daily: [] });
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

test('results sign-in runs the shared sign-in + sync flow and reports success inline', async () => {
  await withController(async handlers => {
    let onUser, finishSync;
    const services = {
      watchCloudUser(callback) { onUser = callback; },
      signInToCloud: async () => { onUser({ uid: 'player_test_001', email: 'player@example.com' }); },
      syncCloudProgress: () => new Promise(resolve => { finishSync = resolve; }),
      syncGoogleAccountDetails: async () => true,
    };
    const cloud = setupCloudUI({ services, getProgress: progress, applyProgress() {} });
    onUser(null);
    cloud.saveRaceProgress(true);
    assert.equal(cloudView.resultHidden, false);
    assert.equal(cloudView.resultText, UI.en['cloud.result.signedOut']);
    assert.equal(cloudView.resultSignInHidden, false);
    const click = handlers.get('#result-cloud-login:click')();
    await flush();
    assert.equal(cloudView.resultText, UI.en['cloud.result.syncing'], 'signed in, waiting for Firestore');
    assert.equal(cloudView.resultSignInHidden, true);
    finishSync(progress());
    await click;
    await flush();
    // The next finished race starts from a fresh results state.
    cloud.saveRaceProgress(false);
    assert.equal(cloudView.resultHidden, true, 'Free Drive saves no result');
  });
});

test('results sign-in cancelled by closing the popup stays neutral and keeps the button', async () => {
  await withController(async handlers => {
    let onUser;
    const services = {
      watchCloudUser(callback) { onUser = callback; },
      signInToCloud: async () => { throw Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }); },
    };
    const cloud = setupCloudUI({ services, getProgress: progress, applyProgress() {} });
    onUser(null);
    cloud.saveRaceProgress(true);
    const originalError = console.error;
    console.error = () => {};
    try { await handlers.get('#result-cloud-login:click')(); } finally { console.error = originalError; }
    assert.equal(cloudView.resultText, UI.en['cloud.result.cancelled']);
    assert.equal(cloudView.resultState, 'signed-out');
    assert.equal(cloudView.resultSignInHidden, false);
    assert.equal(cloudView.resultSignInDisabled, false);
  });
});
