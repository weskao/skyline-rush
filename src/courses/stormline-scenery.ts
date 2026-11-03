import * as THREE from 'three';
import { STORMLINE_MEGACITY, edgeLength, type Point3 } from './stormline-megacity.ts';

/** The graph integrator supplies the SAME canonical road frame used for physics, AI and cameras. */
export interface CourseRoadFrame {
  point: Point3;
  right: Point3;
  up: Point3;
}
export type RoadSampler = (edgeId: string, localS: number) => CourseRoadFrame;
type Quality = 'low' | 'medium' | 'high';
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 11.3) * 43758.5453; return x - Math.floor(x); };
const v3 = (point: Point3) => new THREE.Vector3(...point);

/** One streamable segment; add its group to the EXISTING world.js scene and dispose on eviction. */
export function createStormlineChunk(edgeId: string, startS: number, endS: number,
  sample: RoadSampler, quality: Quality) {
  const edge = STORMLINE_MEGACITY.edges.find(item => item.id === edgeId);
  if (!edge) throw new Error(`Unknown Stormline edge ${edgeId}`);
  const limit = edgeLength(edge);
  const from = Math.max(0, Math.min(startS, limit));
  const to = Math.max(from, Math.min(endS, limit));
  const group = new THREE.Group();
  group.name = `stormline:chunk:${edgeId}:${from}`;
  const roadMat = new THREE.MeshStandardMaterial({ color: edge.surface === 'tunnel' ? 0x10172a : 0x171d35,
    metalness: 0.54, roughness: quality === 'low' ? 0.45 : 0.24, side: THREE.DoubleSide });
  const railMat = new THREE.MeshBasicMaterial({ color: 0x39d6ed });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xb45beb, transparent: true, opacity: 0.65 });
  const structureMat = new THREE.MeshStandardMaterial({ color: 0x1b2541, metalness: 0.42, roughness: 0.57 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1b244a, metalness: 0.58, roughness: 0.28 });
  const ownedMaterials = [roadMat, railMat, ledMat, structureMat, glassMat];
  const step = quality === 'low' ? 14 : 8;
  const steps = Math.max(2, Math.ceil((to - from) / step));
  const frame = (i: number) => sample(edgeId, from + (to - from) * i / steps);
  if (edge.mode === 'drive') {
    const positions: number[] = [], indices: number[] = [];
    const railLines = [[], []] as number[][];
    const glowLines = [[], []] as number[][];
    for (let i = 0; i <= steps; i++) {
      const { point, right, up } = frame(i);
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? 1 : -1;
        const offset = sign * edge.width / 2;
        const p = v3(point).addScaledVector(v3(right), offset);
        positions.push(p.x, p.y, p.z);
        const rail = p.clone().addScaledVector(v3(up), 0.62);
        railLines[side].push(rail.x, rail.y, rail.z);
        const glow = p.clone().addScaledVector(v3(up), 0.07);
        glowLines[side].push(glow.x, glow.y, glow.z);
      }
      if (i < steps) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const road = new THREE.Mesh(geometry, roadMat); road.name = `stormline:road:${edgeId}`;
    road.receiveShadow = true; group.add(road);
    for (const points of [...railLines.map(a => [a, railMat] as const), ...glowLines.map(a => [a, ledMat] as const)]) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(points[0], 3));
      group.add(new THREE.Line(geo, points[1]));
    }
  }
  // Repeated real 3D building volumes remain clear of the road, not JPEG planes.
  const count = Math.min(quality === 'high' ? 44 : quality === 'medium' ? 26 : 12,
    Math.ceil((to - from) / (quality === 'low' ? 75 : 42)));
  if (edge.layer !== 'tunnel' && count > 0) {
    const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glassMat, count);
    buildings.name = `stormline:buildings:${edgeId}`;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const index = i + Math.floor(from / 40) * 5 + edgeId.length * 19;
      const p = frame((i + 0.5) / count * steps);
      const side = i % 2 ? -1 : 1;
      const setback = edge.width / 2 + 38 + hash(index) * 28;
      const height = 36 + hash(index + 31) * 124;
      const pos = v3(p.point).addScaledVector(v3(p.right), setback * side);
      dummy.position.set(pos.x, height / 2, pos.z);
      dummy.scale.set(16 + hash(index + 2) * 20, height, 18 + hash(index + 5) * 18);
      dummy.updateMatrix(); buildings.setMatrixAt(i, dummy.matrix);
      buildings.setColorAt(i, new THREE.Color(i % 5 === 0 ? 0x304477 : 0x172443));
    }
    buildings.instanceMatrix.needsUpdate = true; group.add(buildings);
  }
  if (edge.layer === 'viaduct' && edge.mode === 'drive') {
    const pillarGeo = new THREE.CylinderGeometry(1.4, 2, 1, 8);
    for (let s = from + 65; s < to; s += 140) {
      const p = sample(edgeId, s).point;
      if (p[1] < 5) continue;
      const pillar = new THREE.Mesh(pillarGeo, structureMat);
      pillar.position.set(p[0], p[1] / 2, p[2]); pillar.scale.y = p[1];
      group.add(pillar);
    }
  }
  // Visual hazards reflect authored physics data; traffic entities are left to existing AI host.
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xeb9136, roughness: 0.68 });
  ownedMaterials.push(barrierMat);
  for (const hazard of STORMLINE_MEGACITY.obstacles.filter(item => item.edge === edgeId && item.s >= from && item.s < to)) {
    if (hazard.kind === 'traffic' || hazard.kind === 'slow-car') continue;
    const pose = sample(edgeId, hazard.s);
    const position = v3(pose.point).addScaledVector(v3(pose.right), hazard.lateral);
    position.addScaledVector(v3(pose.up), hazard.height / 2);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(hazard.radius * 2, hazard.height, hazard.radius * 1.25), barrierMat);
    mesh.position.copy(position); mesh.name = `stormline:hazard:${hazard.id}`; group.add(mesh);
  }
  let disposed = false;
  return { group, dispose() {
    if (disposed) return;
    disposed = true; group.removeFromParent();
    const geometries = new Set<THREE.BufferGeometry>();
    group.traverse(object => {
      if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) geometries.add(object.geometry);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of ownedMaterials) material.dispose();
  } };
}
