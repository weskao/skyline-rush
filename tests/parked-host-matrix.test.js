import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCircuitScene } from '../src/circuit-scene.ts';
import { createCoastScenery } from '../src/coast-visuals.ts';
import { legacyClassicRoad } from '../src/classic-road-routes.ts';

// Same probes as tests/scene-matrix-culling.test.js: the Harbor Circuit and Coast scenery hosts stay parked
// (hidden) on every other track, so their subtree must not be recomposed, and must be exact when shown again.
function recordUpdates(run) {
  const updated = new Set(), original = THREE.Object3D.prototype.updateMatrix;
  THREE.Object3D.prototype.updateMatrix = function () { updated.add(this); return original.call(this); };
  try { run(); } finally { THREE.Object3D.prototype.updateMatrix = original; }
  return updated;
}
const chainVisible = object => { for (let o = object; o; o = o.parent) if (!o.visible) return false; return true; };
function assertExact(root, label) {
  const local = new THREE.Matrix4();
  root.traverse(o => {
    if (!chainVisible(o)) return;
    const expected = new THREE.Matrix4(), chain = [];
    for (let p = o; p; p = p.parent) chain.unshift(p);
    for (const p of chain) expected.multiply(p.matrixAutoUpdate ? local.compose(p.position, p.quaternion, p.scale) : p.matrix);
    o.matrixWorld.elements.forEach((x, i) => assert.ok(Math.abs(x - expected.elements[i]) < 1e-3 * Math.max(1, Math.abs(expected.elements[i])),
      `${label}: stale world matrix on ${o.name || o.type}`));
  });
}

const HOSTS = {
  'Harbor Circuit': scene => { const host = createCircuitScene(scene); return { show: d => host.update(d), hide: () => host.hide(), dispose: () => host.dispose?.() }; },
  'Coast scenic details': scene => { const host = createCoastScenery(scene);
    return { show: d => { host.show(); host.update(legacyClassicRoad, d, 'high', undefined, 0); }, hide: () => host.hide(), dispose: () => host.dispose() }; },
};

for (const [name, create] of Object.entries(HOSTS)) {
  test(`${name}: a parked host does no matrix work and is exact when it returns`, () => {
    const scene = new THREE.Scene(), host = create(scene), root = scene.getObjectByName(name);
    try {
      host.show(400); scene.updateMatrixWorld();
      host.hide();
      for (let frame = 0; frame < 3; frame++) {
        const updated = recordUpdates(() => scene.updateMatrixWorld());
        assert.equal([...updated].filter(o => o !== scene).length, 0, `${name} hidden: objects recomposed`);
      }
      host.show(900); // moved while parked: the first shown traversal must catch up
      scene.updateMatrixWorld();
      assertExact(root, name);
    } finally { host.dispose(); }
  });
}
