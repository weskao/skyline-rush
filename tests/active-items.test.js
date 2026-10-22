import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bankItem, activateItem, tickItemCooldown } from '../src/active-items.js';
import { createRace, startRace, useHeldItem } from '../src/game.js';
const car = () => ({ effects:{shield:0,magnet:0,ghost:0,freeze:0}, heldItem:null, itemCooldown:0 });
test('one held item can be banked; second pickup never overwrites', () => {
  const c = car(); assert.equal(bankItem(c,'shield'),true);
  assert.equal(bankItem(c,'magnet'),false); assert.equal(c.heldItem,'shield');
});
test('a held shield activates once without stacking or spending NITRO', () => {
  const c = {...car(),nitro:2}; bankItem(c,'shield');
  assert.equal(activateItem(c,true),'shield');
  assert.equal(c.heldItem,null); assert.equal(c.effects.shield,10);
  assert.equal(activateItem(c,true),null); assert.equal(c.nitro,2);
});
test('freeze becomes solo-friendly magnet, with a bounded cooldown', () => {
  const c = car(); bankItem(c,'freeze');
  assert.equal(activateItem(c,false),'magnet'); assert.equal(c.effects.magnet,5);
  bankItem(c,'ghost'); assert.equal(activateItem(c,false),null);
  for(let i=0;i<8;i++) tickItemCooldown(c,.1);
  assert.equal(c.itemCooldown,0);
  assert.equal(activateItem(c,false),'ghost'); assert.equal(c.effects.ghost,3);
});
test('invalid items and frame times are ignored', () => {
  const c = car(); assert.equal(bankItem(c,'unknown'),false);
  assert.equal(activateItem(c,true),null);
  c.itemCooldown=1; tickItemCooldown(c,Infinity); assert.equal(c.itemCooldown,1);
});
test('only opted-in Custom/Free Drive modes have active held items; Classic stays automatic', () => {
  const classic = createRace('coast',{mode:'classic',activeItems:true});
  const custom = createRace('coast',{mode:'custom',activeItems:true});
  const free = createRace('coast',{mode:'free',activeItems:true});
  assert.equal(classic.config.activeItems,undefined);
  assert.equal(custom.config.activeItems,true);
  assert.equal(free.config.activeItems,true);
  custom.player.heldItem='shield';
  assert.equal(useHeldItem(custom),null);
  startRace(custom);
  assert.equal(useHeldItem(custom),null); // countdown
  custom.phase='racing';
  assert.equal(useHeldItem(custom),'shield');
  assert.equal(custom.player.effects.shield,10);
  assert.equal(useHeldItem(classic),null);
  free.player.heldItem='freeze'; startRace(free);
  assert.equal(useHeldItem(free),'magnet');
  assert.equal(free.player.effects.magnet,5);
});
