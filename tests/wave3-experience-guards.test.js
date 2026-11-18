import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWave3BrowserExperience } from '../src/wave3-browser-experience.ts';
import { createWave3LocalDemo } from '../src/wave3-local-demo.ts';
import { createWave3DemoStorage, encodeWave3DemoCheckpoint, WAVE3_DEMO_STORAGE_PREFIX } from '../src/wave3-demo-storage.ts';
import { createWave3RaceEventBridge } from '../src/wave3-race-events.ts';
import { DEMO_RETENTION_MS } from '../src/wave3-experience-contract.ts';

const start = 1_800_000_000_000;
const balances = snapshot => [snapshot.demoPoints, snapshot.demoEconomy.coins, snapshot.demoEconomy.diamonds];
const FRESH = [20, 0, 0];
const completion = (id, accountId = 'driver') => ({
  schemaVersion: 1, completionId: `race-${id}`, trackId: 'coast', accountId,
  mode: 'classic', occurredAt: start, eligible: true,
});
const memoryStorage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};
/** Firestore stand-in: `gate` holds the transaction like a slow network round trip. */
const fakeCloud = (document = null) => {
  const cloud = { document, gate: null, release() {} };
  cloud.hold = () => { cloud.gate = new Promise(resolve => { cloud.release = resolve; }); };
  cloud.transact = async (_uid, update) => {
    await cloud.gate;
    const { result, write } = update(cloud.document);
    if (write !== undefined) cloud.document = write;
    return result;
  };
  return cloud;
};
const openCloud = (cloud, now = () => start) =>
  createWave3BrowserExperience({ now, locks: null, firestore: cloud.transact });
/** A saved trial document for `driver`, credited by one race. */
const savedDocument = (savedAt, reset = false) => {
  const local = createWave3LocalDemo({ now: () => savedAt });
  local.setAccount('driver');
  if (reset) local.resetDemo();
  local.settleCompletion(completion('seed'));
  return encodeWave3DemoCheckpoint(local.getCheckpoint(), savedAt);
};
const racingThrough = (bridge, race) => {
  bridge.capture(race);
  race.phase = 'racing';
  bridge.capture(race);
  race.phase = 'finished';
  race.result = { success: true, time: 51, position: 1 };
  return bridge.finish(race, false);
};
const aRace = () => ({ phase: 'countdown', trackId: 'coast', mode: 'classic', length: 2000,
  elapsed: 0, result: null, player: { driftPayout: null, longestCombo: 0 } });

test('a Firestore settlement in flight when cloud data is deleted cannot recreate the trial save', async () => {
  const cloud = fakeCloud();
  const trial = openCloud(cloud);
  trial.setAccount('driver');
  assert.equal((await trial.settleCompletion(completion('before'))).status, 'completed');
  cloud.hold();
  const inFlight = trial.settleCompletion(completion('in-flight'));
  await new Promise(resolve => setImmediate(resolve)); // the transaction is now running
  trial.forgetAccount('driver');
  cloud.document = null; // the deletion commits while the settlement waits
  cloud.release();
  assert.equal((await inFlight).status, 'expired');
  assert.equal(cloud.document, null);
  cloud.gate = null;
  assert.equal((await trial.settleCompletion(completion('after'))).status, 'expired');
  await assert.rejects(trial.resetDemo());
  assert.equal(cloud.document, null, 'neither a later settlement nor a reset writes the deleted account');
  assert.deepEqual(balances(trial.getSnapshot()), FRESH);
});

test('a deleted account stops crediting the in-memory trial wallet too', async () => {
  const trial = createWave3BrowserExperience({ now: () => start, locks: null,
    cache: createWave3DemoStorage({ storage: memoryStorage(), now: () => start }) });
  trial.setAccount('driver');
  assert.equal((await trial.settleCompletion(completion('before'))).status, 'completed');
  trial.forgetAccount('driver');
  assert.deepEqual(balances(trial.getSnapshot()), FRESH);
  assert.equal((await trial.settleCompletion(completion('after'))).status, 'expired');
  assert.deepEqual(balances(trial.getSnapshot()), FRESH);
});

test('race start waits for the signed-in wallet restore, then credits the restored wallet', async () => {
  const cloud = fakeCloud(savedDocument(start, true));
  const trial = openCloud(cloud);
  const bridge = createWave3RaceEventBridge(trial, () => 'race-restore-0001', () => start);
  let finished = null;
  const race = aRace();
  const begin = () => { finished = racingThrough(bridge, race); };
  assert.equal(bridge.deferStart(begin), false, 'nothing to wait for before sign-in');
  cloud.hold();
  trial.setAccount('driver');
  assert.equal(bridge.deferStart(begin), true);
  assert.equal(bridge.deferStart(begin), true, 'a second tap does not queue a second start');
  assert.equal(finished, null);
  cloud.release();
  await trial.ready();
  const receipt = await finished;
  assert.equal(receipt.status, 'completed');
  assert.ok(receipt.deltaDemoCoins > 0);
  assert.deepEqual(balances(receipt.snapshot), [40 + receipt.deltaDemoPoints, 70 + receipt.deltaDemoCoins, 0]);
  assert.deepEqual(balances(JSON.parse(cloud.document).snapshot), balances(receipt.snapshot));
});

test('race start applies the 7-day retention expiry before the race scope is captured', async () => {
  let time = start;
  const cloud = fakeCloud(savedDocument(start));
  const trial = openCloud(cloud, () => time);
  trial.setAccount('driver');
  await trial.ready();
  assert.deepEqual(balances(trial.getSnapshot()), [40, 70, 0]);
  time += DEMO_RETENTION_MS + 60_000;
  const bridge = createWave3RaceEventBridge(trial, () => 'race-retention-01', () => time);
  let finished = null;
  assert.equal(bridge.deferStart(() => { finished = racingThrough(bridge, aRace()); }), true);
  await trial.ready();
  const receipt = await finished;
  assert.equal(receipt.status, 'completed', 'the expired wallet must not void the next race');
  assert.deepEqual(balances(receipt.snapshot), [20 + receipt.deltaDemoPoints, receipt.deltaDemoCoins, 0]);
  assert.equal(JSON.parse(cloud.document).savedAt, time);
});

test('Reset trial overwrites a corrupted Firestore save', async () => {
  const cloud = fakeCloud('{"version":1,"broken"');
  const trial = openCloud(cloud);
  trial.setAccount('driver');
  await new Promise(resolve => setImmediate(resolve)); // the failed load settles
  const snapshot = await trial.resetDemo();
  assert.deepEqual(balances(snapshot), FRESH);
  const saved = JSON.parse(cloud.document);
  assert.deepEqual(balances(saved.snapshot), FRESH);
  assert.notEqual(saved.checkpoint.generation, 'legacy');
  assert.equal(saved.checkpoint.generation, trial.getOperationScope().generation);
});

test('Reset trial overwrites a guest save corrupted or future-dated on disk', async () => {
  const key = WAVE3_DEMO_STORAGE_PREFIX + 'guest';
  const locks = { request: async (_name, action) => action() };
  for (const [label, damage, beforeOpen] of [
    ['corrupted after load', () => '{"broken"', false],
    ['corrupted before load', () => 'not json', true],
    ['future-dated', storage => storage.getItem(key).replace(`"savedAt":${start}`, `"savedAt":${start + 86_400_000}`), true],
  ]) {
    const storage = memoryStorage();
    const open = () => createWave3BrowserExperience({ now: () => start, locks,
      cache: createWave3DemoStorage({ storage, now: () => start }) });
    await open().settleCompletion(completion('seed', 'guest'));
    if (beforeOpen) storage.setItem(key, damage(storage));
    const trial = open();
    if (!beforeOpen) storage.setItem(key, damage(storage));
    const snapshot = await trial.resetDemo();
    assert.deepEqual(balances(snapshot), FRESH, label);
    const saved = JSON.parse(storage.getItem(key));
    assert.equal(saved.savedAt, start, label);
    assert.equal(saved.checkpoint.generation, trial.getOperationScope().generation, label);
    assert.deepEqual(balances(open().getSnapshot()), FRESH, `${label}: reload`);
  }
});

test('every race start waits for the trial wallet and cloud deletion invalidates trial writes first', async () => {
  const { readFile } = await import('node:fs/promises');
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const body = name => main.slice(main.indexOf(name), main.indexOf('startRace(race', main.indexOf(name)));
  for (const site of ['function start()', 'function restart(', 'resume: function resume(']) {
    assert.match(body(site), /deferWave3RaceStart\(/, `${site} defers until the wallet restore finishes`);
  }
  assert.match(main, /deleteCloudProgress: uid => \{ forgetWave3DemoAccount\(uid\); return deleteCloudProgress\(uid\); \}/);
});
