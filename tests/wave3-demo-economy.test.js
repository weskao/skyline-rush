import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWave3LocalDemo } from '../src/wave3-local-demo.ts';
import { createWave3DemoStorage } from '../src/wave3-demo-storage.ts';
import { projectWave3Currency } from '../src/wave3-currency-view.ts';
import { projectWave3DemoResults } from '../src/wave3-demo-results-view.ts';
import { demoRedemptionState } from '../src/wave3-demo-catalog.ts';

const now = 1_800_000_000_000;
const demo = () => createWave3LocalDemo({ now: () => now });
const race = (id, extra = {}) => ({
  schemaVersion: 1, completionId: `race-${id}`, trackId: 'coast', mode: 'classic',
  occurredAt: now, eligible: true, ...extra,
});

test('eligible races pay coin distance rewards and the first finish on a track pays once', () => {
  const port = demo();
  assert.equal(port.getSnapshot().demoEconomy?.coins, 0);
  const first = port.settleCompletion(race('0001'));
  assert.equal(first.deltaDemoPoints, 20);
  assert.equal(first.deltaDemoCoins, 70);
  assert.equal(first.snapshot.demoEconomy.coins, 70);
  const replay = port.settleCompletion(race('0001'));
  assert.equal(replay.status, 'duplicate');
  assert.equal(replay.snapshot.demoEconomy.coins, 70);
  assert.equal(port.settleCompletion(race('0002', { mode: 'time' })).deltaDemoCoins, 40);
  assert.equal(port.settleCompletion(race('0003', { trackId: 'canyon' })).deltaDemoCoins, 70);
  assert.equal(port.settleCompletion(race('0004', { eligible: false })).snapshot.demoEconomy.coins, 180);
});

test('the daily race claim credits coins and weekly five-finish claim credits diamonds exactly once', () => {
  const port = demo();
  for (let index = 0; index < 5; index++) {
    port.recordGameEvent({ ...race(`mission-${index}`), eventId: `finish-${index}`, kind: 'finish' });
  }
  const daily = port.claimMission('mission-race:daily');
  assert.equal(daily.deltaDemoCoins, 40);
  assert.equal(daily.deltaDemoPoints, 10);
  assert.equal(port.claimMission('mission-race:daily').status, 'duplicate');
  const weekly = port.claimMission('mission-race:weekly');
  assert.equal(weekly.deltaDemoDiamonds, 5);
  assert.equal(weekly.deltaDemoPoints, 10);
  assert.equal(port.claimMission('mission-race:weekly').snapshot.demoEconomy.diamonds, 5);
});

test('a priced cosmetic debits just its listed demo balance and remains equipable', () => {
  const port = demo();
  assert.equal(demoRedemptionState('nitro-trail-cyan', port.getSnapshot()), 'insufficient-demo-coins');
  assert.equal(port.redeemPreview('thruster-void').status, 'insufficient-demo-diamonds');
  for (let index = 0; index < 3; index++) port.settleCompletion(race(`credit-${index}`));
  const result = port.redeemPreview('nitro-trail-cyan');
  assert.equal(result.status, 'completed');
  assert.equal(result.snapshot.demoEconomy.coins, 0);
  assert.equal(result.snapshot.demoPoints, 80);
  assert.equal(port.redeemPreview('nitro-trail-cyan').status, 'duplicate');
  assert.equal(port.equipPreview('nitro-trail-cyan').status, 'completed');
});

test('wallet and result project credited demo coins with localized labels', () => {
  const port = demo();
  const result = port.settleCompletion(race('0001'));
  const coin = projectWave3Currency(result.snapshot, 'zh-TW').find(row => row.id === 'coins');
  assert.deepEqual([coin.label, coin.display, coin.state], ['試玩金幣', '70', 'local-demo']);
  const view = projectWave3DemoResults(result, { locale: 'zh-TW' });
  assert.equal(view.coins, '+70 試玩金幣');
  assert.deepEqual(view.coinBalance, { label: '試玩金幣總額', from: 0, total: 70 });
  assert.equal(projectWave3DemoResults(port.settleCompletion(race('0001'))).coins, null);
});

test('v1 checkpoints retain existing progress and extended wallets reload by account', () => {
  const port = demo();
  port.settleCompletion(race('0001'));
  port.redeemPreview('thruster-ion');
  const checkpoint = port.getCheckpoint();
  const oldSnapshot = { ...checkpoint.snapshot };
  delete oldSnapshot.demoEconomy;
  const restored = demo();
  restored.restoreCheckpoint({ ...checkpoint, snapshot: oldSnapshot });
  assert.equal(restored.getSnapshot().demoPoints, 15);
  assert.deepEqual(restored.getSnapshot().demoInventory, ['thruster-ion']);
  assert.equal(restored.getSnapshot().demoEconomy?.coins, 0);
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const cache = () => createWave3DemoStorage({ storage, now: () => now });
  assert.equal(cache().saveCheckpoint(checkpoint), true);
  restored.restoreCheckpoint(cache().loadCheckpoint('guest'));
  assert.equal(restored.settleCompletion(race('0001')).status, 'duplicate');
  assert.equal(restored.settleCompletion(race('0002')).snapshot.demoEconomy.coins, 110);
  assert.equal(restored.setAccount('other').demoEconomy.coins, 0);
  assert.equal(restored.restoreCheckpoint(checkpoint), null);
  restored.setAccount(null);
  restored.restoreCheckpoint(checkpoint);
  assert.equal(restored.resetDemo().demoEconomy.coins, 0);
});

test('weekly claims can fund a diamond cosmetic without affecting points or coins', () => {
  const week = 7 * 24 * 60 * 60 * 1000;
  let time = now;
  const port = createWave3LocalDemo({ now: () => time });
  for (let period = 0; period < 3; period++) {
    for (let index = 0; index < 5; index++) {
      const completionId = `weekly-${period}-${index}`;
      port.recordGameEvent({ ...race(completionId, { occurredAt: time }), eventId: completionId, kind: 'finish' });
    }
    assert.equal(port.claimMission('mission-race:weekly').deltaDemoDiamonds, 5);
    time += week;
  }
  assert.equal(demoRedemptionState('thruster-void', port.getSnapshot()), 'ready');
  const result = port.redeemPreview('thruster-void');
  assert.equal(result.deltaDemoDiamonds, -15);
  assert.equal(result.snapshot.demoEconomy.diamonds, 0);
  assert.equal(result.snapshot.demoEconomy.coins, 0);
  assert.equal(result.snapshot.demoPoints, 50);
  assert.equal(port.equipPreview('thruster-void').status, 'completed');
});

test('invalid economy cache data is rejected without replacing a current profile', () => {
  const port = demo();
  port.settleCompletion(race('0001'));
  const checkpoint = port.getCheckpoint();
  const data = new Map();
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  };
  const cache = createWave3DemoStorage({ storage, now: () => now });
  const key = 'skyline-rush-wave3-demo:v1:guest';
  for (const demoEconomy of [
    { coins: -1, diamonds: 0, firstFinishes: [] },
    { coins: 70, diamonds: 1.5, firstFinishes: [] },
    { coins: 70, diamonds: 0, firstFinishes: ['coast', 'coast'] },
    { coins: 70, diamonds: 0, firstFinishes: [], verified: true },
  ]) {
    const snapshot = { ...checkpoint.snapshot, demoEconomy };
    data.set(key, JSON.stringify({ version: 1, accountId: 'guest', savedAt: now, snapshot }));
    assert.equal(cache.load('guest'), null);
    assert.equal(port.restoreCheckpoint({ ...checkpoint, snapshot }), null);
  }
  assert.equal(port.getSnapshot().demoEconomy.coins, 70);
});
