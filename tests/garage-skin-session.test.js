import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGarageSkinSession } from '../src/garage-skin-session.ts';

const account = 'driver_A';
const clock = () => 1_000;
const trial = { enabled: true, expiresAt: 2_000 };

test('BDD trial-only skin equips for this session but never grants ownership', () => {
  const skins = createGarageSkinSession(account, clock);
  skins.setTrial(trial);
  assert.equal(skins.select('thruster-ion'), true);
  assert.equal(skins.equip('thruster-ion'), true);
  assert.equal(skins.active('thruster'), 'thruster-ion');
  assert.equal(skins.view('thruster-ion')?.owned, false);
  assert.deepEqual(skins.cloudPayload().owned, []);
  assert.equal(Object.keys(skins.cloudPayload()).includes('trialEquipped'), false);
});

test('BDD trial expiry restores safe default even after using a visual preview', () => {
  let now = 1_000;
  const skins = createGarageSkinSession(account, () => now);
  skins.setTrial(trial);
  assert.equal(skins.equip('nitro-trail-cyan'), true);
  assert.equal(skins.active('nitro-trail'), 'nitro-trail-cyan');
  now = 2_000;
  assert.equal(skins.active('nitro-trail'), 'nitro-trail-basic');
  assert.equal(skins.preview('nitro-trail'), 'nitro-trail-basic', 'preview may not retain expired trial');
  assert.equal(skins.view('nitro-trail-cyan')?.state, 'locked');
});

test('BDD owned skin stays equipped when trial is revoked and only owned equip persists', () => {
  const skins = createGarageSkinSession(account, clock, { version: 1, accountId: account, owned: ['airflow-slipstream'], equipped: {} });
  skins.setTrial(trial);
  assert.equal(skins.equip('airflow-slipstream'), true);
  skins.setTrial({ enabled: false, expiresAt: 0 });
  assert.equal(skins.active('airflow'), 'airflow-slipstream');
  assert.deepEqual(skins.cloudPayload().equipped, { airflow: 'airflow-slipstream' });
  assert.equal(skins.equip('thruster-ion'), false);
  assert.equal(skins.active('thruster'), 'thruster-basic');
});

test('preview is read-only and a cancel reverts to active without writing inventory', () => {
  const skins = createGarageSkinSession(account, clock);
  assert.equal(skins.select('launch-flare-blue'), true);
  assert.equal(skins.preview('launch-flare'), 'launch-flare-blue');
  assert.equal(skins.active('launch-flare'), 'launch-flare-basic');
  assert.equal(skins.equip('launch-flare-blue'), false);
  skins.cancelPreview();
  assert.equal(skins.preview('launch-flare'), 'launch-flare-basic');
  assert.deepEqual(skins.cloudPayload().equipped, {});
});

test('account switching clears all trial, preview and owned state rather than leaking another user', () => {
  const skins = createGarageSkinSession(account, clock, { version: 1, accountId: account, owned: ['thruster-ion'], equipped: { thruster: 'thruster-ion' } });
  skins.setTrial(trial);
  skins.equip('nitro-trail-cyan');
  skins.select('launch-flare-blue');
  skins.setAccount('driver_B');
  assert.equal(skins.active('thruster'), 'thruster-basic');
  assert.equal(skins.active('nitro-trail'), 'nitro-trail-basic');
  assert.equal(skins.preview('launch-flare'), 'launch-flare-basic');
  assert.deepEqual(skins.cloudPayload().owned, []);
  assert.equal(skins.equip('thruster-ion'), false);
});

test('invalid catalog ids, malformed flags and wrong-category tokens cannot equip', () => {
  const skins = createGarageSkinSession(account, clock);
  skins.setTrial({ enabled: true, expiresAt: Number.POSITIVE_INFINITY });
  assert.equal(skins.equip('__proto__'), false);
  assert.equal(skins.equip('thruster-ion'), false);
  assert.equal(skins.select('not-a-skin'), false);
  assert.equal(skins.view('not-a-skin'), null);
  assert.equal(skins.active('airflow'), 'airflow-basic');
});

test('default cosmetics are equipped without a trial and do not modify PAINTS', () => {
  const skins = createGarageSkinSession(account, clock);
  assert.equal(skins.equip('launch-flare-basic'), true);
  assert.equal(skins.active('launch-flare'), 'launch-flare-basic');
  assert.deepEqual(skins.cloudPayload(), { version: 1, accountId: account, owned: [], equipped: { 'launch-flare': 'launch-flare-basic' } });
});

test('revoking trial drops temporary equips; a later feature flag must not silently re-equip', () => {
  const skins = createGarageSkinSession(account, clock);
  skins.setTrial(trial);
  assert.equal(skins.equip('thruster-ion'), true);
  assert.equal(skins.select('nitro-trail-cyan'), true);
  skins.setTrial({ enabled: false, expiresAt: 0 });
  assert.equal(skins.active('thruster'), 'thruster-basic');
  assert.equal(skins.preview('nitro-trail'), 'nitro-trail-basic');
  skins.setTrial(trial);
  assert.equal(skins.active('thruster'), 'thruster-basic');
});


test('expired trial cannot silently re-equip a temporary skin when a new trial starts', () => {
  let now = 1_000;
  const skins = createGarageSkinSession(account, () => now);
  skins.setTrial({ enabled: true, expiresAt: 2_000 });
  assert.equal(skins.equip('thruster-ion'), true);
  assert.equal(skins.active('thruster'), 'thruster-ion');

  now = 2_001;
  assert.equal(skins.active('thruster'), 'thruster-basic', 'expired trial must immediately fall back');
  skins.setTrial({ enabled: true, expiresAt: 3_000 });
  assert.equal(skins.active('thruster'), 'thruster-basic', 'new trial must not revive an expired equip');
  assert.deepEqual(skins.cloudPayload().owned, [], 'temporary access must never persist');
});
