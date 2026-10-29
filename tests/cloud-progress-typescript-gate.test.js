import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('account-isolated storage, export parsing and rollback are owned by native TypeScript', async () => {
  assert.ok(existsSync(new URL('../src/cloud-progress.ts', import.meta.url)));
  assert.equal(existsSync(new URL('../src/cloud-progress.js', import.meta.url)), false);
  const { mergeProgress, readLocalProgress, saveLocalProgress, switchCloudAccount, parseProgressExport } =
    await import('../src/cloud-progress.ts');
  const raw = new Map();
  const storage = { getItem: key => raw.get(key) ?? null,
    setItem: (key, value) => raw.set(key, value), removeItem: key => raw.delete(key) };
  const accountA = mergeProgress({ unlocked: ['coast', 'neon'], stars: { neon: 3 } });
  assert.equal(saveLocalProgress(accountA, storage), true);
  assert.equal(switchCloudAccount('alice', 'bob', storage), true);
  assert.deepEqual(readLocalProgress(storage).unlocked, ['coast']);
  assert.equal(switchCloudAccount('bob', 'alice', storage), true);
  assert.deepEqual(readLocalProgress(storage).stars, { neon: 3 });
  const file = JSON.stringify({ version: 2, ...accountA });
  assert.deepEqual(parseProgressExport(file).progress, accountA);
  assert.throws(() => parseProgressExport('{"version":9}'), /Unsupported/);
});
