import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GARAGE_SKINS, findSkin } from '../src/garage-skin-catalog.ts';
import { DEMO_REDEMPTION_COSTS } from '../src/wave3-demo-settlement.ts';
import { createWave3LocalDemo } from '../src/wave3-local-demo.ts';
import {
  WAVE3_DEMO_ITEMS, WAVE3_DEMO_STORE_ART, findDemoItem, demoItemStatus,
  demoRedemptionState, canEquipDemoPreview,
} from '../src/wave3-demo-catalog.ts';

const race = (accountId) => ({
  schemaVersion: 1, completionId: 'race-00000001', trackId: 'coast',
  mode: 'classic', occurredAt: 1700000000000, eligible: true, accountId,
});

test('demo items use existing real nondefault skin IDs, unique and never grant ownership', () => {
  assert.deepEqual(
    WAVE3_DEMO_ITEMS.map(item => item.id),
    GARAGE_SKINS.filter(skin => !skin.default).map(skin => skin.id),
  );
  assert.equal(new Set(WAVE3_DEMO_ITEMS.map(item => item.id)).size, WAVE3_DEMO_ITEMS.length);
  for (const item of WAVE3_DEMO_ITEMS) {
    assert.equal(findSkin(item.id)?.category, item.category);
    assert.deepEqual(item.name, findSkin(item.id)?.name);
    assert.ok(!Object.hasOwn(item, 'owned'));
    assert.ok(!Object.hasOwn(item, 'canBuy'));
    assert.equal(item.demoPrice, DEMO_REDEMPTION_COSTS[item.id] ?? null);
  }
  assert.equal(findDemoItem('thruster-basic'), null, 'default equipment is not a store SKU');
  assert.equal(findDemoItem('__proto__'), null);
  assert.equal(findDemoItem('deleted-id'), null);
});

test('only pinned F01 demo redemption SKUs have a local demo price', () => {
  assert.equal(findDemoItem('thruster-ion')?.demoPrice, 25);
  assert.equal(findDemoItem('thruster-plasma')?.demoPrice, 100);
  assert.equal(findDemoItem('airflow-vortex')?.demoPrice, null);
  assert.equal(WAVE3_DEMO_ITEMS.filter(item => item.demoPrice !== null).length, Object.keys(DEMO_REDEMPTION_COSTS).length);
});

test('existing six store illustrations are for presentation, never purchasable SKUs', () => {
  assert.deepEqual(WAVE3_DEMO_STORE_ART, [
    'store-cart', 'store-box', 'store-bundle', 'store-tag', 'store-star', 'store-collection',
  ]);
  assert.ok(WAVE3_DEMO_STORE_ART.every(id => findDemoItem(id) === null));
});

test('guest sees distinct locked, preview-only, trial and demo-unlocked states', () => {
  const port = createWave3LocalDemo();
  const initial = port.getSnapshot();
  assert.equal(demoItemStatus('thruster-ion', initial), 'locked');
  assert.equal(demoItemStatus('airflow-vortex', initial), 'preview-only');
  assert.equal(demoItemStatus('airflow-vortex', initial, { state: 'trial', canEquip: true, expiresAt: 2_000 }, 1_000), 'trial');
  assert.equal(demoItemStatus('not-a-skin', initial), 'locked');
  port.settleCompletion(race('guest'));
  assert.equal(port.redeemPreview('thruster-ion').status, 'completed');
  assert.equal(demoItemStatus('thruster-ion', port.getSnapshot()), 'demo-unlocked');
});

test('expired/disabled trial cannot be equipped or shown as active', () => {
  const snapshot = createWave3LocalDemo().getSnapshot();
  assert.equal(demoItemStatus('airflow-vortex', snapshot, { state: 'trial', canEquip: true, expiresAt: 2_000 }, 2_000), 'preview-only');
  assert.equal(demoItemStatus('thruster-ion', snapshot, { state: 'trial', canEquip: false }, 1_000), 'locked');
  assert.equal(demoItemStatus('airflow-vortex', snapshot, { state: 'locked', canEquip: false }, 1_000), 'preview-only');
  assert.equal(canEquipDemoPreview('airflow-vortex', snapshot), false, 'temporary trial is not a demo entitlement');
});

test('insufficient balance, unsupported and duplicate redemption leave the port unchanged', () => {
  const port = createWave3LocalDemo();
  const before = port.getSnapshot();
  assert.equal(demoRedemptionState('thruster-ion', before), 'insufficient-demo-points');
  assert.equal(demoRedemptionState('thruster-plasma', before), 'insufficient-demo-points');
  assert.equal(demoRedemptionState('airflow-vortex', before), 'preview-only');
  assert.equal(demoRedemptionState('__proto__', before), 'invalid');
  assert.equal(port.redeemPreview('thruster-ion').status, 'insufficient-demo-points');
  assert.equal(port.getSnapshot().demoPoints, before.demoPoints);
  assert.deepEqual(port.getSnapshot().demoInventory, []);
  port.settleCompletion(race('guest'));
  assert.equal(demoRedemptionState('thruster-ion', port.getSnapshot()), 'ready');
  assert.equal(port.redeemPreview('thruster-ion').status, 'completed');
  const after = port.getSnapshot();
  assert.equal(demoRedemptionState('thruster-ion', after), 'duplicate');
  assert.equal(port.redeemPreview('thruster-ion').status, 'duplicate');
  assert.equal(port.getSnapshot().demoPoints, after.demoPoints);
  assert.deepEqual(port.getSnapshot().demoInventory, ['thruster-ion']);
});

test('equip eligibility requires actual local-demo redemption, not a forged trial or server snapshot', () => {
  const port = createWave3LocalDemo();
  assert.equal(canEquipDemoPreview('thruster-ion', port.getSnapshot()), false);
  assert.equal(port.equipPreview('thruster-ion').status, 'ineligible');
  port.settleCompletion(race('guest'));
  port.redeemPreview('thruster-ion');
  assert.equal(canEquipDemoPreview('thruster-ion', port.getSnapshot()), true);
  assert.equal(port.equipPreview('thruster-ion').status, 'completed');
  assert.equal(port.equipPreview('thruster-ion').status, 'duplicate');
  const verified = { ...port.getSnapshot(), mode: 'server', authority: 'verified', syncState: 'synced' };
  assert.equal(canEquipDemoPreview('thruster-ion', verified), false);
  assert.equal(demoRedemptionState('thruster-plasma', verified), 'unavailable');
  assert.notEqual(demoItemStatus('thruster-ion', verified), 'demo-unlocked');
});

test('account switching isolates demo inventory and never allows stale account preview', () => {
  const port = createWave3LocalDemo();
  port.settleCompletion(race('guest'));
  port.redeemPreview('thruster-ion');
  port.equipPreview('thruster-ion');
  port.setAccount('account_B');
  const fresh = port.getSnapshot();
  assert.equal(fresh.accountId, 'account_B');
  assert.equal(fresh.demoPoints, 20);
  assert.deepEqual(fresh.demoInventory, []);
  assert.equal(fresh.equippedPreview, null);
  assert.equal(canEquipDemoPreview('thruster-ion', fresh), false);
  assert.equal(demoRedemptionState('thruster-ion', fresh), 'insufficient-demo-points');
  assert.equal(port.settleCompletion(race('guest')).status, 'invalid');
  assert.equal(port.getSnapshot().demoPoints, 20);
});

test('offline guest can browse without any browser storage or network APIs', () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = () => { throw new Error('Offline: no network allowed'); };
    const port = createWave3LocalDemo();
    const items = WAVE3_DEMO_ITEMS.map(item => ({
      id: item.id, name: item.name.en, status: demoItemStatus(item.id, port.getSnapshot()),
    }));
    assert.ok(items.length >= 10);
    assert.ok(items.some(item => item.status === 'preview-only'));
    assert.ok(items.some(item => item.status === 'locked'));
    assert.equal(port.getSnapshot().mode, 'local-demo');
  } finally { globalThis.fetch = previousFetch; }
});

test('store/collection stay presentation-only and controls are accessible', () => {
  for (const file of ['src/Wave3DemoStore.vue', 'src/Wave3DemoCollection.vue']) {
    const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    assert.match(source, /<script setup lang="ts">/);
    assert.match(source, /role="status"/);
    assert.match(source, /:disabled=/);
    assert.match(source, /@click=/);
    assert.match(source, /<style scoped>/);
    assert.doesNotMatch(source, /\b(?:checkout|purchase|payment|receipt|firebase|localStorage|sessionStorage)\s*\(/i);
  }
  const store = readFileSync(new URL('../src/Wave3DemoStore.vue', import.meta.url), 'utf8');
  const collection = readFileSync(new URL('../src/Wave3DemoCollection.vue', import.meta.url), 'utf8');
  assert.match(store, /redeemPreview\(/);
  assert.match(collection, /equipPreview\(/);
  assert.match(store, /aria-live=/);
  assert.match(collection, /@keydown\.esc=/);
});
