import { WebGLAttributes } from 'three/src/renderers/webgl/WebGLAttributes.js';

// What the GPU holds after each render: three's own WebGLAttributes.update (version check, in-place range sort/merge,
// one bufferSubData per merged range or the whole array when there are none) runs against a recording fake GL that
// copies every upload into a shadow buffer. The first sight is the allocation (bufferData) and is not counted.
export function gpuUploadShadow() {
  let bound = null, bytes = 0, calls = 0;
  const gl = {
    ARRAY_BUFFER: 34962, FLOAT: 5126, HALF_FLOAT: 5131, UNSIGNED_SHORT: 5123, SHORT: 5122, UNSIGNED_INT: 5125, INT: 5124,
    BYTE: 5120, UNSIGNED_BYTE: 5121,
    createBuffer: () => ({ data: null }),
    bindBuffer(_, buffer) { bound = buffer; },
    bufferData(_, array) { bound.data = array.slice(); },
    bufferSubData(_, byteOffset, source, offset = 0, length = source.length - offset) {
      bound.data.set(source.subarray(offset, offset + length), byteOffset / source.BYTES_PER_ELEMENT);
      bytes += length * source.BYTES_PER_ELEMENT; calls++;
    },
  };
  const attributes = new WebGLAttributes(gl);
  return {
    // Returns the bytes this "render" would upload for these attributes (InstancedBufferAttributes included).
    sync(list) {
      const before = bytes;
      for (const a of list) attributes.update(a, gl.ARRAY_BUFFER);
      return bytes - before;
    },
    get calls() { return calls; }, // bufferSubData calls so far
    read: a => attributes.get(a)?.buffer.data ?? a.array,
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
