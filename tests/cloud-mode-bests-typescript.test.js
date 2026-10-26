import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('permanent rule-scoped mode and stunt best merge uses a single TypeScript implementation', async () => {
  assert.equal(existsSync(new URL('../src/cloud-mode-bests.ts', import.meta.url)), true,
    'permanent cloud score normalization belongs in strict TypeScript');
  const old = readFileSync(new URL('../src/cloud-progress.js', import.meta.url), 'utf8');
  assert.match(old, /export\s*\{\s*mergeModeBests\s*\}\s*from\s*['"]\.\/cloud-mode-bests\.ts['"]/);
  assert.doesNotMatch(old, /export function mergeModeBests\(/);
  const { mergeModeBests } = await import('../src/cloud-mode-bests.ts');
  const timeKey = JSON.stringify(['coast', { mode: 'time' }]);
  const stuntKey = JSON.stringify(['coast', { mode: 'stunt', duration: 120 }]);
  const local = { bests: { [timeKey]: 90, [stuntKey]: 500 }, stunts: {
    [stuntKey]: { score: 500, maxCombo: 6, airTime: 12, medal: 'bronze' },
  } };
  const remote = { version: 1, bests: { [timeKey]: 80, [stuntKey]: 600 }, stunts: {
    [stuntKey]: { score: 600, maxCombo: 4, airTime: 18, medal: 'silver' },
  } };
  const merged = mergeModeBests(local, remote);
  assert.equal(merged.bests[timeKey], 80);
  assert.equal(merged.bests[stuntKey], 600);
  assert.deepEqual(merged.stunts[stuntKey], { score: 600, maxCombo: 6, airTime: 18, medal: 'silver' });
  assert.deepEqual(mergeModeBests(merged, remote), merged, 'cloud replay must be idempotent');
  assert.throws(() => mergeModeBests({}, { version: 99 }), /Unsupported mode bests/);
});
