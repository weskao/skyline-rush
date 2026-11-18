import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAcquisitionQueue } from '../src/acquisition-reveal.ts';
import { demoAcquisitionId, demoAcquisitionItems, missionTrophy, storeAcquisitionBatch } from '../src/acquisition-demo-items.ts';
import { createWave3LocalDemo } from '../src/wave3-local-demo.ts';

const item = { id: 'gt', kind: 'car', status: 'unlocked', name: { en: 'Vantaire GT', 'zh-TW': '夜鋒 GT' } };

test('queues committed batches in order, ignores replay and advances only the active batch', () => {
  const queue = createAcquisitionQueue();
  const seen = [];
  const stop = queue.subscribe(batch => seen.push(batch?.id));
  assert.equal(queue.present({ id: 'empty', items: [] }), false);
  assert.equal(queue.present({ id: 'race-1', items: [item] }), true);
  assert.equal(queue.present({ id: 'shop-1', items: [item] }), true);
  assert.equal(queue.present({ id: 'race-1', items: [item] }), false);
  queue.dismiss('shop-1');
  assert.equal(queue.current()?.id, 'race-1');
  queue.dismiss('race-1');
  queue.dismiss('shop-1');
  assert.equal(queue.present({ id: 'race-1', items: [item] }), false);
  stop();
  assert.deepEqual(seen, [undefined, 'race-1', 'shop-1', undefined]);
});

test('only successful positive settlement deltas turn into demo currency cards', () => {
  const receipt = { status: 'completed', deltaDemoPoints: 24, deltaDemoCoins: 51, deltaDemoDiamonds: -1 };
  assert.deepEqual(demoAcquisitionItems({ ...receipt, status: 'duplicate' }), []);
  assert.deepEqual(demoAcquisitionItems({ ...receipt, deltaDemoPoints: -20, deltaDemoCoins: 0 }), []);
  const items = demoAcquisitionItems(receipt);
  assert.deepEqual(items.map(({ id, quantity, scope }) => [id, quantity, scope]), [
    ['coins', 51, 'demo'], ['points', 24, 'demo'],
  ]);
  assert.match(items[0].artwork.src, /wallet-coin@3x\.webp$/);
});

test('only claims counted by the existing mission board reveal the next trophy tier', () => {
  const snapshot = { missions: { 'mission-race': { claimed: true }, 'mission-time': { claimed: true }, 'daily-race': { claimed: true } } };
  assert.equal(missionTrophy('mission-time', snapshot)?.id, 'trophy-silver');
  assert.equal(missionTrophy('daily-race', snapshot), undefined);
});

test('only a newly redeemed store item produces an account-scoped equipment reveal', () => {
  const port = createWave3LocalDemo();
  const scope = port.getOperationScope();
  const batch = receipt => storeAcquisitionBatch('thruster-ion', scope, receipt);

  assert.equal(batch(port.redeemPreview('thruster-ion')), undefined);
  port.settleCompletion({ schemaVersion: 1, completionId: 'acquisition-test-race', trackId: 'coast',
    mode: 'classic', eligible: true, occurredAt: Date.now(), accountId: scope.accountId });
  const successful = port.redeemPreview('thruster-ion');
  const reveal = batch(successful);
  assert.deepEqual(reveal, {
    id: demoAcquisitionId('store', scope, successful.operationId),
    items: [{
      id: 'thruster-ion', kind: 'equipment', status: 'unlocked', scope: 'demo',
      name: { en: 'Ion thruster', 'zh-TW': '離子推進器' },
      artwork: { src: 'feature-assets/garage-vfx-skins/raster/thruster-ion@3x.webp', style: 'icon' },
    }],
  });
  assert.equal(batch(port.redeemPreview('thruster-ion')), undefined);
  assert.equal(batch({ ...successful, operationId: undefined }), undefined);
  assert.equal(batch({ ...successful, snapshot: { ...successful.snapshot, demoInventory: [] } }), undefined);
  assert.notEqual(storeAcquisitionBatch('thruster-ion', { ...scope, generation: 'new' }, successful).id, reveal.id);
  assert.notEqual(storeAcquisitionBatch('thruster-ion', { ...scope, accountId: 'other' }, successful).id, reveal.id);
  const queue = createAcquisitionQueue();
  assert.equal(queue.present(reveal), true);
  assert.equal(queue.present(batch(successful)), false);
});
