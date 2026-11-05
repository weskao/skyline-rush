import test from 'node:test';
import assert from 'node:assert/strict';
import { createGarageSettlementGate } from '../src/garage-settlement-gate.ts';

const verified = (accountId, completionId) => ({ accountId, completionId, eligible: true, verified: true });

test('fail-closed: no verifier means no reward or authoritative completion claim', async () => {
  const gate = createGarageSettlementGate();
  assert.deepEqual(await gate.settle('driver_A', 'race:2026-11-03:01'), { status: 'unavailable', award: null });
});

test('verified completion is accepted once per account, including concurrent retries', async () => {
  let calls = 0;
  const gate = createGarageSettlementGate(async (accountId, completionId) => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 5));
    return verified(accountId, completionId);
  });
  const [first, second] = await Promise.all([
    gate.settle('driver_A', 'race:2026-11-03:01'),
    gate.settle('driver_A', 'race:2026-11-03:01'),
  ]);
  assert.deepEqual(first, { status: 'verified', award: null });
  assert.deepEqual(second, { status: 'duplicate', award: null });
  assert.equal(calls, 1);
  assert.equal((await gate.settle('driver_A', 'race:2026-11-03:01')).status, 'duplicate');
});

test('ineligible practice or unverified result never becomes an earned reward', async () => {
  const gate = createGarageSettlementGate(async (_account, completionId) => ({
    ...verified('driver_A', completionId),
    eligible: completionId.endsWith('eligible'),
  }));
  assert.equal((await gate.settle('driver_A', 'practice:2026-11-03')).status, 'ineligible');
  assert.equal((await gate.settle('driver_A', 'race:eligible')).status, 'verified');
  assert.equal((await gate.settle('driver_A', 'practice:2026-11-03')).status, 'ineligible');
});

test('cross-account verification cannot grant one user another account result', async () => {
  const gate = createGarageSettlementGate(async (_account, completionId) => verified('driver_A', completionId));
  assert.equal((await gate.settle('driver_B', 'race:2026-11-03:01')).status, 'rejected');
  assert.equal((await gate.settle('driver_A', 'race:2026-11-03:01')).status, 'verified');
  assert.equal((await gate.settle('driver_B', 'race:2026-11-03:01')).status, 'rejected');
});

test('malformed inputs, thrown or forged verifier responses fail safely', async () => {
  const gate = createGarageSettlementGate(async () => { throw new Error('offline'); });
  assert.equal((await gate.settle('__proto__!', 'race:2026-11-03:01')).status, 'rejected');
  assert.equal((await gate.settle('driver_A', '../../bad')).status, 'rejected');
  assert.equal((await gate.settle('driver_A', 'race:2026-11-03:01')).status, 'unavailable');
  const forged = createGarageSettlementGate(async () => ({ accountId: 'driver_A', completionId: 'race:2026-11-03:01', eligible: true }));
  assert.equal((await forged.settle('driver_A', 'race:2026-11-03:01')).status, 'rejected');
});
