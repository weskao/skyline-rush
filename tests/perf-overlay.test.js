import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerfOverlay } from '../src/perf-overlay.ts';

test('QA perf strip attaches bounded scene render load without affecting its frame text', () => {
  const original = globalThis.document;
  const overlay={ dataset:{}, textContent:'' };
  globalThis.document = { createElement: () => overlay, body:{ appendChild: element => element } };
  try {
    let reads=0;
    const meter=createPerfOverlay('?perf', () => { reads++; return {drawCalls:42,triangles:75000}; });
    meter.record(1000,.016,true); // first presented frame establishes the clock
    assert.equal(overlay.textContent, '');
    assert.equal(reads, 0);
    meter.record(1016,.016,true);
    assert.match(overlay.textContent, /^FRAME p50 16.0 ms · p95 16.0 ms · /);
    assert.equal(overlay.dataset.drawCalls, '42');
    assert.equal(overlay.dataset.triangles, '75000');
    meter.record(1032,.016,true);
    assert.equal(reads,1,'render counters sampled at the same interval as frame stats');
  } finally { globalThis.document=original; }
});

test('QA instrumentation does not access the scene unless ?perf is present', () => {
  assert.equal(createPerfOverlay(''), null);
});

test('diag builds measure without ?perf but draw no strip; stats only while racing', async () => {
  const original = globalThis.document;
  let created = 0;
  globalThis.document = { createElement: () => { created++; return { dataset: {} }; }, body: { appendChild: element => element } };
  try {
    const { latestPerf } = await import('../src/perf-overlay.ts');
    const meter = createPerfOverlay('', () => ({ drawCalls: 42, triangles: 75000 }), true);
    assert.ok(meter, 'record mode returns a meter');
    assert.equal(created, 0, 'no on-screen strip covers the game without ?perf');
    meter.record(1000, .016, true);
    meter.record(1016.04, .016, true);
    assert.deepEqual(latestPerf(), { p50: 16, p95: 16, fps: 62.3, seconds: 0, drawCalls: 42, triangles: 75000 });
    meter.record(1032, .016, false);
    assert.equal(latestPerf(), null, 'outside racing the beat carries no stale stats');
  } finally { globalThis.document = original; }
});
