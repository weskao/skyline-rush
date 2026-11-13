import type * as THREE from 'three';
import { seededRng } from './rng.ts';
import { legacyClassicRoad, type ClassicRoad } from './classic-road-routes.ts';
interface Building { x: number; d: number; w: number; h: number; wrap?: number; absolute?: number; endless?: boolean; route?: ClassicRoad }
type Put = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, width: number, height: number, depth: number) => void;

// Both modes reuse the same 160-building/2880-window GPU pool and materials.
export function updateSkyline(city: THREE.Group, buildings: THREE.InstancedMesh, windows: THREE.InstancedMesh,
  data: Building[], put: Put, distance: number, center: number, seed?: number, route?: ClassicRoad): void {
  const endless = seed !== undefined, streamed = endless || !!route, road = route ?? legacyClassicRoad;
  const origin = streamed ? -road.point(Math.floor(distance / 500) * 500)[1] : 0;
  const first = Math.floor(distance / 15) - 12;
  city.position.set(streamed ? -center : -center * .6, 0, streamed ? -road.point(distance)[1] - origin : distance % 2200);
  data.forEach((b, i) => {
    const slot = first + ((i - first % data.length + data.length) % data.length);
    const wrap = streamed ? origin : b.d < distance % 2200 ? -2200 : 0;
    if (b.endless === endless && b.wrap === wrap && b.route === route && (!streamed || b.absolute === slot)) return;
    b.wrap = wrap; b.endless = endless; b.absolute = slot; b.route = route;
    let x = b.x, z = -b.d + wrap + 100, width = b.w, height = b.h;
    if (streamed) {
      const random = seededRng(seed ?? 0, 'skyline-v1:' + slot);
      const [px, pz] = road.point(slot * 15);
      x = px + (slot % 2 ? -1 : 1) * (110 + random() * 550); z = pz + origin; width = 12 + random() * 24; height = 18 + random() * 145;
    }
    put(buildings, i, x, height / 2 - 6, z, width, height, 16);
    for (let j = 0; j < 18; j++) put(windows, i * 18 + j, x + (j % 3 - 1) * width * .28,
      3 + Math.floor(j / 3) * (height - 10) / 6, z + 8.05, width * .1, 1.1, .05);
    buildings.instanceMatrix.needsUpdate = windows.instanceMatrix.needsUpdate = true;
  });
}
