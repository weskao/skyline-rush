// Preserve every simulation tick, but only paint frames that camera probes inspect.
export function shouldDrawShowcaseFrame(frame, finalFrame, sampleStride) {
  return frame === finalFrame || (sampleStride > 0 && frame % sampleStride === 0);
}

// world.render() skips the draw (returns false) until models and scenery load; give those loads frames to land first.
export async function untilDrawn(render, maxFrames = 1200, nextFrame = () => new Promise(requestAnimationFrame)) {
  for (let i = 0; i < maxFrames; i++) {
    if (render()) return;
    await nextFrame();
  }
  throw new Error(`world never drew a frame in ${maxFrames} frames`);
}
