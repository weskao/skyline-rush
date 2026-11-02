// Locked production strategy: unreleased launch-flare bursts, their shaders and GPU allocations are absent.
export function createLaunchFlare() {
  return { active: false, reset() {}, setSkin() {}, trigger() { return false; }, hold() {}, update() {} };
}
