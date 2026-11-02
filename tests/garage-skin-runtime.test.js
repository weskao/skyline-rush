import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  garageSkinState, currentGarageSkins, selectedGarageSkins, garageSkinEntry,
  selectGarageSkin, equipGarageSkin, cancelGarageSkinPreview,
  setGarageSkinAccount, setGarageSkinTrial, subscribeGarageSkins,
} from '../src/garage-skin-runtime.ts';

test('runtime publishes preview and race equip independently, without ownership grants', () => {
  setGarageSkinAccount('runtime_a');
  setGarageSkinTrial(true, 9_007_199_254_740_991);
  const revisions = [];
  const unsubscribe = subscribeGarageSkins(() => revisions.push(garageSkinState.revision));
  assert.equal(selectGarageSkin('thruster-ion'), true);
  assert.equal(selectedGarageSkins().thruster, 'thruster-ion');
  assert.equal(currentGarageSkins().thruster, 'thruster-basic');
  assert.equal(equipGarageSkin('thruster-ion'), true);
  assert.equal(currentGarageSkins().thruster, 'thruster-ion');
  assert.equal(garageSkinEntry('thruster-ion')?.owned, false);
  assert.ok(revisions.length >= 2);
  unsubscribe();
});

test('account switch clears trial and selected preview; disabling flag revokes equip', () => {
  setGarageSkinAccount('runtime_b');
  assert.equal(currentGarageSkins().thruster, 'thruster-basic');
  assert.equal(selectedGarageSkins().thruster, 'thruster-basic');
  assert.equal(selectGarageSkin('nitro-trail-cyan'), true);
  assert.equal(equipGarageSkin('nitro-trail-cyan'), true);
  assert.equal(currentGarageSkins()['nitro-trail'], 'nitro-trail-cyan');
  setGarageSkinTrial(false, 0);
  assert.equal(currentGarageSkins()['nitro-trail'], 'nitro-trail-basic');
  cancelGarageSkinPreview();
  setGarageSkinAccount('runtime_a');
  assert.equal(currentGarageSkins()['nitro-trail'], 'nitro-trail-basic');
});

test('short-lived trial expires automatically and notifies subscribers without another click', async () => {
  setGarageSkinAccount('timer_driver');
  setGarageSkinTrial(true, Date.now() + 50);
  assert.equal(equipGarageSkin('thruster-ion'), true);
  let revoked = false;
  const unsubscribe = subscribeGarageSkins(() => {
    if (currentGarageSkins().thruster === 'thruster-basic') revoked = true;
  });
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(currentGarageSkins().thruster, 'thruster-basic');
  assert.equal(revoked, true);
  unsubscribe();
});

test('trial expiry beyond the JS timer limit stays scheduled and does not revoke early', () => {
  setGarageSkinAccount('long_timer_driver');
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  const scheduled = new Map();
  let nextId = 1;
  globalThis.setTimeout = (callback, delay) => {
    const id = nextId++;
    scheduled.set(id, { callback, delay });
    return id;
  };
  globalThis.clearTimeout = id => { scheduled.delete(id); };
  try {
    const expiresAt = Date.now() + 2_147_483_647 + 60_000;
    setGarageSkinTrial(true, expiresAt);
    assert.equal(equipGarageSkin('airflow-slipstream'), true);
    assert.equal(scheduled.size, 1, 'long trials must have a scheduled expiry check');
    const [id, first] = [...scheduled.entries()][0];
    assert.equal(first.delay, 2_147_483_647, 'timeout must stay within the platform limit');
    scheduled.delete(id);
    first.callback(); // An early/chunked wake-up must not revoke an unexpired trial.
    assert.equal(currentGarageSkins().airflow, 'airflow-slipstream');
    assert.equal(scheduled.size, 1, 'the remaining time must be scheduled again');
  } finally {
    setGarageSkinAccount('long_timer_cleanup');
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  }
});
