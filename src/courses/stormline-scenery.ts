import * as THREE from 'three';
import { STORMLINE_MEGACITY, type Point3 } from './stormline-megacity.ts';
import { stormlineRoadLength } from './stormline-course-graph.ts';

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
  // Chunk boundaries use the SAME smooth arc-length metres as the canonical road sampler.
  const limit = stormlineRoadLength(edgeId);
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
    metalness: 0.28, roughness: 0.55, side: THREE.DoubleSide });
  const railMat = new THREE.MeshBasicMaterial({ color: 0x39d6ed });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xb45beb, transparent: true, opacity: 0.65 });
  const structureMat = new THREE.MeshStandardMaterial({ color: 0x1b2541, metalness: 0.42, roughness: 0.57 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1b244a, metalness: 0.58, roughness: 0.28 });
  const ownedMaterials = [roadMat, railMat, ledMat, structureMat, glassMat];
  // Even Low needs a tight chord limit at hairpins to keep rendered asphalt beneath wheels.
  const step = 8;
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
    // Fixed-distance dashed lane guide remains readable in rain across arbitrary stream splits.
    // Use the same canonical road frame; these non-solid meshes never enter collision physics.
    const guides: number[] = [], faces: number[] = [];
    const dashStep = 24;
    for (let index = Math.floor(from / dashStep); index * dashStep < to; index++) {
      const start = Math.max(from, index * dashStep + 4);
      const end = Math.min(to, index * dashStep + 15);
      if (start >= end) continue;
      for (const distance of [start, end]) {
        const pose = sample(edgeId, distance);
        for (const offset of [-0.22, 0.22]) {
          const point = v3(pose.point).addScaledVector(v3(pose.right), offset)
            .addScaledVector(v3(pose.up), 0.11);
          guides.push(point.x, point.y, point.z);
        }
      }
      const n = guides.length / 3 - 4;
      faces.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
    if (guides.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(guides, 3));
      geometry.setIndex(faces); geometry.computeVertexNormals();
      const material = new THREE.MeshBasicMaterial({ color: 0x9bcddb, side: THREE.DoubleSide });
      ownedMaterials.push(material);
      const laneGuides = new THREE.Mesh(geometry, material);
      laneGuides.name = `stormline:lane-guides:${edgeId}`;
      group.add(laneGuides);
    }
  }
  // Flight is an actual road gap: guide markers live OUTSIDE the air corridor.
  // Distances are absolute on the canonical graph so rebatching cannot move or double them.
  if (edge.mode === 'flight') {
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    ownedMaterials.push(markerMat);
    const spacing = 90, first = 30;
    const distances: number[] = [];
    for (let s = first + Math.max(0, Math.ceil((from - first) / spacing)) * spacing;
      s < to; s += spacing) distances.push(s);
    const landing = limit - 35;
    if (landing >= from && landing < to && !distances.includes(landing)) distances.push(landing);
    if (distances.length) {
      const geometry = new THREE.BoxGeometry(0.65, 3.2, 0.65);
      const guides = new THREE.InstancedMesh(geometry, markerMat, distances.length * 2);
      guides.name = `stormline:flight-guides:${edgeId}`;
      const dummy = new THREE.Object3D();
      for (const [i, s] of distances.entries()) {
        const pose = sample(edgeId, s);
        for (const [j, side] of ([-1, 1] as const).entries()) {
          dummy.position.copy(v3(pose.point)
            .addScaledVector(v3(pose.right), side * (edge.width / 2 + 6))
            .addScaledVector(v3(pose.up), 2));
          dummy.updateMatrix();
          const index = i * 2 + j;
          guides.setMatrixAt(index, dummy.matrix);
          guides.setColorAt(index, new THREE.Color(side < 0 ? 0x38e8ff : 0xdb5ef4));
        }
      }
      guides.instanceMatrix.needsUpdate = true;
      if (guides.instanceColor) guides.instanceColor.needsUpdate = true;
      group.add(guides);
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
  // Buildings are anchored to absolute edge-distance cells, never relative chunk indices.
  // Re-slicing a stream window must not move towers or change their deterministic palette.
  const spacing = quality === 'low' ? 75 : 42;
  const firstTower = spacing / 2 + Math.max(0, Math.ceil((from - spacing / 2) / spacing)) * spacing;
  const towerCount = Math.max(0, Math.ceil((to - firstTower) / spacing));
  if (edge.layer !== 'tunnel' && towerCount > 0) {
    const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glassMat, towerCount);
    buildings.name = `stormline:buildings:${edgeId}`;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < towerCount; i++) {
      const s = firstTower + i * spacing;
      const index = Math.round((s - spacing / 2) / spacing) + edgeId.length * 19;
      const p = sample(edgeId, s);
      const side = index % 2 ? -1 : 1;
      const setback = edge.width / 2 + 38 + hash(index) * 28;
      const height = 36 + hash(index + 31) * 124;
      const pos = v3(p.point).addScaledVector(v3(p.right), setback * side);
      dummy.position.set(pos.x, height / 2, pos.z);
      dummy.scale.set(16 + hash(index + 2) * 20, height, 18 + hash(index + 5) * 18);
      dummy.updateMatrix(); buildings.setMatrixAt(i, dummy.matrix);
      buildings.setColorAt(i, new THREE.Color(index % 5 === 0 ? 0x304477 : 0x172443));
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
    for (let s = 65 + Math.max(0, Math.ceil((from - 65) / 140)) * 140; s < to; s += 140) {
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
