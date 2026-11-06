import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as economy from '../src/garage-economy-state.ts';

const safe = (state, accountId, phase) => {
  assert.equal(state.version, 1);
  assert.equal(state.accountId, accountId);
  assert.equal(state.phase, phase);
  assert.equal(state.entitlements, 'unverified');
  assert.deepEqual(state.owned, []);
  assert.equal(state.balance, null);
  assert.equal(state.price, null);
  assert.equal(state.award, null);
  assert.equal(state.canBuy, false);
  assert.equal(state.canClaim, false);
};

test('Economy starts unavailable and never exposes client-forged owned items, prices, or rewards', () => {
  assert.equal(typeof economy.createGarageEconomyState, 'function');
  const state = economy.createGarageEconomyState();
  safe(state.snapshot(), null, 'unavailable');
  safe(state.setAccount('driver_A'), 'driver_A', 'unavailable');
  safe(state.beginLoad('driver_A'), 'driver_A', 'loading');
  safe(state.resolve('driver_A', {
    version: 1, accountId: 'driver_A', owned: ['thruster-ion'],
    balance: 9_999_999, price: 1, award: 999, canBuy: true, canClaim: true,
  }), 'driver_A', 'ready');
});

test('account changes and late old-account responses never leak Economy data', () => {
  const state = economy.createGarageEconomyState();
  state.setAccount('driver_A');
  state.beginLoad('driver_A');
  safe(state.setAccount('driver_B'), 'driver_B', 'unavailable');
  safe(state.resolve('driver_A', { version: 1, accountId: 'driver_A' }), 'driver_B', 'unavailable');
  safe(state.beginLoad('driver_B'), 'driver_B', 'loading');
  safe(state.resolve('driver_B', { version: 1, accountId: 'driver_A' }), 'driver_B', 'error');
});

test('future versions fail closed; errors and retries never invent a wallet or ownership', () => {
  const state = economy.createGarageEconomyState();
  state.setAccount('driver_A');
  state.beginLoad('driver_A');
  safe(state.resolve('driver_A', { version: 2, accountId: 'driver_A' }), 'driver_A', 'unsupported');
  safe(state.beginLoad('driver_A'), 'driver_A', 'loading');
  safe(state.fail('driver_A'), 'driver_A', 'error');
  safe(state.beginLoad('driver_A'), 'driver_A', 'loading');
  safe(state.resolve('driver_A', { version: 1, accountId: 'driver_A' }), 'driver_A', 'ready');
  safe(state.setAccount(''), null, 'unavailable');
});

test('a page account change updates the shared Garage Economy snapshot without grants', async () => {
  const { garageEconomySnapshot, setGarageSkinAccount } =
    await import('../src/garage-skin-runtime.ts?economy-contract=1');
  setGarageSkinAccount('driver_A');
  safe(garageEconomySnapshot(), 'driver_A', 'unavailable');
  setGarageSkinAccount('driver_B');
  safe(garageEconomySnapshot(), 'driver_B', 'unavailable');
  setGarageSkinAccount(null);
  safe(garageEconomySnapshot(), 'guest', 'unavailable');
});
