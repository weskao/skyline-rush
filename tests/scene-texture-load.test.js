import test from 'node:test';
import assert from 'node:assert/strict';
import * as sceneTexture from '../src/coast-sky.ts';

test('a slow scene texture settles to the fallback and a late result is disposed', async () => {
  let resolveTexture, disposed = false;
  const loading = new Promise(resolve => { resolveTexture = resolve; });
  const boundedLoad = sceneTexture.waitForSceneTexture?.(loading, 5) ?? loading;
  await assert.rejects(Promise.race([
    boundedLoad,
    new Promise(resolve => setTimeout(resolve, 50)),
  ]), /timed out/);
  resolveTexture({ dispose: () => { disposed = true; } });
  await loading;
  assert.equal(disposed, true);
});
