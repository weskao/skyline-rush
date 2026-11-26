// What the GPU holds after each render, per three r186 WebGLAttributes.update: a bumped version uploads the pending
// update ranges, or the whole array when there are none, then clears the ranges. The first sight is the allocation.
export function gpuUploadShadow() {
  const versions = new Map(), shadows = new Map();
  return {
    // Returns the bytes this "render" would upload for these attributes (InstancedBufferAttributes included).
    sync(attributes) {
      let bytes = 0;
      for (const a of attributes) {
        if (versions.get(a) === a.version) continue;
        const shadow = shadows.get(a);
        versions.set(a, a.version);
        if (!shadow) { shadows.set(a, a.array.slice()); a.clearUpdateRanges(); continue; }
        if (a.updateRanges.length === 0) { bytes += a.array.byteLength; shadow.set(a.array); }
        else for (const { start, count } of a.updateRanges) {
          bytes += count * a.array.BYTES_PER_ELEMENT; shadow.set(a.array.subarray(start, start + count), start);
        }
        a.clearUpdateRanges();
      }
      return bytes;
    },
    read: a => shadows.get(a) ?? a.array,
  };
}

// Every primitive the GPU would draw with alpha > 0 must equal the CPU state, and every CPU-visible one must be drawn.
export function assertGpuMatchesCpu(assert, geometry, gpu, label = '') {
  const { alpha } = geometry.attributes, gpuAlpha = gpu.read(alpha);
  const start = geometry.drawRange.start, end = Math.min(alpha.count, start + geometry.drawRange.count);
  for (let i = 0; i < alpha.count; i++) {
    const drawn = i >= start && i < end && gpuAlpha[i] > 0;
    assert.equal(drawn, alpha.array[i] > 0, `${label} slot ${i}: GPU-drawn ${drawn}, CPU alpha ${alpha.array[i]}`);
    if (!drawn) continue;
    for (const [name, a] of Object.entries(geometry.attributes)) for (let c = 0; c < a.itemSize; c++)
      assert.equal(gpu.read(a)[i * a.itemSize + c], a.array[i * a.itemSize + c], `${label} slot ${i} ${name}[${c}] is stale on the GPU`);
  }
}
