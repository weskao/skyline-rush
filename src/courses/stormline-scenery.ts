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
  // Adjacent stream windows may collapse to one point; never allocate degenerate road GPU buffers.
  if (from === to) return {
    group, update(_timeSeconds: number, _reducedMotion: boolean) {},
    dispose() { group.removeFromParent(); },
  };
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
  // Tunnel enclosure follows the identical canonical 3D frame as the asphalt.
  // Collision boundaries belong to shared course physics; these meshes are visuals only.
  if (edge.layer === 'tunnel' && edge.mode === 'drive') {
    const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x26324c,
      emissive: 0x050913, metalness: 0.24, roughness: 0.78, side: THREE.DoubleSide });
    ownedMaterials.push(tunnelMat);
    const halfWidth = edge.width / 2 + 1.2;
    const strip = (name: string, a: [number, number], b: [number, number]) => {
      const vertices: number[] = [], faces: number[] = [];
      for (let i = 0; i <= steps; i++) {
        const pose = frame(i);
        for (const [lateral, height] of [a, b]) {
          const p = v3(pose.point).addScaledVector(v3(pose.right), lateral)
            .addScaledVector(v3(pose.up), height);
          vertices.push(p.x, p.y, p.z);
        }
        if (i < steps) {
          const n = i * 2;
          faces.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(faces); geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, tunnelMat);
      mesh.name = `stormline:tunnel:${name}:${edgeId}`;
      group.add(mesh);
    };
    strip('left', [-halfWidth, 0], [-halfWidth, 7]);
    strip('right', [halfWidth, 0], [halfWidth, 7]);
    strip('roof', [-halfWidth, 7], [halfWidth, 7]);
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
  // Neon billboard volumes reuse the same world frame and remain outside the sightline.
  const billboardMat = new THREE.MeshStandardMaterial({
    color: 0x201339, emissive: 0xb65def, emissiveIntensity: 0.72, metalness: 0.22,
  });
  ownedMaterials.push(billboardMat);
  if (edge.layer !== 'tunnel' && quality !== 'low') {
    // Anchor neon signs to the edge's absolute distance, independent of stream chunk size.
    for (let s = 170 + Math.max(0, Math.ceil((from - 170) / 380)) * 380; s < to; s += 380) {
      const pose = sample(edgeId, s);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 0.8), billboardMat);
      sign.position.copy(v3(pose.point).addScaledVector(v3(pose.right), edge.width / 2 + 27)
        .addScaledVector(v3(pose.up), 18));
      sign.name = `stormline:billboard:${edgeId}`;
      group.add(sign);
    }
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
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x296e9a, metalness: 0.8, roughness: 0.17, transparent: true, opacity: 0.67,
  });
  ownedMaterials.push(barrierMat, waterMat);
  for (const hazard of STORMLINE_MEGACITY.obstacles.filter(item => item.edge === edgeId && item.s >= from && item.s < to)) {
    if (hazard.kind === 'traffic' || hazard.kind === 'slow-car') continue;
    const pose = sample(edgeId, hazard.s);
    const position = v3(pose.point).addScaledVector(v3(pose.right), hazard.lateral);
    position.addScaledVector(v3(pose.up), hazard.height / 2);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(hazard.radius * 2, hazard.height, hazard.radius * 1.25),
      hazard.kind === 'puddle' ? waterMat : barrierMat,
    );
    mesh.position.copy(position); mesh.name = `stormline:hazard:${hazard.id}`; group.add(mesh);
  }
  let disposed = false;
  return { group, update(timeSeconds: number, reducedMotion: boolean) {
    billboardMat.emissiveIntensity = reducedMotion ? 0.72 : 0.72 + 0.14 * Math.sin(timeSeconds * 1.5);
  }, dispose() {
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
