import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadTrackPackBatch } from '../src/track-pack-batch.ts';

const pack = id => ({ trackId: id, assets: [{ url: id }], signature: id });
test('download all skips installed packs and counts each map once', async () => {
  const calls = [], settled = [], progress = [];
  const result = await downloadTrackPackBatch([pack('coast'), pack('neon'), pack('spiral')], {
    status: async entry => entry.trackId === 'neon' || calls.includes(entry.trackId) ? 'ready' : 'missing',
    download: async (entry, onProgress) => { calls.push(entry.trackId); onProgress({ done: 1, total: 1, downloaded: 1, reused: 0 }); },
  }, value => progress.push(value), (entry, ok) => settled.push([entry.trackId, ok]));
  assert.deepEqual(calls, ['coast', 'spiral']);
  assert.deepEqual(result, { completed: 3, total: 3, failed: 0 });
  assert.deepEqual(settled, [['coast', true], ['neon', true], ['spiral', true]]);
  assert.equal(progress.at(-1).activeId, null);
});
test('failed downloads do not block following maps', async () => {
  const states = [];
  const result = await downloadTrackPackBatch([pack('coast'), pack('neon')], {
    status: async entry => entry.trackId === 'neon' ? 'ready' : 'missing',
    download: async () => { throw new Error('network failed'); },
  }, () => {}, (entry, ok) => states.push([entry.trackId, ok]));
  assert.deepEqual(result, { completed: 2, total: 2, failed: 1 });
  assert.deepEqual(states, [['coast', false], ['neon', true]]);
});
test('AbortSignal stops the remaining queue', async () => {
  const controller = new AbortController(), called = [];
  await assert.rejects(downloadTrackPackBatch([pack('coast'), pack('neon')], {
    status: async () => 'missing',
    download: async entry => { called.push(entry.trackId); controller.abort(); controller.signal.throwIfAborted(); },
  }, () => {}, () => {}, controller.signal), { name: 'AbortError' });
  assert.deepEqual(called, ['coast']);
});

test('a download-all batch caps concurrency at two map installations', async () => {
  const active = new Set(), installed = new Set(), launched = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const task = downloadTrackPackBatch([pack('coast'), pack('neon'), pack('spiral')], {
    status: async item => installed.has(item.trackId) ? 'ready' : 'missing',
    download: async item => {
      active.add(item.trackId); launched.push(item.trackId);
      assert.ok(active.size <= 2, 'mobile pack download cap');
      await gate; installed.add(item.trackId); active.delete(item.trackId);
    },
  }, () => {}, () => {}, undefined, 2);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(launched, ['coast', 'neon']);
  release();
  assert.deepEqual(await task, { completed: 3, total: 3, failed: 0 });
  assert.deepEqual(launched, ['coast', 'neon', 'spiral']);
});

test('Download All never starts more than 10 maps concurrently, even when 100 are requested', async () => {
  const packs = Array.from({ length: 16 }, (_, i) => pack(`map-${i}`));
  const launched = [], active = new Set(), ready = new Set(), settled = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const batch = downloadTrackPackBatch(packs, {
    status: async item => ready.has(item.trackId) ? 'ready' : 'missing',
    download: async item => {
      launched.push(item.trackId);
      active.add(item.trackId);
      await gate;
      ready.add(item.trackId);
      active.delete(item.trackId);
    },
  }, () => {}, (item, ok) => settled.push([item.trackId, ok]), undefined, 100);
  await new Promise(resolve => setImmediate(resolve));
  try {
    assert.equal(launched.length, 10, 'only the first 10 maps start before a download finishes');
    assert.equal(active.size, 10);
  } finally { release(); }
  assert.deepEqual(await batch, { completed: 16, total: 16, failed: 0 });
  assert.equal(launched.length, 16);
  assert.equal(settled.length, 16);
  assert.equal(active.size, 0);
});

test('Download All sums progress across parallel maps without moving backwards', async () => {
  const packs = [pack('a'), pack('b')];
  const ready = new Set(), updates = [];
  let releaseA, releaseB;
  const first = new Promise(resolve => { releaseA = resolve; });
  const second = new Promise(resolve => { releaseB = resolve; });
  const task = downloadTrackPackBatch(packs, {
    status: async item => ready.has(item.trackId) ? 'ready' : 'missing',
    download: async (item, update) => {
      update({ done: 1, total: 2, downloaded: 1, reused: 0 });
      await (item.trackId === 'a' ? first : second);
      ready.add(item.trackId);
      update({ done: 2, total: 2, downloaded: 2, reused: 0 });
    },
  }, state => updates.push(state), () => {}, undefined, 2);
  await new Promise(resolve => setImmediate(resolve));
  try {
    assert.equal(updates.at(-1).activeFraction, 1, 'two half-downloaded maps count as one full map');
    releaseA();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(updates.at(-1).completed, 1);
    assert.equal(updates.at(-1).activeFraction, 0.5, 'the other active map is still included');
  } finally { releaseA(); releaseB(); }
  assert.deepEqual(await task, { completed: 2, total: 2, failed: 0 });
  assert.ok(updates.every((state, i) => !i ||
    (state.completed + state.activeFraction) >= (updates[i - 1].completed + updates[i - 1].activeFraction)),
    'aggregate progress never decreases');
});
