// Draws race.hazards exactly where the simulation resolves them, from bounded pooled meshes.
import * as THREE from 'three';
import { hazardPose, type RaceHazard } from './hazard-race.ts';

type Vec3 = [number, number, number] | number[];
type Instances = (geometry: THREE.BufferGeometry, material: THREE.Material, count: number, scene: THREE.Scene) => THREE.InstancedMesh;
type Put = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, angle?: number) => void;
/** Road-local position of lateral x / height y at road distance s, relative to the camera origin. */
type Place = (trackId: string, s: number, x: number, y: number, origin: number, center: number) => Vec3;
interface HazardRace { hazards: RaceHazard[]; elapsed: number }

// instances/put are world.js's pooled InstancedMesh helpers.
export function createHazardRenderer(scene: THREE.Scene, box: THREE.BufferGeometry, instances: Instances, put: Put, place: Place) {
  const barriers = instances(box, new THREE.MeshBasicMaterial({ color: '#ff946f' }), 24, scene);
  barriers.name = 'gauntlet-barriers'; barriers.count = 0;
  return {
    setTrack(trackId: string) {
      (barriers.material as THREE.MeshBasicMaterial).color.set(trackId === 'cosmic' || trackId === 'spiral' ? '#ed87fa' : trackId === 'aurora' || trackId === 'alpine' ? '#ffcf81' : '#ff946f');
    },
    update(race: HazardRace, trackId: string, distance: number, center: number, preview: boolean) {
      // Bounded InstancedMesh: one distinct marker per reachable barrier,
      // no scene allocations or three.js collision checks on the hot path.
      let visibleHazards = 0;
      if (!preview && race.hazards.length) for (const hazard of race.hazards) {
        if (hazard.distance < distance - 16 || hazard.distance > distance + 550) continue;
        if (visibleHazards >= barriers.instanceMatrix.count) break;
        const { x, altitude, active } = hazardPose(hazard, race.elapsed); if (!active) continue; // drawn exactly when solid
        const h = hazard.height ?? 2.5, xyz = place(trackId, hazard.distance, x, altitude + h / 2, distance, center);
        put(barriers, visibleHazards++, xyz[0], xyz[1], xyz[2], hazard.halfWidth ? hazard.halfWidth * 2 : 3.1, h, hazard.halfLength ? hazard.halfLength * 2 : 1.3);
      }
      barriers.count = visibleHazards;
      if (visibleHazards) barriers.instanceMatrix.needsUpdate = true;
    },
  };
}
