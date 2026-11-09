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
test('blocked edge columns fall back to a free gap beside an edge widget, still off the road', () => {
  // 568x320 short landscape after an impact: position/speed stats fill the left edge, flight telemetry and touch buttons the right.
  const obstacles = [rect(12, 27, 177, 56), rect(24, 70, 110, 167), rect(23, 176, 123, 208), rect(20, 176, 234, 320),
    rect(221, 19, 556, 63), rect(412, 64, 552, 94), rect(349, 101, 545, 172), rect(432, 190, 544, 302)];
  const slot = pickPeripheralSlot({ width: 568, height: 320 }, { width: 60, height: 30 }, obstacles, { preferred: 'right', targetY: 156 });
  assert.ok(slot);
  const chip = box(slot, 60, 30);
  assert.equal(intersects(chip, rect(184.6, 64, 383.4, 230.4)), false, 'road');
  for (const block of obstacles) assert.equal(intersects(chip, block), false, JSON.stringify(block));
});
test('a portrait collision chip with every edge column taken docks in the sky band above the road (opt-in)', () => {
  // 390x844 competitive, en: POSITION + three-row leaderboard on top, gauges, thumb pad, mode chip and buttons below the road.
  const obstacles = [rect(12, 26, 42, 56), rect(75, 19, 378, 63), rect(234, 70, 374, 100), rect(23, 102, 114, 212), rect(23, 70, 224, 95),
    rect(262, 102, 367, 144), rect(317, 270, 376, 342), rect(23, 546, 147, 664), rect(228, 628, 378, 658), rect(170, 508, 367, 624),
    rect(20, 464, 145, 844), rect(232, 686, 366, 820)];
  const size = { width: 121, height: 25 }, road = rect(126.75, 168.8, 263.25, 607.68);
  assert.equal(pickPeripheralSlot({ width: 390, height: 844 }, size, obstacles), null, 'still no central fallback by default');
  const slot = pickPeripheralSlot({ width: 390, height: 844 }, size, obstacles, { sky: true });
  assert.ok(slot);
  const chip = box(slot, size.width, size.height);
  assert.ok(chip.bottom <= road.top, 'above the road');
  for (const block of obstacles) assert.equal(intersects(chip, block), false, JSON.stringify(block));
});
