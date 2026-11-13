import type { BufferGeometry, InstancedMesh, Mesh } from 'three';
import { setRoadRow } from './geometry.ts';
import type { ClassicRoad } from './classic-road-routes.ts';
import type { TrackConfig } from './game-types.ts';

type Put = (mesh: InstancedMesh, index: number, x: number, y: number, z: number,
  width: number, height: number, depth: number, yaw?: number) => void;
type Section = TrackConfig['sections'][number];
interface RoadMeshes {
  road: Mesh<BufferGeometry>; laneLines: InstancedMesh; curbs: InstancedMesh; edgeLines: InstancedMesh;
  railLights: InstancedMesh; tunnelRoofs: InstancedMesh; tunnelWalls: InstancedMesh; shortcutDeck: InstancedMesh;
  surfaceMarks: InstancedMesh;
}

const STEP = 12;
const ROAD_HALF = 12;

export function createClassicRoadRender(meshes: RoadMeshes, segments: number, put: Put, shortcutTolerance: number) {
  const { road, laneLines, curbs, edgeLines, railLights, tunnelRoofs, tunnelWalls, shortcutDeck, surfaceMarks } = meshes;
  const batch = Object.values(meshes), geometry = road.geometry, baseIndices = geometry.index!.array.slice();
  let activeRoute: ClassicRoad | undefined, activeTrack: string, activeSections: readonly Section[], activeTile: number, activeSparse: boolean;

  function strip(mesh: InstancedMesh, index: number, route: ClassicRoad, origin: readonly [number, number],
    start: number, end: number, lane: number, y: number, width: number, height: number, overlap = .15) {
    const a = route.point(start, lane), b = route.point(end, lane);
    const dx = b[0] - a[0], dz = b[1] - a[1];
    put(mesh, index, (a[0] + b[0]) / 2 - origin[0], y, (a[1] + b[1]) / 2 - origin[1],
      width, height, Math.hypot(dx, dz) + overlap, -Math.atan2(dx, -dz));
  }

  function rebuild(route: ClassicRoad, tile: number, sections: readonly Section[], sparse: boolean, curved: boolean) {
    const origin = route.point(tile), index = geometry.index!;
    const start = tile - 5 * STEP;
    const boundaries = new Map<number, number>();
    for (const section of sections) for (const distance of [section.from, section.to]) {
      boundaries.set(Math.round(distance / STEP) * STEP, distance);
    }
    const row = (i: number) => boundaries.get(start + i * STEP) ?? start + i * STEP;
    for (let i = 0; i <= segments; i++) {
      const d = row(i), next = row(i + 1);
      const [x, z] = route.point(d);
      setRoadRow(geometry, i, x - origin[0], z - origin[1], d, tile, ROAD_HALF, curved ? route.heading(d) : 0);
      if (i === segments) break;
      const section = sections.find(s => (d + next) / 2 >= s.from && (d + next) / 2 < s.to);
      const gap = section?.type === 'gap';
      for (let j = 0; j < 6; j++) index.array[i * 6 + j] = gap ? 0 : baseIndices[i * 6 + j]!;
      // Keep boxed sections overlapped so the inside wall stays solid through a turn.
      if (tunnelRoofs.visible) {
        const tunnel = section?.type === 'tunnel';
        strip(tunnelRoofs, i, route, origin, d, next, 0, tunnel ? 4.25 : -1000, 24, .5, 1);
        for (const side of [-1, 1]) strip(tunnelWalls, i * 2 + (side + 1) / 2, route, origin, d, next,
          side * 12.6, tunnel ? 2 : -1000, 1, 4, 1);
      }
      const deck = section?.type === 'shortcut' && (i % 2 === 0 || !sparse);
      strip(shortcutDeck, i, route, origin, d, next, deck ? section.x ?? 0 : 0,
        deck ? (section.altitude ?? 0) - shortcutTolerance : -1000, 6, .12);
      if (surfaceMarks.visible) {
        const uphill = section?.type === 'uphill', marked = uphill || section?.type === 'ice';
        strip(surfaceMarks, i, route, origin, d, uphill ? d + 3 : next, 0,
          marked ? .035 : -1000, uphill ? 1.2 : 23, .025);
      }
      for (let lane = 0; lane < 3; lane++) strip(laneLines, i * 3 + lane, route, origin, d, Math.min(d + 4.7, next),
        (lane - 1) * 5, gap ? -1000 : .018, .11, .02, 0);
      for (const side of [-1, 1]) {
        const at = i * 2 + (side + 1) / 2;
        strip(curbs, at, route, origin, d, next, side * 12.4, gap ? -1000 : .38, .55, .76);
        strip(edgeLines, at, route, origin, d, next, side * 11.5, gap ? -1000 : .023, .12, .02);
        strip(railLights, at, route, origin, d, next, side * 12.1, gap ? -1000 : .68, .045, .04);
      }
    }
    geometry.attributes.position!.needsUpdate = geometry.attributes.uv!.needsUpdate = index.needsUpdate = true;
    for (const mesh of [laneLines, curbs, edgeLines, railLights, shortcutDeck, surfaceMarks, tunnelRoofs, tunnelWalls]) {
      if (mesh.visible) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  return {
    update(track: string, route: ClassicRoad, distance: number, sections: readonly Section[], sparse: boolean, curved: boolean) {
      const tile = Math.floor(distance / STEP) * STEP;
      if (tile !== activeTile || track !== activeTrack || route !== activeRoute || sections !== activeSections || sparse !== activeSparse) {
        rebuild(route, tile, sections, sparse, curved);
        activeTile = tile; activeTrack = track; activeRoute = route; activeSections = sections; activeSparse = sparse;
      }
      const [x, z] = route.point(distance), [originX, originZ] = route.point(tile);
      for (const mesh of batch) mesh.position.set(originX - x, 0, originZ - z);
    },
  };
}
