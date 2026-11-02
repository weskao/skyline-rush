// Locked production strategy: unreleased NITRO trail streaks, their shaders and GPU allocations are absent.
export function createNitroTrail() {
  return { streaks: { visible: false }, pool: { visible: false }, setStyle() {}, update() {} };
}
