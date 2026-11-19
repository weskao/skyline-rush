import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deleteCloudDocuments } from '../src/cloud-delete.ts';

const run = ({ uids = ['driver', 'driver', 'driver'], previewError } = {}) => {
  const calls = [];
  const current = [...uids];
  const promise = deleteCloudDocuments({
    checkAccount: () => {
      calls.push('check');
      if (current.shift() !== 'driver') throw new Error('Cloud account changed');
    },
    commitBatch: async () => { calls.push('batch'); },
    deletePreview: async () => {
      calls.push('preview');
      if (previewError) throw previewError;
    },
  });
  return { calls, promise };
};

test('account deletion commits the main batch before deleting the Wave 3 preview document', async () => {
  const { calls, promise } = run();
  await promise;
  assert.deepEqual(calls, ['check', 'batch', 'check', 'preview']);
});

test('a preview collection without rules (permission-denied) does not fail account deletion', async () => {
  const { calls, promise } = run({ previewError: Object.assign(new Error('denied'), { code: 'permission-denied' }) });
  await promise;
  assert.deepEqual(calls, ['check', 'batch', 'check', 'preview']);
});

test('any other preview delete error propagates so retained data is reported', async () => {
  const { promise } = run({ previewError: Object.assign(new Error('offline'), { code: 'unavailable' }) });
  await assert.rejects(promise, /offline/);
});

test('an account switch after the batch stops before touching the preview document', async () => {
  const { calls, promise } = run({ uids: ['driver', 'someone-else'] });
  await assert.rejects(promise, /Cloud account changed/);
  assert.deepEqual(calls, ['check', 'batch', 'check']);
});

test('cloud-save deletes the preview document in every build, outside the main batch', () => {
  const source = readFileSync(new URL('../src/cloud-save.ts', import.meta.url), 'utf8');
  assert.match(source, /deleteCloudDocuments\(/);
  assert.doesNotMatch(source, /stageDeletion/);
  assert.doesNotMatch(readFileSync(new URL('../src/wave3-preview-firestore.ts', import.meta.url), 'utf8'), /stageDeletion/);
});
