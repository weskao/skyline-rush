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
  meshes: [Mesh, Mesh, Mesh, Mesh];
  slots: number[];
  initialized: boolean;
  previousQuality: VfxQuality | null;
  previousFirst: number | null;
}
const THEMES: Record<Theme, { body: string; trim: string; accent: string; detail: string; name: string }> = {
  neon: { body: '#33475b', trim: '#6aa6c6', accent: '#80e9ff', detail: '#c98a5e', name: 'billboards' },
  canyon: { body: '#956b53', trim: '#c19d77', accent: '#e9b887', detail: '#d8d3c4', name: 'service vans' },
  aurora: { body: '#42665e', trim: '#bbcbd0', accent: '#e1f0f1', detail: '#59616b', name: 'spectator stands' },
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
    const accentGeometry = id === 'aurora' ? new THREE.ConeGeometry(1, 1, 7)
      : new THREE.BoxGeometry(1, 1, 1);
    const color = THEMES[id];
    const material = (hex: string) => new THREE.MeshStandardMaterial({
      color: hex, roughness: id === 'neon' ? .78 : .94, metalness: id === 'neon' ? .06 : 0,
    });
    // Third instanced layer provides recognizable skyline signs, rock strata or snow tips
    // without per-prop draw calls, transparent surfaces or particles.
    const accent = material(color.accent);
    if (id === 'neon') {
      accent.emissive.set('#4eb3dc');
      accent.emissiveIntensity = .4;
    }
    const meshes = [new THREE.InstancedMesh(bodyGeometry, material(color.body), TOTAL),
      new THREE.InstancedMesh(trimGeometry, material(color.trim), TOTAL),
      new THREE.InstancedMesh(accentGeometry, accent, TOTAL),
      // Fourth layer: human-scale roadside life (billboards, parked service vans, spectator stands).
      new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material(color.detail), TOTAL)] as [Mesh, Mesh, Mesh, Mesh];
    meshes[3].name = `${id} ${color.name}`;
    for (const mesh of meshes) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    kits[id] = { group, meshes, slots: Array(TOTAL).fill(NaN), initialized: false, previousQuality: null, previousFirst: null };
  }
  const place = (id: Theme, index: number, distance: number): void => {
    const side = index % 2 ? 1 : -1;
    const x = roadCenter(distance) + side * (49 + (index * 11 % 33));
    const z = -distance;
    const [body, trim, accent, detail] = kits[id].meshes;
    // Same sector, opposite kerb from the skyline body, still 30 m+ clear of the road.
    const near = roadCenter(distance) - side * (38 + index % 4 * 3), dz = z;
    if (id === 'neon') compose(detail, index, near, 12, dz, .8, 7, 14);
    else if (id === 'canyon') compose(detail, index, near, 1.3, dz, 2.6, 2.6, 6);
    else compose(detail, index, near, 2, dz, 6, 4, 16);
    if (id === 'neon') {
      const height = 28 + index % 7 * 7;
      const width = 14 + index % 3 * 3;
      compose(body, index, x, height / 2, z, width, height, 14);
      compose(trim, index, x, height + .8, z, width + 1, 1.6, 15);
      // A thin illuminated fascia faces the driveable corridor.
      compose(accent, index, x - side * (width / 2 + .3), height * .63, z, .35, height * .48, 5);
    } else if (id === 'canyon') {
      const height = 21 + index % 5 * 6;
      compose(body, index, x, height * .44, z, 14 + index % 3 * 4, height, 19);
      compose(trim, index, x, height * .86, z, 18 + index % 3 * 3, 2.3, 21);
      compose(accent, index, x - side * 1.2, height * .68, z, 14 + index % 3 * 3, 1.7, 17);
    } else {
      const height = 18 + index % 5 * 3.2;
      compose(body, index, x, height / 2 + 2, z, height * .31, height, height * .31);
      compose(trim, index, x, 2.4, z, 2.1, 7, 2.1);
      compose(accent, index, x, 2 + height * .84, z, height * .20, height * .30, height * .20);
    }
  };
  return {
    groups,
    update(trackId: string, distance: number, quality: VfxQuality): void {
      for (const id of CLASSIC_SCENIC_TRACKS) groups[id].visible = id === trackId;
      if (!CLASSIC_SCENIC_TRACKS.some(id => id === trackId) || !Number.isFinite(distance)) return;
      const id = trackId as Theme, kit = kits[id];
      const first = (Math.floor(distance / STEP) - 2) * STEP;
      const active = DENSITY[quality];
      // The ring capacity must match the VISIBLE tier. Cycling all 24 slots
      // while drawing only 8 leaves low-tier players staring at empty gaps.
      const rebuild = !kit.initialized || kit.previousQuality !== quality
        || (kit.previousFirst !== null && first < kit.previousFirst);
      let moved = rebuild;
      for (let i = 0; i < active; i++) {
        let d = rebuild ? first + i * STEP : kit.slots[i];
        if (d < first) d += Math.ceil((first - d) / (active * STEP)) * active * STEP;
        if (d !== kit.slots[i]) { kit.slots[i] = d; place(id, i, d); moved = true; }
      }
      kit.initialized = true;
      kit.previousFirst = first;
      for (const mesh of kit.meshes) {
        mesh.count = active;
        if (moved) mesh.instanceMatrix.needsUpdate = true;
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
