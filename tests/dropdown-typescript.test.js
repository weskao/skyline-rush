import { test } from 'node:test';
import assert from 'node:assert/strict';

test('typed dropdown module is importable without a browser document', async () => {
  const { trackDropdown, dismissOutside } = await import('../src/dropdown.ts');
  const inside = {}, outside = {};
  let closeCount = 0;
  const region = { contains: target => target === inside };
  trackDropdown(region, true, () => { closeCount++; });
  dismissOutside(inside);
  assert.equal(closeCount, 0);
  dismissOutside(outside);
  assert.equal(closeCount, 1);
  trackDropdown(region, false, () => { closeCount++; });
  dismissOutside(outside);
  assert.equal(closeCount, 1);
});
