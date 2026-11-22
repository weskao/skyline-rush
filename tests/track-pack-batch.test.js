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
