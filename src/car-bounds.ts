import * as THREE from 'three';

export type ScreenBounds = { minX: number; maxX: number; minY: number; maxY: number };

/** Projects the player's car silhouette (wheels included) through a probe camera; world.js owns the showcase framing. */
export function createCarBounds(probe: THREE.PerspectiveCamera, camera: THREE.PerspectiveCamera, player: THREE.Object3D, airflow: () => THREE.Object3D) {
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  /** `host` measures another car (a Coming Soon stage draws its own, never `player`) and skips that car's airflow group. */
  function projectedCarBounds(eye: THREE.Vector3, look: THREE.Vector3, measure = true, host?: { car: THREE.Object3D; keep: THREE.Object3D }): ScreenBounds {
    probe.fov = 50;
    probe.aspect = camera.aspect;
    probe.view = camera.view;
    probe.position.copy(eye);
    probe.lookAt(look);
    probe.updateProjectionMatrix();
    probe.updateMatrixWorld(true);
    if (measure) {
      const car = host?.car ?? player, skip = host?.keep ?? airflow();
      car.updateMatrixWorld(true);
      box.makeEmpty();
      for (const part of car.children) if (part !== skip) box.expandByObject(part, true);
    }
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
  // The framing search also projects landmark vertices through this probe.
  return { projectedCarBounds, carCorner: corner };
}
