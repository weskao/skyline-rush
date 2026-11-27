import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BufferAttribute, BufferGeometry } from 'three';
import { createLiveSpan } from '../src/effects-particle-upload.js';
import { seededRng } from '../src/rng.ts';
import { gpuUploadShadow, assertGpuMatchesCpu } from './helpers/gpu-upload-shadow.js';

// A ring pool driven the way effects.js / aero-vfx.js drive theirs: emit at a wrapping cursor, then rewrite only the
// span's slots (skipping its dead hole), report live slots, commit.
function ringPool(capacity) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(capacity * 3), 3));
  geometry.setAttribute('alpha', new BufferAttribute(new Float32Array(capacity), 1));
  const attributes = Object.values(geometry.attributes), span = createLiveSpan(capacity, attributes, { geometry });
  const life = new Float32Array(capacity), maxLife = new Float32Array(capacity);
  let cursor = 0;
  return {
    geometry, attributes, span,
    emit(frames) { life[cursor] = maxLife[cursor] = frames; span.add(cursor); cursor = (cursor + 1) % capacity; },
    step(frame) {
      const position = geometry.attributes.position.array, alpha = geometry.attributes.alpha.array;
      for (let i = span.first, last = span.last; i <= last; i = span.next(i)) {
        life[i] = Math.max(0, life[i] - 1);
        if (life[i] === 0) { alpha[i] = 0; continue; }
        span.live(i);
        position[i * 3] = frame; position[i * 3 + 1] = i; position[i * 3 + 2] = life[i];
        alpha[i] = life[i] / maxLife[i];
      }
      span.commit();
    },
    liveSlots: () => [...geometry.attributes.alpha.array].flatMap((a, i) => a > 0 ? [i] : []),
  };
}

test('a wrapped live span uploads only [start, capacity) + [0, wrapEnd), not the whole ring', () => {
  const pool = ringPool(16), gpu = gpuUploadShadow();
  gpu.sync(pool.attributes);
  for (let i = 0; i < 12; i++) pool.emit(1); // slots 0..11 die after one frame
  for (let i = 12; i < 16; i++) pool.emit(9); // slots 12..15 live on
  pool.step(0); gpu.sync(pool.attributes);
  pool.emit(9); pool.emit(9); // the cursor wraps to slots 0 and 1
  pool.step(1); gpu.sync(pool.attributes);
  assert.deepEqual(pool.liveSlots(), [0, 1, 12, 13, 14, 15]);
  const calls = gpu.calls;
  pool.step(2);
  assert.equal(gpu.sync(pool.attributes), 6 * (3 + 1) * 4, 'only the 6 live slots of position + alpha are uploaded');
  assert.equal(gpu.calls - calls, 4, 'two ranges per attribute');
  assertGpuMatchesCpu(assert, pool.geometry, gpu, 'wrapped');
  assert.deepEqual([pool.geometry.drawRange.start, pool.geometry.drawRange.count], [0, 16], 'one draw call keeps its slot order');
});

test('a seeded ring run keeps the GPU copy equal to a full upload every frame and uploads less once it wraps', () => {
  const capacity = 64, pool = ringPool(capacity), gpu = gpuUploadShadow(), rng = seededRng(90, 'live-span');
  const ringBytes = capacity * (3 + 1) * 4;
  gpu.sync(pool.attributes);
  let wrapped = 0, wrappedBytes = 0;
  for (let frame = 0; frame < 600; frame++) {
    const burst = frame % 90 < 30 ? 3 : rng() < 0.3 ? 1 : 0; // bursts, then a trickle
    for (let k = 0; k < burst; k++) pool.emit(4 + Math.floor(rng() * 20));
    pool.step(frame);
    if (frame % 50 > 45) { // a paused / hidden render: pending ranges must stay bounded and lose nothing
      assert.ok(pool.attributes.every(a => a.updateRanges.length <= 2), `frame ${frame}: pending ranges stay bounded`);
      continue;
    }
    const live = pool.liveSlots(), bytes = gpu.sync(pool.attributes);
    assertGpuMatchesCpu(assert, pool.geometry, gpu, `frame ${frame}`);
    if (live.includes(0) && live.includes(capacity - 1) && live.length < capacity / 2) { wrapped++; wrappedBytes += bytes; }
  }
  assert.ok(wrapped > 20, `the ring wrapped with a dead gap on ${wrapped} frames`);
  assert.ok(wrappedBytes / wrapped < ringBytes * 0.75, `wrapped frames upload ${wrappedBytes / wrapped} B, ring is ${ringBytes} B`);
});
