import * as THREE from 'three';
import { material, block } from './car-model.js';
import { mergeStaticMeshes } from './world-tour-batching.ts';

export const BRIDGE_TOWER = 'Bridge tower';

/** The three classic-track suspension-bridge towers; world.js poses each whole group per frame. */
export function createBridgeTowers(scene: THREE.Scene): THREE.Group[] {
  return Array.from({ length: 3 }, () => {
    const tower = new THREE.Group();
    tower.name = BRIDGE_TOWER; // browser specs find the towers by name: the cable is no longer a separate tube
    const steel = material('#233e55', 0.65, 0.4);
    const trim = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1, 1.4) });
    for (const side of [-1, 1]) {
      block(tower, steel, side * 16.5, 23, 0, 1.2, 46, 2.5);
      block(tower, trim, side * 15.85, 29, 1.3, 0.08, 32, 0.08);
      const cablePoints = Array.from({ length: 25 }, (_, i) => {
        const z = (i - 12) * 12;
        return new THREE.Vector3(side * 16.5, 9 + 34 * Math.cos(z / 288 * Math.PI) ** 2, z);
      });
      const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints), 48, 0.1, 4, false), steel);
      tower.add(cable);
      cablePoints.forEach(point => { block(tower, steel, point.x, point.y / 2, point.z, 0.045, point.y, 0.045); });
    }
    block(tower, steel, 0, 43, 0, 34, 1.7, 2.5);
    block(tower, trim, 0, 42.1, 1.3, 32, 0.08, 0.08);
    mergeStaticMeshes(tower); // 55 steel + 3 trim parts -> 2 draws; only the whole group moves
    scene.add(tower);
    return tower;
  });
}
