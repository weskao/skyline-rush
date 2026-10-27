import type * as THREE from 'three';
interface Building { x: number; d: number; w: number; h: number; wrap?: number }
type Put = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, width: number, height: number, depth: number) => void;
export function updateSkyline(city: THREE.Group, buildings: THREE.InstancedMesh, windows: THREE.InstancedMesh,
  buildingData: Building[], put: Put, distance: number, center: number): void {
  city.position.set(-center * 0.6, 0, distance % 2200);
  buildingData.forEach((b, i) => {
    // Only re-upload a building's 19 transforms when it wraps behind the camera.
    const wrap = b.d < distance % 2200 ? -2200 : 0;
    if (b.wrap === wrap) return;
    b.wrap = wrap;
    const z = -b.d + wrap + 100;
    const x = b.x;
    put(buildings, i, x, b.h / 2 - 6, z, b.w, b.h, 16);
    for (let j = 0; j < 18; j++) {
      put(windows, i * 18 + j, x + (j % 3 - 1) * b.w * 0.28, 3 + Math.floor(j / 3) * (b.h - 10) / 6, z + 8.05, b.w * 0.1, 1.1, 0.05);
    }
    buildings.instanceMatrix.needsUpdate = windows.instanceMatrix.needsUpdate = true;
  });
}
