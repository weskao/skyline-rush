import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWave3LocalDemo } from '../src/wave3-local-demo.ts';
import { createWave3DemoStorage, WAVE3_DEMO_STORAGE_PREFIX } from '../src/wave3-demo-storage.ts';
import { storeReadiness } from '../src/garage-store-readiness.ts';

const time = Date.parse('2026-11-10T12:00:00Z');
const event = (accountId, id) => ({schemaVersion:1, eventId:id, completionId:'race-safe-0001', trackId:'coast',
  mode:'classic',kind:'finish',accountId,eligible:true,occurredAt:time});
const finish = accountId => ({schemaVersion:1, completionId:'race-safe-0001', trackId:'coast',
  mode:'classic',accountId,eligible:true,occurredAt:time});
const disk = () => { const data = new Map([['skyline-rush-stars','never-delete']]);
  return {data, getItem:key=>data.get(key)??null, setItem:(key,value)=>data.set(key,value),
    removeItem:key=>data.delete(key)}; };

test('guest/driver_A/driver_B reloads use independent local-only keys, claims and replay guards', () => {
  const storage = disk(), cache = createWave3DemoStorage({storage,now:()=>time});
  const first = createWave3LocalDemo({now:()=>time});
  for (const user of ['guest','driver_A','driver_B']) {
    first.setAccount(user);
    first.recordGameEvent(event(user,'event-'+user+'-12345'));
    first.settleCompletion(finish(user));
    assert.equal(first.claimMission('mission-race').status,'completed');
    assert.equal(first.getSnapshot().demoPoints,50);
    assert.equal(cache.saveCheckpoint(first.getCheckpoint()),true);
  }
  for (const user of ['driver_B','driver_A','guest']) {
    const next = createWave3LocalDemo({now:()=>time});
    next.setAccount(user);
    const saved = cache.loadCheckpoint(user);
    assert.ok(saved, 'saved demo checkpoint for '+user);
    assert.ok(next.restoreCheckpoint(saved));
    assert.equal(next.getSnapshot().accountId,user);
    assert.equal(next.getSnapshot().demoPoints,50);
    assert.equal(next.settleCompletion(finish(user)).status,'duplicate');
    assert.equal(next.claimMission('mission-race').status,'duplicate');
    assert.equal(next.settleCompletion(finish(user)).deltaDemoPoints,0);
  }
  cache.resetDemo('driver_A');
  assert.equal(cache.loadCheckpoint('driver_A'),null);
  assert.ok(cache.loadCheckpoint('guest'));
  assert.ok(cache.loadCheckpoint('driver_B'));
  assert.equal(storage.data.get('skyline-rush-stars'),'never-delete');
  assert.equal(storage.data.has(WAVE3_DEMO_STORAGE_PREFIX+'driver_A'),false);
});

test('storage exceptions and unsupported schema must fail closed without production grants', () => {
  const broken = {getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
  const demo = createWave3LocalDemo({now:()=>time});
  const cache = createWave3DemoStorage({storage:broken,now:()=>time});
  assert.equal(cache.saveCheckpoint(demo.getCheckpoint()),false);
  assert.equal(cache.loadCheckpoint('driver_A'),null);
  const restored = createWave3LocalDemo({now:()=>time});
  assert.equal(restored.restoreCheckpoint({...demo.getCheckpoint(),
    snapshot:{...demo.getSnapshot(),version:999}}),null);
  assert.equal(restored.getSnapshot().demoPoints,20);
});

test('real Store remains fail-closed regardless of demo inventory', () => {
  const demo = createWave3LocalDemo({now:()=>time});
  demo.settleCompletion(finish('guest'));
  assert.equal(demo.redeemPreview('thruster-ion').status,'completed');
  assert.deepEqual(demo.getSnapshot().demoInventory,['thruster-ion']);
  assert.equal(storeReadiness().canBuy,false);
  assert.equal(storeReadiness().canClaim,false);
  assert.equal(storeReadiness().balance,null);
  assert.equal(storeReadiness().price,null);
});
