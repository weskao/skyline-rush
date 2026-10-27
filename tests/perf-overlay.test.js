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
    meter.record(984,.016,true);
    assert.equal(overlay.textContent, '', 'the first presented frame only establishes the clock');
    assert.equal(reads, 0);
    meter.record(1000,.016,true);
    assert.match(overlay.textContent, /^FRAME p50 16.0 ms · p95 16.0 ms · /);
    assert.equal(overlay.dataset.drawCalls, '42');
    assert.equal(overlay.dataset.triangles, '75000');
    meter.record(1100,.016,true);
    assert.equal(reads,1,'render counters sampled at the same interval as frame stats');
  } finally { globalThis.document=original; }
});

test('QA instrumentation does not access the scene unless ?perf is present', () => {
  assert.equal(createPerfOverlay(''), null);
});
