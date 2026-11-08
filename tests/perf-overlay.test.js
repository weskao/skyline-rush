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

test('QA perf strip reports a device slower than 4 fps instead of treating every frame as a stall', () => {
  const original = globalThis.document;
  const overlay = { dataset: {}, textContent: '' };
  globalThis.document = { createElement: () => overlay, body: { appendChild: element => element } };
  try {
    const meter = createPerfOverlay('?perf');
    for (let now = 1000; now <= 2800; now += 300) meter.record(now, .3, true); // CI software WebGL: 4.5 fps on Neon
    assert.match(overlay.textContent, /^FRAME p50 300.0 ms · p95 300.0 ms · /);
    meter.record(6000, 3.2, true); // back from another tab
    meter.record(6300, .3, true);
    assert.match(overlay.textContent, /^FRAME p50 300.0 ms · p95 300.0 ms · /, 'a tab switch is not a frame time');
  } finally { globalThis.document = original; }
});
