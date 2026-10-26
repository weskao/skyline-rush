import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('cloud sync metadata has one strict TypeScript implementation and its legacy public exports remain stable', async () => {
  const module = new URL('../src/cloud-sync-status.ts', import.meta.url);
  assert.ok(existsSync(module), 'cloud sync state must move to strict TypeScript');
  const old = readFileSync(new URL('../src/cloud-progress.js', import.meta.url), 'utf8');
  assert.match(old, /export\s*\{\s*readCloudSyncStatus,\s*writeCloudSyncStatus\s*\}\s*from\s*['"]\.\/cloud-sync-status\.ts['"]/);
  assert.doesNotMatch(old, /const cloudSyncKey|const EMPTY_SYNC/, 'no duplicated legacy implementation');
  const { readCloudSyncStatus, writeCloudSyncStatus } = await import(module);
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(writeCloudSyncStatus('alice', { pending: true }, storage), true);
  assert.deepEqual(readCloudSyncStatus('bob', storage), { pending: false, lastSuccess: null });
  assert.deepEqual(readCloudSyncStatus('alice', storage), { pending: true, lastSuccess: null });
  assert.equal(writeCloudSyncStatus('alice', { pending: false, lastSuccess: '2026-10-26T12:00:00Z' }, storage), true);
  assert.deepEqual(readCloudSyncStatus('alice', storage), { pending: false, lastSuccess: '2026-10-26T12:00:00.000Z' });
  assert.equal(writeCloudSyncStatus('alice', { pending: true }, storage), true);
  assert.equal(readCloudSyncStatus('alice', storage).lastSuccess, '2026-10-26T12:00:00.000Z');
  assert.equal(writeCloudSyncStatus('alice', { pending: true, lastSuccess: 'invalid' }, storage), false);
  assert.deepEqual(readCloudSyncStatus('alice', storage), { pending: true, lastSuccess: '2026-10-26T12:00:00.000Z' });
});
