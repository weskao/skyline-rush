import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('deterministic random streams and frame statistics have one strict TypeScript implementation each', async () => {
  for (const name of ['rng', 'perf']) {
    assert.equal(existsSync(new URL(`../src/${name}.ts`, import.meta.url)), true, name + ' must be strict TypeScript');
    assert.equal(existsSync(new URL(`../src/${name}.js`, import.meta.url)), false, name + ' must not have a legacy duplicate');
  }
  const { seededRng, RACE_STREAMS, streamSeed } = await import('../src/rng.ts');
  const { frameStats, PERF_WINDOW } = await import('../src/perf.ts');
  assert.deepEqual(Object.values(RACE_STREAMS), [
    'pickups', 'rings', 'gauntlet-hazards', 'mystery',
    'traffic', 'checkpoints', 'world-obstacles', 'active-items',
  ], 'saved course generation must keep existing stream names');
  const draw = (seed, stream) => Array.from({ length: 12 }, seededRng(seed, stream));
  assert.deepEqual(draw(42, RACE_STREAMS.rings), draw(42, RACE_STREAMS.rings));
  assert.notDeepEqual(draw(42, RACE_STREAMS.rings), draw(42, RACE_STREAMS.pickups));
  assert.equal(streamSeed(42, 'rings'), streamSeed(42, 'rings'));
  assert.deepEqual(frameStats([10, 10, 20, 40]), { count: 4, p50: 10, p95: 40, fps: 50 });
  assert.equal(PERF_WINDOW, 20);
});
