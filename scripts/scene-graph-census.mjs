// CPU-only scene-graph census for the measured-route race scenes: object/mesh counts and the
// per-frame cost of the scene update plus the world-matrix traversal after world-origin rebasing.
// Not GPU time and not draw calls (use scripts/thermal-baseline.mjs for real WebGL counters).
// Usage: node scripts/scene-graph-census.mjs [frames]
import * as THREE from 'three';
import { createVolcanicCrownRaceScene } from '../src/volcanic-crown-race-scene.ts';
import { createStormlineRaceScene } from '../src/stormline-megacity-race-scene.ts';
import { createMonsoonRuinsRaceScene } from '../src/monsoon-ruins-race-scene.ts';
import { createFrostbiteRaceScene } from '../src/frostbite-race-scene.ts';

const FRAMES = Number(process.argv[2] ?? 2000);
const scenes = { 'volcanic-crown': createVolcanicCrownRaceScene, 'stormline-megacity': createStormlineRaceScene,
  'monsoon-ruins': createMonsoonRuinsRaceScene, 'frostbite-canyon': createFrostbiteRaceScene };
for (const [id, create] of Object.entries(scenes)) {
  const scene = new THREE.Scene(), race = create(scene);
  let objects = 0, meshes = 0, autoMatrix = 0, composed = 0;
  scene.traverse(o => { objects++; if (o.isMesh) meshes++; if (o.matrixAutoUpdate) autoMatrix++; });
  const compose = THREE.Matrix4.prototype.compose;
  THREE.Matrix4.prototype.compose = function (...args) { composed++; return compose.apply(this, args); };
  for (let i = 0; i < 200; i++) { race.update(800 + i, i / 60); scene.updateMatrixWorld(); } // JIT warmup
  composed = 0;
  let sceneMs = 0, matrixMs = 0;
  for (let i = 0; i < FRAMES; i++) {
    const t0 = performance.now(); race.update(1000 + i * 1.2, i / 60);
    const t1 = performance.now(); scene.updateMatrixWorld(); matrixMs += performance.now() - t1; sceneMs += t1 - t0;
  }
  THREE.Matrix4.prototype.compose = compose;
  let visible = 0; scene.traverseVisible(() => visible++);
  console.log(JSON.stringify({ id, objects, visible, meshes, autoMatrix, composePerFrame: Math.round(composed / FRAMES),
    sceneUpdateMs: +(sceneMs / FRAMES).toFixed(4), matrixWorldMs: +(matrixMs / FRAMES).toFixed(4) }));
  race.dispose();
}
