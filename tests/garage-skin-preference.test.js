import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGarageSkinSession } from '../src/garage-skin-session.ts';
import {
  SKIN_PICK_STORAGE_KEY, readSkinPicks, rememberSkinPick, restoreSkinPicks,
} from '../src/garage-skin-preference.ts';

const clock = () => 1_000;
const trialOn = { enabled: true, expiresAt: Number.MAX_SAFE_INTEGER };
const keyFor = accountId => `${SKIN_PICK_STORAGE_KEY}:${accountId}`;

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    data,
  };
}

// A fresh session object over the same storage is what a page reload produces.
function reloadedSession(storage, accountId, { trial = trialOn, profile } = {}) {
  const session = createGarageSkinSession(accountId, clock, profile);
  session.setTrial(trial);
  restoreSkinPicks(storage, accountId, id => session.equip(id));
  return session;
}

test('a trial pick survives reload while the trial is active, without granting ownership', () => {
  const storage = memoryStorage();
  const first = reloadedSession(storage, 'driver_A');
  assert.equal(first.equip('thruster-ion'), true);
  rememberSkinPick(storage, 'driver_A', 'thruster-ion');
  const second = reloadedSession(storage, 'driver_A');
  assert.equal(second.active('thruster'), 'thruster-ion');
  assert.equal(second.view('thruster-ion')?.owned, false);
  assert.deepEqual(second.cloudPayload().owned, []);
});

test('stored record holds only the preference shape, never entitlement fields', () => {
  const storage = memoryStorage();
  rememberSkinPick(storage, 'driver_A', 'thruster-ion');
  rememberSkinPick(storage, 'driver_A', 'nitro-trail-cyan');
  const record = JSON.parse(storage.data.get(keyFor('driver_A')));
  assert.deepEqual(record, { version: 1, accountId: 'driver_A', picks: { thruster: 'thruster-ion', 'nitro-trail': 'nitro-trail-cyan' } });
});

test('forged owned/trial/expiry fields in storage are ignored and the skin stays locked', () => {
  const forged = JSON.stringify({
    version: 1, accountId: 'driver_A', owned: ['thruster-ion'], trialEnabled: true,
    trialExpiresAt: Number.MAX_SAFE_INTEGER, picks: { thruster: 'thruster-ion' },
  });
  const storage = memoryStorage({ [keyFor('driver_A')]: forged });
  const session = reloadedSession(storage, 'driver_A', { trial: { enabled: false, expiresAt: 0 } });
  assert.equal(session.active('thruster'), 'thruster-basic');
  assert.equal(session.view('thruster-ion')?.state, 'locked');
  assert.deepEqual(session.cloudPayload().owned, []);
});

const badRecords = {
  'other-account record': JSON.stringify({ version: 1, accountId: 'driver_B', picks: { thruster: 'thruster-ion' } }),
  'wrong version': JSON.stringify({ version: 2, accountId: 'driver_A', picks: { thruster: 'thruster-ion' } }),
  'unknown id': JSON.stringify({ version: 1, accountId: 'driver_A', picks: { thruster: 'thruster-gold' } }),
  'wrong-category id': JSON.stringify({ version: 1, accountId: 'driver_A', picks: { thruster: 'airflow-vortex' } }),
  'prototype key': '{"version":1,"accountId":"driver_A","picks":{"__proto__":"thruster-ion"}}',
  'oversized JSON': JSON.stringify({ version: 1, accountId: 'driver_A', picks: { thruster: 'thruster-ion' }, pad: 'x'.repeat(4_096) }),
  'malformed JSON': '{"version":1,',
  'non-object picks': JSON.stringify({ version: 1, accountId: 'driver_A', picks: ['thruster-ion'] }),
};
for (const [name, raw] of Object.entries(badRecords)) {
  test(`${name} discards the whole record without crashing`, () => {
    const storage = memoryStorage({ [keyFor('driver_A')]: raw });
    assert.deepEqual(readSkinPicks(storage, 'driver_A'), {});
    const session = reloadedSession(storage, 'driver_A');
    for (const category of ['thruster', 'airflow', 'nitro-trail', 'launch-flare']) {
      assert.equal(session.active(category), session.defaults[category]);
    }
  });
}

test('one bad slot discards the whole record (no partial repair)', () => {
  const raw = JSON.stringify({ version: 1, accountId: 'driver_A', picks: { thruster: 'thruster-ion', airflow: 'thruster-void' } });
  assert.deepEqual(readSkinPicks(memoryStorage({ [keyFor('driver_A')]: raw }), 'driver_A'), {});
});

test('throwing or missing storage is ignored on read and write', () => {
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.deepEqual(readSkinPicks(throwing, 'driver_A'), {});
  assert.doesNotThrow(() => rememberSkinPick(throwing, 'driver_A', 'thruster-ion'));
  assert.deepEqual(readSkinPicks(null, 'driver_A'), {});
  assert.doesNotThrow(() => rememberSkinPick(null, 'driver_A', 'thruster-ion'));
  const session = reloadedSession(throwing, 'driver_A');
  assert.equal(session.active('thruster'), 'thruster-basic');
});

test('trial disabled: a stored pick for an unowned skin stays inert and is not deleted', () => {
  const storage = memoryStorage();
  rememberSkinPick(storage, 'driver_A', 'thruster-ion');
  const session = reloadedSession(storage, 'driver_A', { trial: { enabled: false, expiresAt: 0 } });
  assert.equal(session.active('thruster'), 'thruster-basic');
  assert.deepEqual(readSkinPicks(storage, 'driver_A'), { thruster: 'thruster-ion' });
});

test('picks stay per account: switching never revives another account, switching back restores', () => {
  const storage = memoryStorage();
  rememberSkinPick(storage, 'guest', 'launch-flare-blue');
  rememberSkinPick(storage, 'driver_A', 'thruster-ion');
  const session = reloadedSession(storage, 'guest');
  assert.equal(session.active('launch-flare'), 'launch-flare-blue');
  session.setAccount('driver_A');
  session.setTrial(trialOn);
  restoreSkinPicks(storage, 'driver_A', id => session.equip(id));
  assert.equal(session.active('launch-flare'), 'launch-flare-basic');
  assert.equal(session.active('thruster'), 'thruster-ion');
  session.setAccount('guest');
  session.setTrial(trialOn);
  restoreSkinPicks(storage, 'guest', id => session.equip(id));
  assert.equal(session.active('thruster'), 'thruster-basic');
  assert.equal(session.active('launch-flare'), 'launch-flare-blue');
});

test('an expired trial never revives a stored pick on reload', () => {
  const storage = memoryStorage();
  rememberSkinPick(storage, 'driver_A', 'airflow-vortex');
  const session = reloadedSession(storage, 'driver_A', { trial: { enabled: true, expiresAt: 500 } });
  assert.equal(session.active('airflow'), 'airflow-basic');
  assert.equal(session.view('airflow-vortex')?.state, 'locked');
});

test('owned profile with trial OFF: a stored pick for that owned skin applies (future purchase path)', () => {
  const storage = memoryStorage();
  rememberSkinPick(storage, 'driver_A', 'thruster-ion');
  rememberSkinPick(storage, 'driver_A', 'airflow-vortex');
  const session = createGarageSkinSession('driver_A', clock);
  session.setAccount('driver_A', { version: 1, accountId: 'driver_A', owned: ['thruster-ion'], equipped: {} });
  restoreSkinPicks(storage, 'driver_A', id => session.equip(id));
  assert.equal(session.active('thruster'), 'thruster-ion');
  assert.equal(session.active('airflow'), 'airflow-basic', 'unowned pick stays inert without a trial');
});

test('remembering an invalid id or account writes nothing', () => {
  const storage = memoryStorage();
  rememberSkinPick(storage, 'driver_A', 'not-a-skin');
  rememberSkinPick(storage, 'bad account!', 'thruster-ion');
  assert.equal(storage.data.size, 0);
});

// Runtime wiring: a fresh module instance over the same localStorage is a real page reload.
test('trial runtime restores the remembered pick on reload and per account', async () => {
  const storage = memoryStorage();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  try {
    const first = await import('../src/garage-skin-runtime.ts?reload=1');
    assert.equal(first.equipGarageSkin('thruster-ion'), true);
    first.setGarageSkinAccount('runtime_pick_A');
    assert.equal(first.currentGarageSkins().thruster, 'thruster-basic', 'guest pick must not leak to another account');
    assert.equal(first.equipGarageSkin('airflow-prism'), true);
    const second = await import('../src/garage-skin-runtime.ts?reload=2');
    assert.equal(second.currentGarageSkins().thruster, 'thruster-ion');
    assert.equal(second.garageSkinEntry('thruster-ion')?.owned, false);
    second.setGarageSkinAccount('runtime_pick_A');
    assert.equal(second.currentGarageSkins().airflow, 'airflow-prism');
    assert.equal(second.currentGarageSkins().thruster, 'thruster-basic');
    assert.ok([...storage.data.values()].every(raw => !/owned|trial|expires/i.test(raw)));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('the locked runtime and shared Garage entrypoints never reference the pick store', async () => {
  const { readFileSync } = await import('node:fs');
  for (const file of ['garage-skin-runtime-locked.ts', 'garage-skin-session.ts', 'garage-skin-catalog.ts', 'garage-ui.ts', 'GaragePanel.vue']) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /garage-skin-preference|skyline-rush-garage-skin-picks/, file);
  }
  const runtime = readFileSync(new URL('../src/garage-skin-runtime.ts', import.meta.url), 'utf8');
  assert.match(runtime, /from '\.\/garage-skin-preference\.ts'/);
});
