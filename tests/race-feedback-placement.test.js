import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickPeripheralSlot } from '../src/race-feedback-placement.ts';

const rect = (left, top, right, bottom) => ({ left, top, right, bottom });
const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const box = (slot, width, height) => ({ left: slot.left, right: slot.left + width, top: slot.top, bottom: slot.top + height });

test('a phone portrait reward cannot obscure the forward road', () => {
  const slot = pickPeripheralSlot({ width: 390, height: 844 }, { width: 112, height: 28 }, [rect(0, 0, 390, 110)]);
  assert.ok(slot);
  assert.equal(intersects(box(slot, 112, 28), rect(126.75, 168.8, 263.25, 607.68)), false);
});
test('occupied left HUD sends reward to the right edge', () => {
  const slot = pickPeripheralSlot({ width: 844, height: 390 }, { width: 150, height: 26 }, [rect(0, 0, 220, 390)]);
  assert.ok(slot);
  assert.ok(slot.left > 600);
});
test('simulated fold hinge and steering controls stay clear', () => {
  const hinge = rect(410, 0, 434, 390), control = rect(0, 330, 170, 390);
  const slot = pickPeripheralSlot({ width: 844, height: 390 }, { width: 150, height: 26 }, [hinge, control]);
  assert.ok(slot);
  assert.equal(intersects(box(slot, 150, 26), hinge), false);
  assert.equal(intersects(box(slot, 150, 26), control), false);
});
test('a completely blocked edge returns no central fallback', () => {
  assert.equal(pickPeripheralSlot({ width: 390, height: 844 }, { width: 110, height: 26 },
    [rect(0, 0, 130, 844), rect(260, 0, 390, 844)]), null);
});
