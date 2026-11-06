// Frostbite race scene CPU build time and the draw calls / triangles left after distance culling.
// Usage: node scripts/frostbite-scene-cost.mjs [distance ...]
import * as THREE from 'three';
import { createFrostbiteRaceScene } from '../src/frostbite-race-scene.ts';

const scene = new THREE.Scene(), started = performance.now();
const race = createFrostbiteRaceScene(scene);
console.log('build ms', Math.round(performance.now() - started));
for (const distance of (process.argv.slice(2).length ? process.argv.slice(2) : ['800', '4000', '6500', '13000']).map(Number)) {
  race.update(distance);
  let draws = 0, triangles = 0;
  race.group.traverse(o => {
    if (!o.isMesh) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    draws++; triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.count ?? 1);
  });
  console.log({ distance, draws, triangles: Math.round(triangles) });
}
race.dispose();
