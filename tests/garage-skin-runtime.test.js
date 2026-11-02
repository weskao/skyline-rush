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
