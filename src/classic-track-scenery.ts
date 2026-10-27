import * as THREE from 'three';
import type { VfxQuality } from './vfx-settings.ts';

// Additional artwork only: the live road, collisions and saved ghosts remain unchanged.
export const CLASSIC_SCENIC_TRACKS = ['neon', 'canyon', 'aurora'] as const;
type Theme = typeof CLASSIC_SCENIC_TRACKS[number];
const DENSITY: Record<VfxQuality, number> = { low: 8, medium: 16, high: 24 };
const TOTAL = DENSITY.high, STEP = 60;
type Mesh = THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
interface Kit {
  group: THREE.Group;
  meshes: [Mesh, Mesh];
  slots: number[];
  initialized: boolean;
  previousQuality: VfxQuality | null;
}
const THEMES: Record<Theme, { body: string; trim: string }> = {
  neon: { body: '#33475b', trim: '#6aa6c6' },
  canyon: { body: '#956b53', trim: '#c19d77' },
  aurora: { body: '#42665e', trim: '#bbcbd0' },
};

export function createClassicTrackScenery(scene: THREE.Scene, roadCenter: (distance: number) => number) {
  const kits = {} as Record<Theme, Kit>;
  const groups = {} as Record<Theme, THREE.Group>;
  const position = new THREE.Vector3(), rotation = new THREE.Quaternion();
  const size = new THREE.Vector3(), matrix = new THREE.Matrix4();
  const compose = (mesh: Mesh, index: number, x: number, y: number, z: number,
    sx: number, sy: number, sz: number): void => {
    position.set(x, y, z); size.set(sx, sy, sz);
    matrix.compose(position, rotation, size);
    mesh.setMatrixAt(index, matrix);
  };
  for (const id of CLASSIC_SCENIC_TRACKS) {
    const group = new THREE.Group();
    group.name = `Phase 4 ${id} roadside details`;
    group.visible = false;
    scene.add(group);
    groups[id] = group;
    const bodyGeometry = id === 'neon' ? new THREE.BoxGeometry(1, 1, 1)
      : id === 'canyon' ? new THREE.DodecahedronGeometry(1, 0) : new THREE.ConeGeometry(1, 1, 7);
    const trimGeometry = id === 'aurora' ? new THREE.CylinderGeometry(.18, .23, 1, 5)
      : new THREE.BoxGeometry(1, 1, 1);
    const color = THEMES[id];
    const material = (hex: string) => new THREE.MeshStandardMaterial({
      color: hex, roughness: id === 'neon' ? .78 : .94, metalness: id === 'neon' ? .06 : 0,
    });
    const meshes = [new THREE.InstancedMesh(bodyGeometry, material(color.body), TOTAL),
      new THREE.InstancedMesh(trimGeometry, material(color.trim), TOTAL)] as [Mesh, Mesh];
    for (const mesh of meshes) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    kits[id] = { group, meshes, slots: Array(TOTAL).fill(NaN), initialized: false, previousQuality: null };
  }
  const place = (id: Theme, index: number, distance: number): void => {
    const side = index % 2 ? 1 : -1;
    const x = roadCenter(distance) + side * (49 + (index * 11 % 33));
    const z = -distance;
    const [body, trim] = kits[id].meshes;
    if (id === 'neon') {
      const height = 28 + index % 7 * 7;
      compose(body, index, x, height / 2, z, 14 + index % 3 * 3, height, 14);
      compose(trim, index, x, height + .8, z, 15 + index % 3 * 3, 1.6, 15);
    } else if (id === 'canyon') {
      const height = 21 + index % 5 * 6;
      compose(body, index, x, height * .44, z, 14 + index % 3 * 4, height, 19);
      compose(trim, index, x, height * .86, z, 18 + index % 3 * 3, 2.3, 21);
    } else {
      const height = 18 + index % 5 * 3.2;
      compose(body, index, x, height / 2 + 2, z, height * .31, height, height * .31);
      compose(trim, index, x, 2.4, z, 2.1, 7, 2.1);
    }
  };
  return {
    groups,
    update(trackId: string, distance: number, quality: VfxQuality): void {
      for (const id of CLASSIC_SCENIC_TRACKS) groups[id].visible = id === trackId;
      if (!CLASSIC_SCENIC_TRACKS.some(id => id === trackId) || !Number.isFinite(distance)) return;
      const id = trackId as Theme, kit = kits[id];
      const first = (Math.floor(distance / STEP) - 2) * STEP;
      let moved = !kit.initialized;
      for (let i = 0; i < TOTAL; i++) {
        let d = kit.initialized ? kit.slots[i] : first + i * STEP;
        while (d < first) d += TOTAL * STEP;
        if (d !== kit.slots[i]) { kit.slots[i] = d; place(id, i, d); moved = true; }
      }
      kit.initialized = true;
      for (const mesh of kit.meshes) {
        mesh.count = DENSITY[quality];
        if (moved || kit.previousQuality !== quality) mesh.instanceMatrix.needsUpdate = true;
      }
      kit.previousQuality = quality;
      kit.group.position.set(-roadCenter(distance), 0, distance);
    },
    hide(): void { for (const id of CLASSIC_SCENIC_TRACKS) groups[id].visible = false; },
    dispose(): void {
      for (const id of CLASSIC_SCENIC_TRACKS) {
        const kit = kits[id];
        scene.remove(kit.group);
        for (const mesh of kit.meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
      }
    },
  };
}
