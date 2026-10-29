// Draws race.hazards exactly where the simulation resolves them, from bounded pooled meshes.
// ENV-05/06: one pool per effect, so colour AND silhouette tell players what a hazard does:
// walls are tinted boxes, gusts are cyan arrows pointing the way they shove, ice/rough ground is a
// pale sheet on the road. Every pool is attached at setup (count 0) so shader warm-up builds it.
import * as THREE from 'three';
import { hazardPose, type RaceHazard } from './hazard-race.ts';
import { OBJECT_CATALOG } from './object-catalog.ts';

type Vec3 = [number, number, number] | number[];
type Instances = (geometry: THREE.BufferGeometry, material: THREE.Material, count: number, scene: THREE.Scene) => THREE.InstancedMesh;
type Put = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, angle?: number) => void;
/** Road-local position of lateral x / height y at road distance s, relative to the camera origin. */
type Place = (trackId: string, s: number, x: number, y: number, origin: number, center: number) => Vec3;
interface HazardRace { hazards: RaceHazard[]; elapsed: number }
type Pool = 'block' | 'push' | 'slow';

/** Instances per pool; tests/hazard-render.test.js proves every course's busiest visible stretch fits. */
export const HAZARD_POOLS: Readonly<Record<Pool, number>> = Object.freeze({ block: 24, push: 8, slow: 8 });
const BEHIND = 16, AHEAD = 550; // m drawn around the camera
const POOL_OF: Partial<Record<string, Pool>> = { block: 'block', push: 'push', slow: 'slow' };

// instances/put are world.js's pooled InstancedMesh helpers.
export function createHazardRenderer(scene: THREE.Scene, box: THREE.BufferGeometry, instances: Instances, put: Put, place: Place) {
  const barriers = instances(box, new THREE.MeshBasicMaterial({ color: '#ff946f' }), HAZARD_POOLS.block, scene);
  // A 4-sided cone laid on its side points +x; put()'s angle turns it to face the shove direction.
  const arrow = new THREE.ConeGeometry(0.5, 1, 4).rotateZ(-Math.PI / 2);
  const gusts = instances(arrow, new THREE.MeshBasicMaterial({ color: '#6fe3ff' }), HAZARD_POOLS.push, scene);
  const surfaces = instances(box, new THREE.MeshBasicMaterial({ color: '#d4f1ff' }), HAZARD_POOLS.slow, scene);
  barriers.name = 'gauntlet-barriers'; gusts.name = 'hazard-gusts'; surfaces.name = 'hazard-surfaces';
  barriers.count = gusts.count = surfaces.count = 0;
  const pools = { block: barriers, push: gusts, slow: surfaces };
  const used = { block: 0, push: 0, slow: 0 };
  return {
    setTrack(trackId: string) {
      (barriers.material as THREE.MeshBasicMaterial).color.set(trackId === 'cosmic' || trackId === 'spiral' ? '#ed87fa' : trackId === 'aurora' || trackId === 'alpine' ? '#ffcf81' : '#ff946f');
    },
    update(race: HazardRace, trackId: string, distance: number, center: number, preview: boolean) {
      used.block = used.push = used.slow = 0;
      // Bounded and allocation-free apart from place()'s position: hazards are sorted by distance, so a
      // full pool could only drop the farthest, and the capacity test keeps every course below that.
      if (!preview) for (const hazard of race.hazards) {
        if (hazard.distance < distance - BEHIND) continue;
        if (hazard.distance > distance + AHEAD) break;
        const pool = hazard.placement ? POOL_OF[OBJECT_CATALOG[hazard.placement.type].effect] : 'block';
        if (!pool || used[pool] >= HAZARD_POOLS[pool]) continue; // triggers (checkpoints, markers) are never walls
        const { x, altitude, active } = hazardPose(hazard, race.elapsed); if (!active) continue; // drawn exactly when solid
        const h = hazard.height ?? 2.5, w = hazard.halfWidth ? hazard.halfWidth * 2 : 3.1, l = hazard.halfLength ? hazard.halfLength * 2 : 1.3;
        if (pool === 'block') { const xyz = place(trackId, hazard.distance, x, altitude + h / 2, distance, center); put(barriers, used.block++, xyz[0], xyz[1], xyz[2], w, h, l); }
        else if (pool === 'slow') { const xyz = place(trackId, hazard.distance, x, altitude + 0.03, distance, center); put(surfaces, used.slow++, xyz[0], xyz[1], xyz[2], w, 0.06, l); }
        else { const xyz = place(trackId, hazard.distance, x, altitude + 1.6, distance, center); put(gusts, used.push++, xyz[0], xyz[1], xyz[2], 2.4, 1.2, 1.2, hazard.placement!.seed % 2 ? 0 : Math.PI); }
      }
      for (const pool of ['block', 'push', 'slow'] as const) {
        pools[pool].count = used[pool];
        if (used[pool]) pools[pool].instanceMatrix.needsUpdate = true;
      }
    },
  };
}
