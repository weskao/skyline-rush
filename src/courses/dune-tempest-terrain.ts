import * as THREE from 'three';
import { routeLength, sampleRoute } from '../course-route-frame.ts';
import { PLAYABLE_COURSE_GRAPH as graph, DUNE_TEMPEST_RUNTIME_METADATA as metadata } from './dune-tempest-runtime-adapter.ts';

const TILE = 192, CELL = 8, REACH = 145, VISIBLE_RANGE = 1200;
type RoadSample = { x: number; y: number; z: number; halfWidth: number; floor?: number };

function terrainSamples() {
  const roads = new Map<string, RoadSample[]>();
  const tiles = new Set<string>();
  for (const edge of graph.edges) {
    const length = routeLength(graph, edge.id);
    const flight = metadata.flightShortcuts.find(shortcut => shortcut.edgeId === edge.id);
    const from = graph.nodes.find(node => node.id === edge.from)!;
    const to = graph.nodes.find(node => node.id === edge.to)!;
    const baseY = Math.min(from.at[1], to.at[1]);
    const count = Math.ceil(length / CELL);
    for (let i = 0; i <= count; i++) {
      const s = length * i / count, { point: [x, y, z] } = sampleRoute(graph, edge.id, s);
      const air = flight && !flight.solidRoadIntervals.some(([from, to]) => s >= from && s <= to);
      const floor = air ? Math.min(baseY - 25 - 42 * Math.sin(Math.PI * s / length) ** 2, y - 40) : undefined;
      const key = `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`;
      const list = roads.get(key) ?? [];
      list.push({ x, y, z, halfWidth: edge.width / 2, floor });
      roads.set(key, list);
      for (let tx = Math.floor((x - REACH) / TILE); tx <= Math.floor((x + REACH) / TILE); tx++) {
        for (let tz = Math.floor((z - REACH) / TILE); tz <= Math.floor((z + REACH) / TILE); tz++) {
          tiles.add(`${tx},${tz}`);
        }
      }
    }
  }
  return { roads, tiles };
}

function duneHeight(x: number, z: number, samples: readonly RoadSample[]): number {
  let edge = Infinity, ceiling = Infinity, roadY = 8;
  let chasmDistance = Infinity, chasmFloor = 8;
  for (const point of samples) {
    const distance = Math.hypot(x - point.x, z - point.z);
    if (point.floor !== undefined) {
      if (distance < chasmDistance) {
        chasmDistance = distance;
        chasmFloor = point.floor;
      }
      continue;
    }
    const outside = distance - point.halfWidth;
    if (outside < edge) {
      edge = outside;
      roadY = point.y;
    }
    // Cover the 6 m shoulder, the grid diagonal and the gap between sampled frames.
    if (outside < 24) ceiling = Math.min(ceiling, point.y - .65);
  }
  const wave = Math.sin(x * .037) * Math.cos(z * .025) + .6 * Math.sin((x + z) * .023);
  const bank = Math.min(1, Math.max(0, (edge - 24) / 55));
  // Fade changes in nearest-road elevation out before the tile's neighbourhood ends.
  const sand = THREE.MathUtils.lerp(roadY, 8, THREE.MathUtils.smoothstep(edge, 100, 145))
    - .65 + bank * (8 + 4 * wave);
  const cut = THREE.MathUtils.smoothstep(edge, 24, 54) * (1 - THREE.MathUtils.smoothstep(chasmDistance, 22, 120));
  return Math.min(ceiling, THREE.MathUtils.lerp(sand, chasmFloor, cut));
}

/** One world-space sand surface. Route-relative strips overlap on the inside of the hairpins. */
export function createDuneTerrain() {
  const { roads, tiles } = terrainSamples();
  const group = new THREE.Group();
  group.name = 'Dune terrain';
  const material = new THREE.MeshStandardMaterial({ color: 0xd99445, roughness: 1 });
  const segments = TILE / CELL;
  for (const key of tiles) {
    const [tx, tz] = key.split(',').map(Number);
    const nearby: RoadSample[] = [];
    // The bank, road clearance and canyon blend all have bounded influence (< TILE).
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      nearby.push(...(roads.get(`${tx + dx},${tz + dz}`) ?? []));
    }
    const geometry = new THREE.PlaneGeometry(TILE, TILE, segments, segments).rotateX(-Math.PI / 2);
    const x = (tx + .5) * TILE, z = (tz + .5) * TILE;
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      position.setY(i, duneHeight(x + position.getX(i), z + position.getZ(i), nearby));
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Dune sand terrain';
    mesh.position.set(x, 0, z);
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const meshes = group.children as THREE.Mesh[];
  return {
    group,
    update(x: number, z: number) {
      // Exp2 fog already covers this distance. Limit software rasterization and GPU draw calls.
      for (const mesh of meshes) {
        const { x: tileX, z: tileZ } = mesh.position;
        mesh.visible = Math.max(Math.abs(tileX - x), Math.abs(tileZ - z)) < VISIBLE_RANGE;
      }
    },
    dispose() {
      meshes.forEach(mesh => mesh.geometry.dispose());
      material.dispose();
      group.removeFromParent();
      group.clear();
    },
  };
}
