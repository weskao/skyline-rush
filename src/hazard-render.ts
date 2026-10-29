// Draws race.hazards exactly where the simulation resolves them, from bounded pooled meshes.
// ENV-05/06: one pool per effect, so colour AND silhouette tell players what a hazard does:
// walls are tinted boxes, gusts are cyan arrows pointing the way they shove, ice/rough ground is a
// pale plate with dark raised stripes on the road, branch markers are a dark road-wide gantry with an amber
// arrow toward the risky line. No decorative motion: only the simulated pose moves,
// so reduced motion has nothing to freeze here. Every pool is attached at setup (count 0) so shader warm-up builds it.
import * as THREE from 'three';
import { hazardPose, riskySide, type RaceHazard } from './hazard-race.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OBJECT_CATALOG } from './object-catalog.ts';

type Vec3 = [number, number, number] | number[];
type Instances = (geometry: THREE.BufferGeometry, material: THREE.Material, count: number, scene: THREE.Scene) => THREE.InstancedMesh;
type Put = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, angle?: number) => void;
/** Road-local position of lateral x / height y at road distance s, relative to the camera origin. */
type Place = (trackId: string, s: number, x: number, y: number, origin: number, center: number) => Vec3;
interface HazardRace { hazards: RaceHazard[]; elapsed: number }
type Pool = 'block' | 'push' | 'slow' | 'marker';

/** Instances per pool; tests/hazard-render.test.js proves every course's busiest visible stretch fits. */
export const HAZARD_POOLS: Readonly<Record<Pool, number>> = Object.freeze({ block: 24, push: 8, slow: 8, marker: 4 });
const BEHIND = 16, AHEAD = 550; // m drawn around the camera
const POOL_OF: Partial<Record<string, Pool>> = { block: 'block', push: 'push', slow: 'slow' };
const poolOf = (h: RaceHazard): Pool | undefined => !h.placement ? 'block'
  : h.placement.type === 'branch-marker' ? 'marker' : POOL_OF[OBJECT_CATALOG[h.placement.type].effect];

const tint = (geometry: THREE.BufferGeometry, rgb: [number, number, number]) => {
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: geometry.attributes.position.count }, () => rgb).flat(), 3));
  return geometry;
};

// Unit plate with four raised cross-stripes, coloured per vertex (no texture): pale plate, dark stripes. The
// silhouette and the brightness contrast both tell ice/rough ground apart from walls without relying on hue.
function stripedPlate(): THREE.BufferGeometry {
  const plate = tint(new THREE.BoxGeometry(1, 0.5, 1).translate(0, -0.25, 0), [0.83, 0.95, 1]);
  const stripes = [-0.375, -0.125, 0.125, 0.375].map(z => tint(new THREE.BoxGeometry(0.9, 1, 0.08).translate(0, 0, z), [0.18, 0.36, 0.5]));
  return mergeGeometries([plate, ...stripes])!;
}

// A full-size gantry over the 20 m road: two posts, a beam 5.4 m up and an arrow pointing +x (turned for the left).
function gantry(): THREE.BufferGeometry {
  const dark: [number, number, number] = [0.14, 0.16, 0.2];
  const parts = [-10.2, 10.2].map(x => tint(new THREE.BoxGeometry(0.3, 5.8, 0.3).translate(x, 2.9, 0), dark));
  parts.push(tint(new THREE.BoxGeometry(20.7, 0.5, 0.3).translate(0, 5.6, 0), dark));
  parts.push(tint(new THREE.ConeGeometry(0.7, 2.4, 4).rotateZ(-Math.PI / 2).translate(5, 4.6, 0), [1, 0.78, 0.2]));
  return mergeGeometries(parts)!;
}

// instances/put are world.js's pooled InstancedMesh helpers.
export function createHazardRenderer(scene: THREE.Scene, box: THREE.BufferGeometry, instances: Instances, put: Put, place: Place) {
  const barriers = instances(box, new THREE.MeshBasicMaterial({ color: '#ff946f' }), HAZARD_POOLS.block, scene);
  // A 4-sided cone laid on its side points +x; put()'s angle turns it to face the shove direction.
  const arrow = new THREE.ConeGeometry(0.5, 1, 4).rotateZ(-Math.PI / 2);
  const gusts = instances(arrow, new THREE.MeshBasicMaterial({ color: '#6fe3ff' }), HAZARD_POOLS.push, scene);
  const surfaces = instances(stripedPlate(), new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true }), HAZARD_POOLS.slow, scene);
  const markers = instances(gantry(), new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true }), HAZARD_POOLS.marker, scene);
  barriers.name = 'gauntlet-barriers'; gusts.name = 'hazard-gusts'; surfaces.name = 'hazard-surfaces'; markers.name = 'hazard-markers';
  barriers.count = gusts.count = surfaces.count = markers.count = 0;
  const pools = { block: barriers, push: gusts, slow: surfaces, marker: markers };
  const used = { block: 0, push: 0, slow: 0, marker: 0 };
  const pose = { x: 0, altitude: 0, active: true }; // rewritten per hazard by hazardPose: no object per hazard per frame
  return {
    setTrack(trackId: string) {
      (barriers.material as THREE.MeshBasicMaterial).color.set(trackId === 'cosmic' || trackId === 'spiral' ? '#ed87fa' : trackId === 'aurora' || trackId === 'alpine' ? '#ffcf81' : '#ff946f');
    },
    update(race: HazardRace, trackId: string, distance: number, center: number, preview: boolean) {
      used.block = used.push = used.slow = used.marker = 0;
      // Bounded and allocation-free apart from place()'s position: hazards are sorted by distance, so a
      // full pool could only drop the farthest, and the capacity test keeps every course below that.
      if (!preview) for (const hazard of race.hazards) {
        if (hazard.distance < distance - BEHIND) continue;
        if (hazard.distance > distance + AHEAD) break;
        const pool = poolOf(hazard);
        if (!pool || used[pool] >= HAZARD_POOLS[pool]) continue; // other triggers (checkpoints) are never drawn
        const { x, altitude, active } = hazardPose(hazard, race.elapsed, pose); if (!active) continue; // drawn exactly when solid
        const h = hazard.height ?? 2.5, w = hazard.halfWidth ? hazard.halfWidth * 2 : 3.1, l = hazard.halfLength ? hazard.halfLength * 2 : 1.3;
        if (pool === 'block') { const xyz = place(trackId, hazard.distance, x, altitude + h / 2, distance, center); put(barriers, used.block++, xyz[0], xyz[1], xyz[2], w, h, l); }
        else if (pool === 'slow') { const xyz = place(trackId, hazard.distance, x, altitude + 0.03, distance, center); put(surfaces, used.slow++, xyz[0], xyz[1], xyz[2], w, 0.06, l); }
        else if (pool === 'marker') { const xyz = place(trackId, hazard.distance, 0, altitude, distance, center); put(markers, used.marker++, xyz[0], xyz[1], xyz[2], 1, 1, 1, riskySide(hazard) > 0 ? 0 : Math.PI); }
        else { const xyz = place(trackId, hazard.distance, x, altitude + 1.6, distance, center); put(gusts, used.push++, xyz[0], xyz[1], xyz[2], 2.4, 1.2, 1.2, hazard.placement!.seed % 2 ? 0 : Math.PI); }
      }
      for (const pool of ['block', 'push', 'slow', 'marker'] as const) {
        pools[pool].count = used[pool];
        if (used[pool]) pools[pool].instanceMatrix.needsUpdate = true;
      }
    },
  };
}
