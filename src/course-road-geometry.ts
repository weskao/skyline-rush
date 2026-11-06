import * as THREE from 'three';
import type { CourseGraph } from './course-graph.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';

export interface CourseRoadOptions {
  /** Metres between cross-sections; the arc-length LUT keeps chord sag under ~0.1 m at 4 m. */
  step?: number;
  from?: number;
  to?: number;
  /** Extra half-width beyond the drivable edge (shoulder/terrain skirt), metres. */
  margin?: number;
  /** Offset along sampled road-surface up (negative for skirts/under-decks). */
  lift?: number;
}

/**
 * Road ribbon built from the SAME `sampleRoute` frames used for vehicle contact, AI and progress,
 * so wheels, checkpoints and the visible surface cannot drift apart. Built once, never per frame.
 */
export function courseRoadGeometry(graph: CourseGraph, edgeId: string, options: CourseRoadOptions = {}): THREE.BufferGeometry {
  const length = routeLength(graph, edgeId);
  const from = Math.max(0, options.from ?? 0), to = Math.min(length, options.to ?? length);
  const step = options.step ?? 4, margin = options.margin ?? 0, lift = options.lift ?? 0;
  const count = Math.max(1, Math.ceil((to - from) / step));
  const positions = new Float32Array((count + 1) * 6), uvs = new Float32Array((count + 1) * 4);
  const indices: number[] = [];
  for (let i = 0; i <= count; i++) {
    const s = from + (to - from) * i / count;
    const f = sampleRoute(graph, edgeId, s), half = f.width / 2 + margin;
    for (let side = 0; side < 2; side++) {
      const sign = side ? 1 : -1, o = i * 6 + side * 3;
      positions[o] = f.point[0] + f.right[0] * half * sign + f.up[0] * lift;
      positions[o + 1] = f.point[1] + f.right[1] * half * sign + f.up[1] * lift;
      positions[o + 2] = f.point[2] + f.right[2] * half * sign + f.up[2] * lift;
      uvs[i * 4 + side * 2] = side;
      uvs[i * 4 + side * 2 + 1] = s / (half * 2);
    }
    if (i < count) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
