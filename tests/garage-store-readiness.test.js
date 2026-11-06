import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storeReadiness, storeReadinessText } from '../src/garage-store-readiness.ts';

test('Wave 3 storefront fails closed without provider, account or paid entitlement', () => {
  const state = storeReadiness();
  assert.deepEqual(state, { phase: 'coming-soon', canPreview: true, canBuy: false, canClaim: false, price: null, balance: null });
  assert.equal(Object.isFrozen(state), true);
});

test('store label is truthful in both supported languages and never includes a Buy CTA', () => {
  assert.equal(storeReadinessText('en'), 'Shop · Coming soon — preview only');
  assert.equal(storeReadinessText('zh-TW'), '商店 · 即將推出 — 僅供預覽');
  assert.doesNotMatch(storeReadinessText('en'), /buy|purchase|pay now/i);
});
