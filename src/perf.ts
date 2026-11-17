// Frame-time readout for device checks (`?perf`); nearest-rank percentiles over the last PERF_WINDOW seconds.
import type { Camera, InstancedMesh, Material, Mesh, Object3D } from 'three';

export const PERF_WINDOW = 20;

/** Triangles one frame draws for `root` (the player car in the perf gate): visible meshes on the camera's
 *  layers, within each draw range and visible material group, times instances. Read on the 500 ms perf beat only. */
export function drawnTriangles(root: Object3D, camera: Camera): number {
  let total = 0;
  root.traverseVisible(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !mesh.layers.test(camera.layers)) return;
    const { geometry } = mesh, size = geometry.index?.count ?? geometry.attributes.position?.count ?? 0;
    const start = geometry.drawRange.start, end = Math.min(size, start + geometry.drawRange.count);
    const span = (from: number, to: number): number => Math.max(0, Math.min(end, to) - Math.max(start, from));
    const materials = mesh.material as Material | Material[];
    const indices = Array.isArray(materials)
      ? geometry.groups.reduce((sum, group) => sum + (materials[group.materialIndex ?? 0]?.visible ? span(group.start, group.start + group.count) : 0), 0)
      : materials.visible ? span(0, size) : 0;
    total += Math.floor(indices / 3) * ((mesh as InstancedMesh).isInstancedMesh ? (mesh as InstancedMesh).count : 1);
  });
  return total;
}

export function frameStats(samples: readonly number[]) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = (p: number) => sorted[Math.ceil(p * sorted.length) - 1];
  const mean = samples.reduce((sum, ms) => sum + ms, 0) / samples.length;
  return { count: samples.length, p50: rank(0.5), p95: rank(0.95), fps: Math.round(10000 / mean) / 10 };
}
