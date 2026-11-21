import * as THREE from 'three';
import type { AirflowProfile } from '../../airflow-geometry.ts';

// Where Freeze's ice grows on a car: clusters of small crystals rooted on the car's measured silhouette (24 slices,
// pose coordinates, nose at -z): along the sills, on the wheel arches, the roof edges, the rear wing and the rear
// bumper, with icicles hanging under the sills and the bumper. Any car gets the same clusters on its own body.

/** One crystal in pose coordinates: root, lean (+y of the crystal = its axis), size, when it grows, how it flies off. */
export type Crystal = { at: THREE.Vector3; lean: THREE.Quaternion; radius: number; length: number; delay: number; fly: THREE.Vector3; axis: THREE.Vector3 };

/** A cluster: u along the car (0 nose, 1 tail), side (-1 left, 1 right, 0 across the top), height h as a share of the
 *  slice's top, outward/up/back lean, crystal count n, and whether its crystals hang as icicles. */
type Cluster = { u: number; side: number; h: number; x?: number; dir: [number, number, number]; n: number; icicle?: boolean; roof?: boolean };

const CLUSTERS: Cluster[] = [];
for (const side of [-1, 1]) {
  for (const u of [0.35, 0.5, 0.65]) CLUSTERS.push({ u, side, h: 0.18, dir: [side * 0.8, 0.55, 0.1], n: 3 }); // side skirts
  for (const u of [0.38, 0.62]) CLUSTERS.push({ u, side, h: 0.12, dir: [side * 0.2, -1, 0], n: 2, icicle: true });
  for (const u of [0.21, 0.79]) CLUSTERS.push({ u, side, h: 0.6, dir: [side * 0.75, 0.75, 0], n: 4 }); // wheel arches
  for (const u of [-0.08, 0.08]) CLUSTERS.push({ u, side, h: 1, x: 0.62, dir: [side * 0.45, 0.9, 0.1], n: 2, roof: true });
}
for (const x of [-0.6, -0.2, 0.2, 0.6]) CLUSTERS.push({ u: 0.96, side: 0, x, h: 1, dir: [x * 0.4, 0.85, 0.45], n: 2 }); // rear wing
for (const x of [-0.5, 0, 0.5]) CLUSTERS.push({ u: 1, side: 0, x, h: 0.4, dir: [0, -1, 0.25], n: 2, icicle: true }); // rear bumper

export const SHARDS = CLUSTERS.reduce((sum, cluster) => sum + cluster.n, 0);
/** Low: every LOW_STRIDE-th crystal, on the player only. */
export const LOW_STRIDE = 8;

const UP = new THREE.Vector3(0, 1, 0);
const random = (k: number): number => { const s = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

/** The nearest measured slice to u (empty slices fall back to their neighbours, then to the box). */
function sliceAt(profile: AirflowProfile, u: number) {
  const { sections, bounds: { min, max } } = profile, last = sections.length - 1;
  const j = THREE.MathUtils.clamp(Math.floor(u * sections.length), 0, last);
  for (let d = 0; d <= last; d++) for (const i of [j - d, j + d]) {
    const s = sections[i];
    if (s && Number.isFinite(s.top) && Number.isFinite(s.right - s.left)) return s;
  }
  return { left: min.x, right: max.x, top: max.y };
}

/** The cabin: the slice with the highest roof in the middle of the car. */
function roofU(profile: AirflowProfile): number {
  const n = profile.sections.length;
  let best = 0.5, top = -Infinity;
  for (let i = Math.floor(n * 0.25); i < Math.ceil(n * 0.75); i++) {
    const s = profile.sections[i]!;
    if (Number.isFinite(s.top) && s.top > top) { top = s.top; best = (i + 0.5) / n; }
  }
  return best;
}

export function crystalLayout(profile: AirflowProfile): Crystal[] {
  const { min, max } = profile.bounds, length = max.z - min.z, height = Math.max(0.3, max.y - min.y);
  const scale = THREE.MathUtils.clamp(length / 4.5, 0.7, 1.4), roof = roofU(profile);
  const crystals: Crystal[] = [], dir = new THREE.Vector3(), tilt = new THREE.Euler();
  for (const cluster of CLUSTERS) {
    const u = cluster.roof ? roof + cluster.u : cluster.u, s = sliceAt(profile, u);
    const mid = (s.left + s.right) / 2, half = (s.right - s.left) / 2;
    const base = new THREE.Vector3(
      cluster.side ? mid + cluster.side * half * (cluster.x ?? 0.97) : mid + (cluster.x ?? 0) * half,
      min.y + cluster.h * (s.top - min.y),
      cluster.u === 1 ? max.z - 0.04 : min.z + THREE.MathUtils.clamp(u, 0, 1) * length);
    for (let c = 0; c < cluster.n; c++) {
      const k = crystals.length, r = (o: number) => random(k * 7 + o) - 0.5;
      const at = base.clone().add(new THREE.Vector3(cluster.side ? 0 : r(1) * 0.12, r(2) * 0.06, cluster.u === 1 ? -Math.abs(r(3)) * 0.06 : r(3) * 0.28 * scale));
      dir.set(...cluster.dir).normalize().applyEuler(tilt.set(r(4) * 0.7, r(5) * 0.7, r(6) * 0.7)); // a fan, not a row
      const crystalLength = scale * (cluster.icicle ? 0.1 + 0.12 * random(k + 0.5) : 0.12 + 0.16 * random(k + 0.5));
      const out = new THREE.Vector3(at.x - (min.x + max.x) / 2, 0, at.z - (min.z + max.z) / 2).normalize();
      crystals.push({
        at, lean: new THREE.Quaternion().setFromUnitVectors(UP, dir), length: crystalLength,
        radius: crystalLength * (cluster.icicle ? 0.16 : 0.2 + 0.06 * random(k + 0.25)),
        // From the sills up, every crystal started by 0.4 s and grown by the end of the spread (0.65 s).
        delay: 0.1 + 0.26 * THREE.MathUtils.clamp((at.y - min.y) / height, 0, 1) + 0.03 * random(k + 0.75),
        fly: out.multiplyScalar(3 + 3 * random(k + 0.1)).add(new THREE.Vector3(0, 2 + 3 * random(k + 0.2), 0)), // m/s on thaw
        axis: new THREE.Vector3(r(7), r(8), r(9)).normalize(),
      });
    }
  }
  return crystals;
}
