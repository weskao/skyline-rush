import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acquisitionReveal, createAcquisitionQueue } from '../src/acquisition-reveal.ts';
import { demoAcquisitionId, demoAcquisitionItems, missionTrophy } from '../src/acquisition-demo-items.ts';
import { storeAcquisitionBatch } from '../src/acquisition-demo-store.ts';
import { presentRaceAcquisitions, raceAcquisitionItems } from '../src/acquisition-race-reveal.ts';
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

test('only a newly redeemed store item produces an account-scoped equipment reveal', async () => {
  const port = createWave3LocalDemo();
  const scope = port.getOperationScope();
  const batch = receipt => storeAcquisitionBatch('thruster-ion', scope, receipt, port);

  assert.equal(batch(port.redeemPreview('thruster-ion')), undefined);
  port.settleCompletion({ schemaVersion: 1, completionId: 'acquisition-test-race', trackId: 'coast',
    mode: 'classic', eligible: true, occurredAt: Date.now(), accountId: scope.accountId });
  const successful = port.redeemPreview('thruster-ion');
  const reveal = batch(successful);
  const [{ action, ...reward }] = reveal.items;
  assert.deepEqual({ ...reveal, items: [reward] }, {
    id: demoAcquisitionId('store', scope, successful.operationId),
    items: [{
      id: 'thruster-ion', kind: 'equipment', status: 'unlocked', scope: 'demo',
      name: { en: 'Ion thruster', 'zh-TW': '離子推進器' }, equipmentCategory: 'thruster',
      artwork: { src: 'feature-assets/garage-vfx-skins/raster/thruster-ion@3x.webp', style: 'icon' },
    }],
  });
  assert.equal(batch(port.redeemPreview('thruster-ion')), undefined);
  assert.equal(batch({ ...successful, operationId: undefined }), undefined);
  assert.equal(batch({ ...successful, snapshot: { ...successful.snapshot, demoInventory: [] } }), undefined);
  assert.notEqual(storeAcquisitionBatch('thruster-ion', { ...scope, generation: 'new' }, successful, port).id, reveal.id);
  assert.notEqual(storeAcquisitionBatch('thruster-ion', { ...scope, accountId: 'other' }, successful, port).id, reveal.id);
  const queue = createAcquisitionQueue();
  assert.equal(queue.present(reveal), true);
  assert.equal(queue.present(batch(successful)), false);
  assert.equal(action?.kind, 'equip');
  assert.equal(port.getSnapshot().equippedPreview, null);
  assert.equal(await action.apply(), true);
  assert.equal(port.getSnapshot().equippedPreview, 'thruster-ion');
  assert.equal(port.getSnapshot().demoCoins, successful.snapshot.demoCoins);
  port.resetDemo();
  assert.equal(await action.apply(), false);
  assert.equal(port.getSnapshot().equippedPreview, null);
});

test('the newly unlocked GT leads a single shared race reward batch', async () => {
  const race = { mode: 'classic', rivals: [{}], result: { success: true, position: 1 } };
  const cues = [];
  const cue = (name, delay) => cues.push([name, delay]);
  const result = { unlockedCars: ['crimson-gt'], unlockedTrack: true, next: 'neon', unlockedPaints: [], medals: [], challengeMedals: [] };
  const visited = [];
  await presentRaceAcquisitions(race, result, cue, true, id => visited.push(id));
  const batch = acquisitionReveal.current();
  assert.ok(batch);
  try {
    assert.deepEqual(batch.items[0], {
      id: 'crimson-gt', kind: 'car', status: 'unlocked',
      name: { en: 'Vantaire GT', 'zh-TW': '夜鋒 GT' },
      artwork: { src: 'feature-assets/garage-public/car-picker/crimson-gt@3x.webp', style: 'cutout' },
    });
    assert.deepEqual(batch.items.map(item => item.id), ['crimson-gt', 'neon']);
    assert.equal(batch.items[1].action?.kind, 'track');
    assert.deepEqual(visited, []);
    batch.items[1].action.open();
    assert.deepEqual(visited, ['neon']);
    await presentRaceAcquisitions(race, result, cue, true);
  } finally {
    acquisitionReveal.dismiss(batch.id);
  }
  assert.equal(acquisitionReveal.current(), null);
  assert.deepEqual(cues, [], 'the shared reveal owns the celebration audio');
});

test('other race rewards do not present an already available or trial GT', () => {
  assert.deepEqual(raceAcquisitionItems({
    unlockedCars: [], unlockedTrack: true, next: 'neon', unlockedPaints: [], medals: [], challengeMedals: [],
  }).map(item => item.id), ['neon']);
});

test('the vehicle premiere moves from signature to rear and side, then pulls back and holds the car', async () => {
  const { CAR_REVEAL_MS, carRevealShot } = await import('../src/acquisition-car-camera.ts');
  const [front, rear, side, reveal, end] = [0, 980, 2150, 3580, CAR_REVEAL_MS].map(carRevealShot);
  assert.deepEqual([front, rear, side, reveal, end].map(shot => shot.name),
    ['signature', 'thrusters', 'profile', 'hero', 'hero']);
  assert.equal(CAR_REVEAL_MS, 5800);
  assert.ok(front.yaw < -2.6 && front.focus < -.2 && front.fill > 1);
  assert.ok(Math.abs(rear.yaw) < .75 && rear.focus > .2);
  assert.ok(Math.abs(side.yaw + Math.PI / 2) < .35);
  assert.ok(end.fill < reveal.fill && end.fov > front.fov);
  assert.deepEqual(carRevealShot(5050), end, 'the title holds on the finished composition');
  assert.deepEqual(carRevealShot(CAR_REVEAL_MS + 2000), end);
});
