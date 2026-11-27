import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVolcanicCrownRaceScene } from '../src/volcanic-crown-race-scene.ts';
import { createStormlineRaceScene } from '../src/stormline-megacity-race-scene.ts';
import { createMonsoonRuinsRaceScene } from '../src/monsoon-ruins-race-scene.ts';
import { createFrostbiteRaceScene } from '../src/frostbite-race-scene.ts';

const FACTORIES = { volcanic: createVolcanicCrownRaceScene, stormline: createStormlineRaceScene,
  monsoon: createMonsoonRuinsRaceScene, frostbite: createFrostbiteRaceScene };
// Records every object whose local matrix is recomposed during a traversal.
function recordUpdates(run) {
  const updated = new Set(), original = THREE.Object3D.prototype.updateMatrix;
  THREE.Object3D.prototype.updateMatrix = function () { updated.add(this); return original.call(this); };
  try { run(); } finally { THREE.Object3D.prototype.updateMatrix = original; }
  return updated;
}
const hiddenChunkAncestor = (object, root) => {
  for (let o = object.parent; o && o !== root.parent; o = o.parent) if (!o.visible && o.parent === root) return o;
  return null;
};
const chainVisible = object => { for (let o = object; o; o = o.parent) if (!o.visible) return false; return true; };
// Independent reference: world matrix rebuilt from each ancestor's position/quaternion/scale.
function referenceWorld(object) {
  const out = new THREE.Matrix4(), local = new THREE.Matrix4();
  const chain = []; for (let o = object; o; o = o.parent) chain.unshift(o);
  for (const o of chain) out.multiply(o.matrixAutoUpdate ? local.compose(o.position, o.quaternion, o.scale) : o.matrix);
  return out;
}

for (const [name, factory] of Object.entries(FACTORIES)) {
  test(`${name}: hidden streamed chunks skip matrix work and catch up exactly when shown`, () => {
    const scene = new THREE.Scene(), race = factory(scene), root = scene.children.at(-1);
    try {
      for (const distance of [120, 1800, 3600, 900]) {
        race.update(distance, distance / 30, false);
        const updated = recordUpdates(() => scene.updateMatrixWorld());
        const wasted = [...updated].filter(o => hiddenChunkAncestor(o, root));
        assert.equal(wasted.length, 0, `${name} @${distance}: ${wasted.length} objects inside hidden chunks recomposed`);
        root.traverse(o => {
          if (!chainVisible(o)) return;
          const expected = referenceWorld(o).elements, actual = o.matrixWorld.elements;
          actual.forEach((x, i) => assert.ok(Math.abs(x - expected[i]) < 1e-3 * Math.max(1, Math.abs(expected[i])),
            `${name} @${distance}: stale world matrix on ${o.name || o.type}`));
        });
      }
      race.hide();
      const updated = recordUpdates(() => scene.updateMatrixWorld());
      assert.ok(updated.size <= 1, `${name} hidden race still recomposes ${updated.size} objects`);
    } finally { race.dispose(); }
  });
}

test('a parked World Tour scene does no matrix work on other tracks and is exact when it returns', async () => {
  const { createWorldTourScene } = await import('../src/world-tour-scene.js');
  const { RACE_TRACKS } = await import('../src/game.js');
  const scene = new THREE.Scene(), tour = createWorldTourScene(scene), root = scene.getObjectByName('World Tour authored scenery');
  try {
    tour.update('taipei', 1000, 'high', RACE_TRACKS.taipei.sections);
    scene.updateMatrixWorld();
    tour.update('neon', 1000, 'high', []);
    const updated = recordUpdates(() => scene.updateMatrixWorld());
    assert.equal([...updated].filter(o => o !== scene).length, 0, 'hidden World Tour scenery recomposed');
    tour.update('taipei', 1300, 'high', RACE_TRACKS.taipei.sections);
    scene.updateMatrixWorld();
    root.traverse(o => {
      if (!chainVisible(o)) return;
      const expected = referenceWorld(o).elements;
      o.matrixWorld.elements.forEach((x, i) => assert.ok(Math.abs(x - expected[i]) < 1e-3 * Math.max(1, Math.abs(expected[i])), o.name || o.type));
    });
  } finally { tour.dispose(); }
});
