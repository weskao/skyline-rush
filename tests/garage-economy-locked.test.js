import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as locked from '../src/garage-skin-runtime-locked.ts';

test('coming-soon build exposes a safe Economy snapshot and never reveals account state', () => {
  assert.equal(typeof locked.garageEconomySnapshot, 'function');
  const view = locked.garageEconomySnapshot();
  assert.equal(view.version, 1);
  assert.equal(view.accountId, null);
  assert.equal(view.phase, 'unavailable');
  assert.equal(view.entitlements, 'unverified');
  assert.deepEqual(view.owned, []);
  assert.equal(view.balance, null);
  assert.equal(view.canBuy, false);
  assert.equal(view.canClaim, false);
  locked.setGarageSkinAccount('driver_B');
  assert.equal(locked.garageEconomySnapshot().accountId, null);
});
