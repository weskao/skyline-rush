import test from 'node:test';
import assert from 'node:assert/strict';
import { projectWave3Currency } from '../src/wave3-currency-view.ts';

const local = (demoPoints = 1234, accountId = 'guest') => ({
  mode: 'local-demo', authority: 'local', syncState: 'local-only', demoPoints, accountId,
});

test('shows only genuine local F01 demo points, with localized readable quantities', () => {
  const en = projectWave3Currency(local(), 'en');
  const zh = projectWave3Currency(local(1234, 'driver_B'), 'zh-TW');
  assert.equal(en[0].amount, 1234);
  assert.equal(en[0].display, '1,234');
  assert.equal(zh[0].display, '1,234');
  assert.equal(zh[0].label, '試玩點數');
  assert.equal(zh[0].state, 'local-demo');
  assert.deepEqual(en.map(x => x.id), ['demo-points', 'coins', 'diamonds']);
  assert.deepEqual(en.slice(1).map(x => x.amount), [null, null]);
  assert.deepEqual(en.slice(1).map(x => x.display), ['0', '0']);
  assert.ok(en.slice(1).every(x => x.state === 'unavailable'));
});

test('missing balances use zero without creating paid credits', () => {
  for (const snapshot of [null, undefined, { ...local(), demoPoints: undefined }, local(0)]) {
    const rows = projectWave3Currency(snapshot);
    assert.deepEqual(rows.map(row => row.display), ['0', '0', '0']);
    assert.deepEqual(rows.slice(1).map(row => row.amount), [null, null]);
  }
});

test('invalid demo data keeps the error placeholder local to that balance', () => {
  for (const invalid of [{},
    { ...local(999999), authority: 'verified' },
    { ...local(999999), syncState: 'unavailable' },
    { ...local(999999), mode: 'server' },
    local(-1), local(NaN), local(3.5), local(Number.MAX_SAFE_INTEGER + 1)]) {
    const rows = projectWave3Currency(invalid);
    assert.deepEqual(rows.map(row => row.amount), [null, null, null]);
    assert.deepEqual(rows.map(row => row.display), ['—', '0', '0']);
    assert.equal(rows[0].state, 'unavailable');
  }
});

test('switching accounts only projects the new snapshot, not cached previous credits', () => {
  const a = projectWave3Currency(local(80, 'driver_A'));
  const b = projectWave3Currency(local(20, 'driver_B'));
  assert.equal(a[0].display, '80');
  assert.equal(b[0].display, '20');
  assert.equal(projectWave3Currency(null)[0].amount, null);
});
