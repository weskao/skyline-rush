import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGpuTimer } from '../src/gpu-timer.ts';
function fake(supported = true) {
  let available = false, disjoint = false, lost = false, reads = 0, deleted = 0, active = false;
  const gl = { QUERY_RESULT_AVAILABLE: 1, QUERY_RESULT: 2,
    getExtension: () => supported ? { TIME_ELAPSED_EXT: 3, GPU_DISJOINT_EXT: 4 } : null,
    isContextLost: () => lost, getParameter: () => disjoint,
    createQuery: () => ({}), beginQuery: () => { assert.equal(active, false); active = true; },
    endQuery: () => { assert.equal(active, true); active = false; },
    getQueryParameter: (_, key) => { if (key === 1) return available; assert.ok(available); reads++; return 2500000; },
    deleteQuery: () => { deleted++; } };
  return { gl, ready: () => { available = true; }, disjoint: () => { disjoint = true; }, lose: () => { lost = true; },
    counts: () => ({ reads, deleted }) };
}
test('reads only available results and converts nanoseconds to milliseconds', () => {
  const f = fake(), timer = createGpuTimer(f.gl), samples = [];
  timer.measure(ms => samples.push(ms), () => {}); timer.poll();
  assert.deepEqual(samples, []); assert.equal(f.counts().reads, 0);
  f.ready(); timer.poll(); assert.deepEqual(samples, [2.5]); assert.deepEqual(f.counts(), { reads: 1, deleted: 1 });
});
test('unsupported and disjoint are not zero-time measurements', () => {
  const a = createGpuTimer(fake(false).gl); let ran = false;
  a.measure(() => assert.fail(), () => { ran = true; }); assert.ok(ran); assert.equal(a.status, 'unsupported');
  const f = fake(), t = createGpuTimer(f.gl); t.measure(() => assert.fail(), () => {});
  f.ready(); f.disjoint(); t.poll(); assert.equal(t.status, 'disjoint'); assert.equal(f.counts().reads, 0); assert.equal(f.counts().deleted, 1);
});
test('bounds pending queries, avoids nesting, and discards lost context', () => {
  const f = fake(), t = createGpuTimer(f.gl, 1); let ran = 0;
  t.measure(() => assert.fail(), () => { t.measure(() => assert.fail(), () => ran++); });
  t.measure(() => assert.fail(), () => ran++); assert.equal(ran, 2);
  f.lose(); t.poll(); assert.equal(t.status, 'context-lost'); assert.equal(f.counts().reads, 0);
});
test('ends and discards queries when drawing throws', () => {
  const f = fake(), t = createGpuTimer(f.gl);
  assert.throws(() => t.measure(() => assert.fail(), () => { throw Error('draw'); }), /draw/);
  assert.equal(f.counts().deleted, 1); t.measure(() => {}, () => {}); t.dispose(); assert.equal(f.counts().deleted, 2);
});
test('WebGL1 without query methods still draws and reports unsupported', () => {
  const gl = { getExtension: () => ({ TIME_ELAPSED_EXT: 3, GPU_DISJOINT_EXT: 4 }), isContextLost: () => false, getParameter: () => false };
  const timer = createGpuTimer(gl); let drawn = false;
  timer.measure(() => assert.fail(), () => { drawn = true; }); timer.poll();
  assert.equal(drawn, true); assert.equal(timer.status, 'unsupported'); timer.dispose();
});
