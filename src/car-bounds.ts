import * as THREE from 'three';

export type ScreenBounds = { minX: number; maxX: number; minY: number; maxY: number };

/** Projects the player's car silhouette (wheels included) through a probe camera; world.js owns the showcase framing. */
export function createCarBounds(probe: THREE.PerspectiveCamera, camera: THREE.PerspectiveCamera, player: THREE.Object3D, airflow: () => THREE.Object3D) {
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  function projectedCarBounds(eye: THREE.Vector3, look: THREE.Vector3, measure = true): ScreenBounds {
    probe.fov = 50;
    probe.aspect = camera.aspect;
    probe.position.copy(eye);
    probe.lookAt(look);
    probe.updateProjectionMatrix();
    probe.updateMatrixWorld(true);
    player.updateMatrixWorld(true);
    if (measure) { box.makeEmpty(); for (const part of player.children) if (part !== airflow()) box.expandByObject(part, true); } // model only: airflow VFX spans metres
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          corner.set(x, y, z).project(probe);
          minX = Math.min(minX, corner.x); maxX = Math.max(maxX, corner.x);
          minY = Math.min(minY, corner.y); maxY = Math.max(maxY, corner.y);
        }
    return { minX, maxX, minY, maxY };
  }
  // `corner` is shared scratch: the obstruction search in world.js projects landmark corners through the same probe.
  return { projectedCarBounds, carCorner: corner };
}
