// Task 8c: draws the Sky Spiral kit (spiral-landmarks.glb) on the course sky-scene.js builds. One InstancedMesh per
// GLB node on the kit's one atlas material: twelve draws whatever the plan holds. The plan (spiral-scenery-plan.ts)
// says where each piece stands in track space; this layer only turns the placements near the car into matrices.
// While it is shown it stands in for the procedural tower, skyline and fog banks, and gives the rail trim the day
// palette; hidden (Low, a failed load) the course is exactly the procedural one.
import * as THREE from 'three';
import { SKY_LENGTH, skyPoint } from './sky-track.ts';
import { SPIRAL_NODES, SPIRAL_NODE_RADIUS, spiralSceneryPlan, type SpiralNode, type SpiralPlacement } from './spiral-scenery-plan.ts';

/** Pieces are placed out to RANGE from the car, re-chosen every SECTOR of travel (the camera's far plane is 3,000 m). */
const RANGE = 2600, SECTOR = 200;
/** The full tower inside this distance from its axis, its decimated far node beyond. */
const TOWER_NEAR = 1400;
/** emissiveIntensity under the day bloom (threshold 1.15). The GLB stores its lamps at linear luminance 0.368
 *  (assets-src/spiral-landmarks/contract.json): the blue strip, chevrons and beacons land just over the bloom, and
 *  within a fifth of it, because the tower's strip is a large lit surface beside the car (rule item 22). */
export const SPIRAL_EMISSIVE = 3.4;
/** The day trim: grey barriers and white lane dashes; the beacons take the border's blue (the look brief). */
export const SPIRAL_TRIM = Object.freeze({ rails: '#b4bcc6', lanes: '#ffffff' });

type Tinted = { color: THREE.Color };
/** The course's pieces the kit hangs on and stands in for (sky-scene.js `parts`). */
export interface SpiralKitHost {
  /** Holds the road in track space: the kit's pieces ride under it. */
  road: THREE.Object3D;
  /** Follows the tower's axis at road level of the helix entry. */
  landmark: THREE.Object3D;
  replaced: readonly { visible: boolean }[];
  trim: { accent: Tinted; beacons: Tinted; rails: Tinted; lanes: Tinted };
}

export function createSpiralKit(source: THREE.Object3D, { road, landmark, replaced, trim }: SpiralKitHost) {
  source.updateMatrixWorld(true);
  const rootInverse = source.matrixWorld.clone().invert(), meshes: THREE.InstancedMesh[] = [];
  const root = new THREE.Group(), hero = new THREE.Group();
  root.name = 'Sky Spiral kit'; hero.name = 'Sky Spiral tower';
  root.visible = hero.visible = false;
  let plan = spiralSceneryPlan(), run = 0, mode = false, sector = NaN;

  function pool(node: string, capacity: number, parent: THREE.Object3D): THREE.InstancedMesh {
    const mesh = source.getObjectByName(node) as THREE.Mesh | undefined;
    if (!mesh?.isMesh) throw new Error(`node ${node} is missing`);
    const made = new THREE.InstancedMesh(mesh.geometry, mesh.material, Math.max(1, capacity));
    made.name = node;
    made.frustumCulled = false; // instances span the whole view; the pool's bounds would be stale
    made.userData.local = rootInverse.clone().multiply(mesh.matrixWorld); // the node's own (dequantization) transform
    made.count = 0;
    parent.add(made); meshes.push(made);
    return made;
  }
  const pools = new Map<SpiralNode, THREE.InstancedMesh>(SPIRAL_NODES.map(node => [node, pool(node, plan.filter(p => p.node === node).length, root)]));
  const tower = pool('tower', 1, hero), towerFar = pool('tower_far', 1, hero);
  for (const mesh of [tower, towerFar]) { mesh.setMatrixAt(0, mesh.userData.local); mesh.count = 1; }
  for (const { material } of meshes) (material as THREE.MeshStandardMaterial).emissiveIntensity = SPIRAL_EMISSIVE;
  const mounds = SPIRAL_NODES.filter(node => node.startsWith('cloud_')).map(node => pools.get(node)!);
  road.add(root); landmark.add(hero);
  const procedural = { beacons: trim.beacons.color.clone(), rails: trim.rails.color.clone(), lanes: trim.lanes.color.clone() };

  const at = new THREE.Object3D(), matrix = new THREE.Matrix4();
  /** The placements within reach of the car at (x, z), written from index 0; the rest are not drawn. */
  function place(placements: readonly SpiralPlacement[], x: number, z: number): void {
    for (const mesh of pools.values()) mesh.count = 0;
    for (const p of placements) {
      const mesh = pools.get(p.node)!, reach = RANGE + SPIRAL_NODE_RADIUS[p.node] * p.scale;
      if ((p.x - x) ** 2 + (p.z - z) ** 2 > reach * reach || mesh.count === mesh.instanceMatrix.count) continue;
      at.position.set(p.x, p.y, p.z); at.rotation.y = p.yaw; at.scale.setScalar(p.scale); at.updateMatrix();
      mesh.setMatrixAt(mesh.count++, matrix.multiplyMatrices(at.matrix, mesh.userData.local));
    }
    for (const mesh of pools.values()) mesh.instanceMatrix.needsUpdate = true;
  }

  /** Shown, the kit replaces the procedural tower, skyline and fog banks; hidden, they are back as they were. */
  function show(on: boolean): void {
    root.visible = hero.visible = on;
    // sky-scene.js writes .visible on these every frame, so they are hidden through their materials (rule item 28).
    for (const material of replaced) material.visible = !on;
    trim.beacons.color.copy(on ? trim.accent.color : procedural.beacons);
    if (on) { trim.rails.color.set(SPIRAL_TRIM.rails); trim.lanes.color.set(SPIRAL_TRIM.lanes); }
    else { trim.rails.color.copy(procedural.rails); trim.lanes.color.copy(procedural.lanes); }
  }

  return {
    show,
    /** The kit's cloud mounds: off while the cloud sea stands in for them (spiral-clouds.ts, High and Ultra). */
    clouds(on: boolean): void { for (const mesh of mounds) mesh.visible = on; },
    /** Per frame while shown, after sky-scene.js has moved the road and the landmark for `distance`. */
    stream(distance: number, endless: boolean): void {
      const lap = endless ? Math.floor(distance / SKY_LENGTH) : 0, here = Math.floor(distance / SECTOR);
      if (lap !== run || endless !== mode) { plan = spiralSceneryPlan(run = lap, mode = endless); sector = NaN; }
      if (here !== sector) {
        const origin = skyPoint(distance, endless);
        place(plan, origin.x, origin.z);
        sector = here;
      }
      tower.visible = landmark.position.lengthSq() < TOWER_NEAR * TOWER_NEAR;
      towerFar.visible = !tower.visible;
    },
    /** Frees the instance buffers only: the GLB's geometry and material belong to the model cache. */
    dispose(): void {
      show(false);
      root.removeFromParent(); hero.removeFromParent();
      for (const mesh of meshes) mesh.dispose();
    },
  };
}
export type SpiralKit = ReturnType<typeof createSpiralKit>;
