// Preserve every simulation tick, but only paint frames that camera probes inspect.
export function shouldDrawShowcaseFrame(frame, finalFrame, sampleStride) {
  return frame === finalFrame || (sampleStride > 0 && frame % sampleStride === 0);
}
