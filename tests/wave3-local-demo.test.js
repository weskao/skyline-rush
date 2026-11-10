import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWave3LocalDemo } from '../src/wave3-local-demo.ts';
import { WAVE3_EXPERIENCE_VERSION } from '../src/wave3-experience-contract.ts';

const event = (eventId, kind = 'drift', extra = {}) => ({
  schemaVersion: WAVE3_EXPERIENCE_VERSION, eventId, completionId: 'race-00000001',
  trackId: 'coast', mode: 'classic', kind, occurredAt: 1700000000000, eligible: true, ...extra,
});
const completion = (id = 'race-00000001', extra = {}) => ({
  schemaVersion: WAVE3_EXPERIENCE_VERSION, completionId: id,
  trackId: 'coast', mode: 'classic', occurredAt: 1700000000000, eligible: true, ...extra,
});

test('a guest can open a local-only experience without auth or backend', () => {
  const store = createWave3LocalDemo({ now: () => 1700000000000 });
  const snapshot = store.getSnapshot();
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.mode, 'local-demo');
  assert.equal(snapshot.authority, 'local');
  assert.equal(snapshot.accountId, 'guest');
  assert.equal(snapshot.demoPoints, 20);
  assert.equal(snapshot.syncState, 'local-only');
  assert.deepEqual(snapshot.demoInventory, []);
  assert.equal(snapshot.equippedPreview, null);
  assert.equal(snapshot.missions['mission-race'].progress, 0);
});

test('eligible results award disposable demo points once and update only demo missions', () => {
  const store = createWave3LocalDemo();
  assert.equal(store.recordGameEvent(event('finish-race-1', 'finish')).status, 'completed');
  assert.equal(store.settleCompletion(completion()).status, 'completed');
  assert.equal(store.getSnapshot().demoPoints, 40);
  assert.equal(store.getSnapshot().missions['mission-race'].progress, 1);
  assert.equal(store.getSnapshot().missions['mission-time'].progress, 0);
  assert.equal(store.recordGameEvent(event('finish-race-1', 'finish')).status, 'duplicate');
  assert.equal(store.settleCompletion(completion()).status, 'duplicate');
  assert.equal(store.getSnapshot().demoPoints, 40);
});

test('noneligible or unsupported modes cannot create local settlement rewards', () => {
  const store = createWave3LocalDemo();
  assert.equal(store.settleCompletion(completion('race-00000002', { eligible: false })).status, 'ineligible');
  assert.equal(store.settleCompletion(completion('race-00000003', { mode: 'free' })).status, 'ineligible');
  assert.equal(store.settleCompletion(completion('race-00000004', { mode: 'endless' })).status, 'ineligible');
  assert.equal(store.getSnapshot().demoPoints, 20);
});

test('actual drift/combo events progress matching demo goals once', () => {
  const store = createWave3LocalDemo();
  assert.equal(store.recordGameEvent(event('drift-1')).status, 'completed');
  assert.equal(store.recordGameEvent(event('drift-1')).status, 'duplicate');
  assert.equal(store.recordGameEvent(event('combo-1', 'combo')).status, 'completed');
  assert.equal(store.getSnapshot().missions['mission-drift'].progress, 1);
  assert.equal(store.getSnapshot().missions['mission-combo'].progress, 1);
  assert.equal(store.getSnapshot().missions['mission-race'].progress, 0);
});

test('completed mission can be claimed only once', () => {
  const store = createWave3LocalDemo();
  store.recordGameEvent(event('finish-race-1', 'finish'));
  assert.equal(store.claimMission('mission-race').status, 'completed');
  assert.equal(store.getSnapshot().demoPoints, 30);
  assert.equal(store.claimMission('mission-race').status, 'duplicate');
  assert.equal(store.getSnapshot().demoPoints, 30);
  assert.equal(store.claimMission('missing').status, 'invalid');
});

test('demo redemption is atomic, insufficient points never reduces the balance', () => {
  const store = createWave3LocalDemo();
  assert.equal(store.redeemPreview('thruster-plasma').status, 'insufficient-demo-points');
  assert.equal(store.redeemPreview('unknown-skin').status, 'invalid');
  assert.equal(store.redeemPreview('thruster-ion').status, 'insufficient-demo-points');
  store.settleCompletion(completion());
  assert.equal(store.redeemPreview('thruster-ion').status, 'completed');
  assert.equal(store.getSnapshot().demoPoints, 15);
  assert.deepEqual(store.getSnapshot().demoInventory, ['thruster-ion']);
  assert.equal(store.redeemPreview('thruster-ion').status, 'duplicate');
  assert.equal(store.equipPreview('thruster-ion').status, 'completed');
  assert.equal(store.getSnapshot().equippedPreview, 'thruster-ion');
});

test('subscribers see changes and unsubscribe stops subsequent updates', () => {
  const store = createWave3LocalDemo();
  let calls = 0;
  const stop = store.subscribe(() => calls++);
  store.recordGameEvent(event('drift-1'));
  assert.equal(calls, 1);
  stop(); store.recordGameEvent(event('drift-2'));
  assert.equal(calls, 1);
});

test('switching accounts discards demo-only state and blocks stale account events', () => {
  const store = createWave3LocalDemo();
  const oldAccount = store.getSnapshot().accountId;
  store.settleCompletion(completion());
  store.setAccount('account_B');
  assert.equal(store.getSnapshot().accountId, 'account_B');
  assert.equal(store.getSnapshot().demoPoints, 20);
  assert.equal(store.settleCompletion(completion('race-00000002', { accountId: oldAccount })).status, 'invalid');
  assert.equal(store.getSnapshot().demoPoints, 20);
  store.resetDemo();
  assert.equal(store.getSnapshot().demoPoints, 20);
  assert.equal(store.getSnapshot().accountId, 'account_B');
});

test('invalid input does not mutate a demo state', () => {
  const store = createWave3LocalDemo();
  assert.equal(store.recordGameEvent(event('', 'finish')).status, 'invalid');
  assert.equal(store.recordGameEvent(event('bad-event', 'wrong-kind')).status, 'invalid');
  assert.equal(store.settleCompletion(completion('race-00000001', { schemaVersion: 999 })).status, 'invalid');
  assert.equal(store.getSnapshot().demoPoints, 20);
});
