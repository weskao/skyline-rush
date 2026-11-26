import type * as THREE from 'three';

// renderer.render() calls scene.updateMatrixWorld() every pass, and Object3D recomposes every
// descendant even when an ancestor is hidden. Streamed chunks and parked race scenes are hidden
// most of the time, and world-origin rebasing forces their whole subtree each frame. A hidden
// object is never projected, so its subtree skips that work and gets one forced catch-up on the
// first traversal after it is shown again. updateWorldMatrix() (Box3, getWorldPosition) is untouched.
export function skipHiddenMatrixWork<T extends THREE.Object3D>(object: T): T {
  const traverse = object.updateMatrixWorld;
  let stale = false;
  object.updateMatrixWorld = function (this: T, force?: boolean) {
    if (!this.visible) { stale = true; return; }
    traverse.call(this, force || stale);
    stale = false;
  };
  return object;
}
