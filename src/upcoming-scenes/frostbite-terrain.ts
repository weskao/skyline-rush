import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CourseGraph } from '../course-graph.ts';
import { routeLength, sampleRoute } from '../course-route-frame.ts';

/** Edge slice used by the Rift Spine hero area; `carve` roads shape the terrain, the bridge spans it. */
export interface HeroEdge { id: string; from?: number; to?: number; carve: boolean }
interface RoadSample { x: number; y: number; z: number; half: number; carve: boolean }

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const ridgeNoise = (x: number, z: number): number =>
  Math.sin(x * .021 + Math.sin(z * .013) * 2.1) * .5 + Math.sin(z * .029 - x * .011) * .3 + Math.sin((x + z) * .061) * .2;

export const BOUNDS = { minX: 780, maxX: 2020, minZ: -2620, maxZ: -1700, cell: 8 } as const;

/**
 * Glacier heightfield around the Rift Spine. Roads are carved from the same `sampleRoute` frames as
 * contact; the chasm axis is perpendicular to the ice bridge with a narrow ice saddle under the
 * lower road and deep crevasse (≈ -70 m) to either side. Walls rise with distance from any road.
 */
export function createGlacierField(graph: CourseGraph, edges: readonly HeroEdge[], chasm: { center: THREE.Vector3; along: THREE.Vector3 }) {
  const samples: RoadSample[] = [];
  for (const edge of edges) {
    const length = routeLength(graph, edge.id), from = edge.from ?? 0, to = Math.min(length, edge.to ?? length);
    for (let s = from; s <= to; s += 5) {
      const f = sampleRoute(graph, edge.id, s);
      samples.push({ x: f.point[0], y: f.point[1], z: f.point[2], half: f.width / 2, carve: edge.carve });
    }
  }
  const across = new THREE.Vector3(chasm.along.z, 0, -chasm.along.x);
  // Coarse list for wall-rise distance (±15 m is invisible there); 40 m buckets for exact carving.
  const coarse = samples.filter((_, i) => i % 6 === 0);
  const CELL = 40, buckets = new Map<string, RoadSample[]>();
  const key = (cx: number, cz: number): string => cx + ',' + cz;
  for (const p of samples) if (p.carve) {
    const k = key(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(p);
  }

  function natural(x: number, z: number, roadDistance: number): number {
    const dx = x - chasm.center.x, dz = z - chasm.center.z;
    const d = Math.abs(dx * across.x + dz * across.z), t = Math.abs(dx * chasm.along.x + dz * chasm.along.z);
    const floor = lerp(38, -70, smooth(55, 210, t)) + ridgeNoise(x * 2, z * 2) * 3;
    const rise = Math.min(185, Math.max(0, roadDistance - 55) * 1.25) * (0.8 + .2 * ridgeNoise(x, z));
    const rim = 70 + rise + Math.max(0, roadDistance - 30) * .02 * ridgeNoise(z, x) * 30;
    return lerp(floor, rim, smooth(62 + ridgeNoise(z, x) * 8, 140, d));
  }

  function height(x: number, z: number): number {
    let nearest = Infinity, carve: RoadSample | null = null, carveDistance = Infinity;
    for (const p of coarse) nearest = Math.min(nearest, Math.hypot(x - p.x, z - p.z));
    // Nearest carve sample (not the first fully-weighted one): ties would pick an uphill station.
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of buckets.get(key(cx + i, cz + j)) ?? []) {
      const e = Math.hypot(x - p.x, z - p.z) - p.half;
      if (e < carveDistance) { carveDistance = e; carve = p; }
    }
    nearest = Math.min(nearest, carveDistance + (carve?.half ?? 0));
    const k = carve ? smooth(5, 30, carveDistance) : 1;
    return lerp(carve ? carve.y - .9 : 0, natural(x, z, nearest), k);
  }

  function geometry(): THREE.BufferGeometry {
    const { minX, maxX, minZ, maxZ, cell } = BOUNDS;
    const columns = Math.round((maxX - minX) / cell), rows = Math.round((maxZ - minZ) / cell);
    const plane = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ, columns, rows);
    plane.rotateX(-Math.PI / 2);
    plane.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    const position = plane.getAttribute('position');
    for (let i = 0; i < position.count; i++) position.setY(i, height(position.getX(i), position.getZ(i)));
    plane.computeVertexNormals();
    paintGlacier(plane);
    return plane;
  }
  return { height, geometry, samples };
}

const SNOW = new THREE.Color('#eef6ff'), ICE = new THREE.Color('#6cc4ef'), DEEP_ICE = new THREE.Color('#1f6fb8');
const ROCK = new THREE.Color('#1a2440'), VOID = new THREE.Color('#0a1d3f');

/** Snow on flats, translucent-looking blue ice on steep faces, dark bedrock streaks, cobalt depth. */
function paintGlacier(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  const colors = new Float32Array(position.count * 3), color = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i), up = normal.getY(i);
    const streak = ridgeNoise(x * 3.1, y * 2.3 + z * .4);
    if (up > .84) color.copy(SNOW);
    else if (up > .55) color.copy(ICE).lerp(SNOW, smooth(.55, .84, up) * .7);
    else color.copy(streak > .15 ? ROCK : DEEP_ICE).lerp(ICE, streak < -.4 ? .45 : 0);
    color.lerp(VOID, smooth(20, -60, y) * .75);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/** Distant snow-capped peaks: one merged, vertex-coloured mesh (single draw call). */
export function distantPeaks(center: THREE.Vector3, seed: () => number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 18; i++) {
    const angle = i / 18 * Math.PI * 2 + seed() * .2, radius = 1150 + seed() * 700;
    const h = 380 + seed() * 520, r = 220 + seed() * 260;
    const cone = new THREE.ConeGeometry(r, h, 7, 4).toNonIndexed();
    const p = cone.getAttribute('position');
    for (let v = 0; v < p.count; v++) {
      const y = p.getY(v) + h / 2, jag = Math.sin(p.getX(v) * .05 + i) * Math.cos(p.getZ(v) * .04) * r * .18;
      p.setXYZ(v, p.getX(v) + jag * (1 - y / h), y, p.getZ(v) + jag * .6 * (1 - y / h));
    }
    cone.translate(center.x + Math.cos(angle) * radius, -40, center.z + Math.sin(angle) * radius);
    const colors = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let v = 0; v < p.count; v++) {
      c.copy(ROCK).lerp(SNOW, smooth(.42, .62, p.getY(v) / h + Math.sin(p.getX(v) * .03) * .05));
      colors.set([c.r, c.g, c.b], v * 3);
    }
    cone.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    cone.deleteAttribute('uv');
    parts.push(cone);
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach(g => g.dispose());
  merged.computeVertexNormals();
  return merged;
}
