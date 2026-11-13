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

const balances = snapshot => [snapshot.demoPoints, snapshot.demoEconomy.coins, snapshot.demoEconomy.diamonds];
const deltas = receipt => [receipt.deltaDemoPoints, receipt.deltaDemoCoins, receipt.deltaDemoDiamonds];
const memoryStorage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};

test('an unrefreshed daily claim after UTC midnight cannot pay and preserves weekly progress', () => {
  let time = Date.parse('2026-11-13T23:59:59Z');
  const port = createWave3LocalDemo({ now: () => time });
  port.recordGameEvent({ ...race('yesterday', { occurredAt: time }), eventId: 'daily-finish', kind: 'finish' });
  time += 1_000;
  const expired = port.claimMission('mission-race:daily');
  assert.deepEqual(deltas(expired), [0, 0, 0]);
  assert.deepEqual(balances(expired.snapshot), [20, 0, 0]);
  assert.equal(expired.snapshot.missions['mission-race:weekly'].progress, 1);
});

test('more than 1,024 telemetry events still save wallet and recent replay IDs', () => {
  const port = demo();
  const storage = memoryStorage();
  const cache = () => createWave3DemoStorage({ storage, now: () => now });
  port.settleCompletion(race('first'));
  const drift = index => ({ ...race('telemetry'), kind: 'drift', eventId: 'drift-' + index });
  for (let index = 0; index < 1025; index++) port.recordGameEvent(drift(index));
  assert.equal(cache().saveCheckpoint(port.getCheckpoint()), true);
  const reloaded = demo();
  reloaded.restoreCheckpoint(cache().loadCheckpoint('guest'));
  assert.deepEqual(balances(reloaded.getSnapshot()), [40, 70, 0]);
  assert.equal(reloaded.recordGameEvent(drift(1024)).status, 'duplicate');
  assert.deepEqual(deltas(reloaded.settleCompletion(race('first'))), [0, 0, 0]);
});

test('near 64 KiB prunes old telemetry before dropping any recent completion', () => {
  const port = demo();
  const storage = memoryStorage();
  const cache = () => createWave3DemoStorage({ storage, now: () => now });
  for (let index = 0; index < 450; index++) {
    const longId = String(index).padStart(4, '0') + 'x'.repeat(145);
    port.recordGameEvent({ ...race(longId), kind: 'combo', eventId: 'combo-' + longId });
  }
  const first = race('first');
  port.settleCompletion(first);
  assert.equal(cache().saveCheckpoint(port.getCheckpoint()), true);
  const restored = demo();
  restored.restoreCheckpoint(cache().loadCheckpoint('guest'));
  assert.equal(restored.settleCompletion(first).status, 'duplicate');
  assert.deepEqual(balances(restored.getSnapshot()), [40, 70, 0]);
});

test('an old rendered claim cannot claim a newly completed day or week, including after clock rollback', () => {
  let time = Date.parse('2026-11-15T23:59:59Z');
  const port = createWave3LocalDemo({ now: () => time });
  const sunday = time;
  const monday = sunday + 1_000;
  const finish = id => port.settleCompletion(race(id, { occurredAt: time }));
  for (let index = 0; index < 5; index++) finish('sunday-' + index);
  time = monday;
  for (let index = 0; index < 5; index++) finish('monday-' + index);
  for (const [id, stale] of [['mission-race:daily', Date.parse('2026-11-15')], ['mission-race:weekly', Date.parse('2026-11-09')]]) {
    const rejected = port.claimMission(id, stale);
    assert.equal(rejected.status, 'expired');
    assert.deepEqual(deltas(rejected), [0, 0, 0]);
  }
  assert.equal(port.claimMission('mission-race:daily', monday).deltaDemoCoins, 40);
  assert.equal(port.claimMission('mission-race:weekly', monday).deltaDemoDiamonds, 5);
  time = sunday;
  assert.deepEqual(deltas(port.claimMission('mission-race:daily')), [0, 0, 0]);
  time = monday;
  assert.equal(port.claimMission('mission-race:daily', monday).status, 'duplicate');
});

test('an expired, changed-price or previous-session redemption leaves all three balances and inventory intact', () => {
  let time = now;
  const port = createWave3LocalDemo({ now: () => time });
  const reward = () => port.settleCompletion(race('redeem', { occurredAt: time }));
  reward();
  const confirmation = { scope: port.getOperationScope?.(), expiresAt: time + 60_000, catalogVersion: 1, currency: 'points', cost: 25 };
  time += 60_000;
  assert.equal(port.redeemPreview('thruster-ion', confirmation).status, 'expired');
  time = now;
  assert.equal(port.redeemPreview('thruster-ion', { ...confirmation, cost: 30 }).status, 'expired');
  port.resetDemo();
  reward();
  assert.equal(port.redeemPreview('thruster-ion', confirmation).status, 'expired');
  assert.deepEqual(balances(port.getSnapshot()), [40, 70, 0]);
  assert.deepEqual(port.getSnapshot().demoInventory, []);
});

test('failed runtime equipment application keeps the previous equipped preview', () => {
  const tried = [];
  const port = createWave3LocalDemo({ now: () => now, applyEquipment: id => {
    tried.push(id);
    return id !== 'nitro-trail-cyan';
  } });
  for (let index = 0; index < 4; index++) port.settleCompletion(race('vfx-' + index));
  port.redeemPreview('thruster-ion');
  port.redeemPreview('nitro-trail-cyan');
  assert.equal(port.equipPreview('thruster-ion').status, 'completed');
  assert.equal(port.equipPreview('nitro-trail-cyan').status, 'unavailable');
  assert.deepEqual(tried, ['thruster-ion', 'nitro-trail-cyan']);
  assert.equal(port.getSnapshot().equippedPreview, 'thruster-ion');
});

test('14-step Coast wallet reconciliation checks every transaction and reload', async () => {
  const { createWave3BrowserExperience } = await import('../src/wave3-browser-experience.ts');
  let time = Date.parse('2026-11-15T13:00:00Z');
  const storage = memoryStorage();
  const open = () => createWave3BrowserExperience({
    now: () => time, locks: { request: async (_name, action) => action() },
    cache: createWave3DemoStorage({ storage, now: () => time }),
  });
  let port = open(), previous = [20, 0, 0], step = 0;
  const check = (expected, expectedDelta, receipt) => {
    assert.deepEqual(balances(port.getSnapshot()), expected, 'step ' + ++step);
    assert.deepEqual(balances(open().getSnapshot()), expected, 'reload step ' + step);
    if (expectedDelta) assert.deepEqual(expected.map((x, i) => x - previous[i]), expectedDelta);
    if (receipt) assert.deepEqual(deltas(receipt), expectedDelta);
    previous = expected;
  };
  const finish = (id, mode = 'classic') => port.settleCompletion(race(id, {
    mode, occurredAt: time, demoRace: { legs: [{ trackId: 'coast', distance: 5000 }],
      difficulty: 'normal', position: 1, rivalCount: mode === 'time' ? 0 : 7 },
  }));
  const fiveRaces = async week => {
    const receipts = [];
    for (let index = 0; index < 5; index++) receipts.push(await finish(week + '-' + index));
    for (const receipt of receipts) assert.deepEqual(deltas(receipt), [28, 56, 0]);
  };
  check([20, 0, 0]);
  const first = await finish('first-coast', 'time');
  check([40, 70, 0], [20, 70, 0], first);
  assert.equal(first.snapshot.missions['mission-time:daily'].progress, 1);
  assert.equal(first.snapshot.missions['mission-race:daily'].progress, 0);
  port = open();
  check([40, 70, 0], [0, 0, 0], await finish('first-coast', 'time'));
  check([60, 110, 0], [20, 40, 0], await finish('second-coast', 'time'));
  await fiveRaces('week-one');
  check([200, 390, 0], [140, 280, 0]);
  check([210, 430, 0], [10, 40, 0], await port.claimMission('mission-race:daily'));
  check([220, 430, 5], [10, 0, 5], await port.claimMission('mission-race:weekly'));
  check([195, 430, 5], [-25, 0, 0], await port.redeemPreview('thruster-ion'));
  check([195, 280, 5], [0, -150, 0], await port.redeemPreview('nitro-trail-cyan'));
  assert.equal((await port.redeemPreview('thruster-void')).status, 'insufficient-demo-diamonds');
  assert.equal((await port.redeemPreview('thruster-ion')).status, 'duplicate');
  check([195, 280, 5], [0, 0, 0]);
  for (const [date, week] of [['2026-11-18', 'week-two'], ['2026-11-23', 'week-three']]) {
    time = Date.parse(date + 'T13:00:00Z');
    await fiveRaces(week);
    assert.deepEqual(deltas(await port.claimMission('mission-race:weekly')), [10, 0, 5]);
  }
  check([495, 840, 15], [300, 560, 10]);
  check([495, 840, 0], [0, 0, -15], await port.redeemPreview('thruster-void'));
  assert.equal((await port.equipPreview('thruster-void')).status, 'completed');
  port = open();
  assert.deepEqual(port.getSnapshot().demoInventory, ['thruster-ion', 'nitro-trail-cyan', 'thruster-void']);
  assert.equal(port.getSnapshot().equippedPreview, 'thruster-void');
  assert.deepEqual(projectWave3Currency(port.getSnapshot(), 'zh-TW').map(row => row.display), ['495', '840', '0']);
  check([495, 840, 0], [0, 0, 0]);
  await port.resetDemo();
  check([20, 0, 0]);
  assert.deepEqual(port.getSnapshot().demoInventory, []);
  assert.equal(step, 14);
});

test('storage failure keeps the complete transaction in one session and across account switches', async () => {
  const { createWave3BrowserExperience } = await import('../src/wave3-browser-experience.ts');
  const store = memoryStorage();
  let failWrites = false;
  const storage = { ...store, setItem(key, value) {
    if (failWrites) throw new Error('QuotaExceededError');
    store.setItem(key, value);
  } };
  const open = () => createWave3BrowserExperience({
    now: () => now, locks: { request: async (_name, action) => action() },
    cache: createWave3DemoStorage({ storage, now: () => now }),
  });
  const port = open();
  await port.settleCompletion(race('initial'));
  failWrites = true;
  const paid = await port.redeemPreview('thruster-ion');
  assert.equal(paid.status, 'completed');
  assert.equal(paid.snapshot.persistence, 'memory-only');
  assert.deepEqual(balances(paid.snapshot), [15, 70, 0]);
  assert.deepEqual(paid.snapshot.demoInventory, ['thruster-ion']);
  port.setAccount('other');
  assert.deepEqual(balances(port.getSnapshot()), [20, 0, 0]);
  port.setAccount(null);
  assert.deepEqual(balances(port.getSnapshot()), [15, 70, 0]);
  assert.deepEqual(balances(open().getSnapshot()), [40, 70, 0]);
  assert.deepEqual(open().getSnapshot().demoInventory, []);
});

test('a browser without Web Locks can play offline without overwriting another tab’s save', async () => {
  const { createWave3BrowserExperience } = await import('../src/wave3-browser-experience.ts');
  const storage = memoryStorage();
  const cache = () => createWave3DemoStorage({ storage, now: () => now });
  const port = createWave3BrowserExperience({ now: () => now, locks: null, cache: cache() });
  const paid = await port.settleCompletion(race('fallback'));
  assert.deepEqual(balances(paid.snapshot), [40, 70, 0]);
  assert.equal(paid.snapshot.persistence, 'memory-only');
  assert.equal(cache().load('guest'), null);
});

test('simultaneous tabs debit once and cannot overwrite the other tab with a stale snapshot', async () => {
  const { createWave3BrowserExperience } = await import('../src/wave3-browser-experience.ts');
  const storage = memoryStorage();
  let queued = Promise.resolve();
  const locks = { request: (_name, action) => {
    const operation = queued.then(() => action());
    queued = operation.then(() => {});
    return operation;
  } };
  const open = () => createWave3BrowserExperience({
    now: () => now, locks, cache: createWave3DemoStorage({ storage, now: () => now }),
  });
  const first = open(), second = open();
  await first.settleCompletion(race('shared-race'));
  const receipts = await Promise.all([first.redeemPreview('thruster-ion'), second.redeemPreview('thruster-ion')]);
  assert.deepEqual(receipts.map(value => value.status), ['completed', 'duplicate']);
  assert.deepEqual(receipts.map(deltas), [[-25, 0, 0], [0, 0, 0]]);
  assert.deepEqual(balances(open().getSnapshot()), [15, 70, 0]);
  assert.deepEqual(open().getSnapshot().demoInventory, ['thruster-ion']);
  assert.equal((await second.settleCompletion(race('shared-race'))).status, 'duplicate');
  await first.resetDemo();
  const oldScope = second.getOperationScope();
  assert.equal((await second.settleCompletion(race('racing-before-reset', { scope: oldScope }))).status, 'expired');
  assert.deepEqual(balances(second.getSnapshot()), [20, 0, 0]);
});

test('outdated or malformed confirmation deadlines cannot debit the wallet', () => {
  const port = demo();
  port.settleCompletion(race('quote'));
  const quote = { scope: port.getOperationScope(), expiresAt: Infinity, catalogVersion: 1, currency: 'points', cost: 25 };
  assert.equal(port.redeemPreview('thruster-ion', quote).status, 'expired');
  assert.deepEqual(balances(port.getSnapshot()), [40, 70, 0]);
});
