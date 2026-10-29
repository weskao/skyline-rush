import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { bankItem, activateItem, tickItemCooldown } from '../src/active-items.ts';

const car = () => ({
  heldItem: null,
  itemCooldown: 0,
  effects: { shield: 0, magnet: 0, ghost: 0, freeze: 0 },
});

test('typed active-item service replaces the old JS implementation', () => {
  assert.equal(existsSync(new URL('../src/active-items.js', import.meta.url)), false);
  const player = car();
  assert.equal(bankItem(player, 'freeze'), true);
  assert.equal(activateItem(player, false), 'magnet');
  assert.equal(player.effects.magnet, 5);
  assert.equal(player.heldItem, null);
  assert.equal(player.itemCooldown, .7);
  tickItemCooldown(player, .1);
  assert.ok(Math.abs(player.itemCooldown - .6) < 1e-10);
});

test('typed item boundary rejects unknown pickups and preserves active cooldown', () => {
  const player = car();
  assert.equal(bankItem(player, '__proto__'), false);
  assert.equal(bankItem(player, 'unknown'), false);
  assert.equal(bankItem(player, 'shield'), true);
  assert.equal(bankItem(player, 'ghost'), false);
  assert.equal(activateItem(player), 'shield');
  assert.equal(activateItem(player), null);
  tickItemCooldown(player, Number.POSITIVE_INFINITY);
  assert.equal(player.itemCooldown, .7);
});
