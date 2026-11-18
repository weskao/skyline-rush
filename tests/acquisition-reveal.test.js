import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAcquisitionQueue } from '../src/acquisition-reveal.ts';
import { demoAcquisitionItems, missionTrophy } from '../src/acquisition-demo-items.ts';

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
