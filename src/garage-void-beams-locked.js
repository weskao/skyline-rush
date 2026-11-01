// Locked production strategy: unreleased Void beams and their GPU allocations are absent.
export function createVoidPulseBeams() {
  const mesh = { visible: false };
  return { mesh, setSelected() {}, update() {} };
}
