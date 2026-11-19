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
      name: { en: 'Ion thruster', 'zh-TW': '離子推進器' }, equipmentCategory: 'thruster',
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

test('the newly unlocked GT leads a single shared race reward batch', async () => {
  const race = { mode: 'classic', rivals: [{}], result: { success: true, position: 1 } };
  const cues = [];
  const cue = (name, delay) => cues.push([name, delay]);
  const result = { unlockedCars: ['crimson-gt'], unlockedTrack: true, next: 'neon', unlockedPaints: [], medals: [], challengeMedals: [] };
  await presentRaceAcquisitions(race, result, cue, true);
  const batch = acquisitionReveal.current();
  assert.ok(batch);
  try {
    assert.deepEqual(batch.items[0], {
      id: 'crimson-gt', kind: 'car', status: 'unlocked',
      name: { en: 'Vantaire GT', 'zh-TW': '夜鋒 GT' },
      artwork: { src: 'feature-assets/garage-public/car-picker/crimson-gt@3x.webp', style: 'cutout' },
    });
    assert.deepEqual(batch.items.map(item => item.id), ['crimson-gt', 'neon']);
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

test('the vehicle premiere uses a low front dolly, a broadside pass, a rear push and a title hold', async () => {
  const { CAR_REVEAL_MS, carRevealShot } = await import('../src/acquisition-car-camera.ts');
  assert.deepEqual([0, 1600, 3150, 4700, CAR_REVEAL_MS].map(time => carRevealShot(time).name),
    ['signature', 'profile', 'thrusters', 'hero', 'hero']);
  const nose = carRevealShot(1100);
  const side = carRevealShot(2350);
  const exhaust = carRevealShot(4550);
  const hero = carRevealShot(CAR_REVEAL_MS);
  assert.ok(nose.yaw > 2.4 && nose.pitch < .16 && nose.focus < 0);
  assert.ok(Math.abs(side.yaw - Math.PI / 2) < .15);
  assert.ok(exhaust.yaw < .46 && exhaust.focus > 0 && exhaust.fill > nose.fill);
  assert.ok(hero.fill < exhaust.fill && hero.yaw > 2);
  assert.deepEqual(carRevealShot(CAR_REVEAL_MS + 2000), hero);
});
