import * as THREE from 'three';
import {
  MONSOON_RUINS_COURSE, sampleMonsoonRoute,
  type MonsoonEdgeId, type Vec3,
} from './monsoon-ruins.ts';

type Quality = 'low' | 'medium' | 'high';
export interface MonsoonChunkOptions {
  edgeId?: MonsoonEdgeId;
  from: number;
  to: number;
  quality?: Quality;
}
const palette = {
  road: '#514c3a', mud: '#595a43', jungle: '#244e36',
  moss: '#326849', bark: '#433e30', stone: '#657466',
  shadow: '#313e39', water: '#7caeb0', falls: '#c0e3d8',
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const seed = (n: number) => {
  const s = Math.sin(n * 127.1 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};
const vec = (p: Vec3) => new THREE.Vector3(...p);
const location = (distance: number, side: number, edgeId: MonsoonEdgeId = 'ground') => {
  const f = sampleMonsoonRoute(edgeId, distance);
  return new THREE.Vector3(...f.point).addScaledVector(vec(f.right), side);
};
const box = (group: THREE.Group, name: string, size: [number, number, number],
  at: THREE.Vector3, material: THREE.Material) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.copy(at);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
};
function roadMesh(from: number, to: number, edgeId: MonsoonEdgeId,
  width: number, material: THREE.Material, lift = .07): THREE.Mesh {
  const steps = Math.ceil((to - from) / 7), positions: number[] = [], indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = from + (to - from) * i / steps;
    const { point, right } = sampleMonsoonRoute(edgeId, s);
    for (const side of [-1, 1]) {
      positions.push(point[0] + right[0] * side * width / 2,
        point[1] + lift, point[2] + right[2] * side * width / 2);
    }
    if (i < steps) {
      const j = i * 2;
      indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const road = new THREE.Mesh(geometry, material);
  road.name = edgeId === 'ground' ? 'monsoon-course-mud-road' : 'monsoon-course-' + edgeId;
  road.receiveShadow = true;
  return road;
}
function terrainMesh(from: number, to: number, side: -1 | 1,
  material: THREE.Material): THREE.Mesh {
  const rows = Math.ceil((to - from) / 15), columns = 9;
  const positions: number[] = [], indices: number[] = [], colors: number[] = [];
  const earthy = new THREE.Color(palette.mud);
  const foliage = new THREE.Color(palette.jungle);
  for (let row = 0; row <= rows; row++) {
    const s = from + (to - from) * row / rows;
    const { point, right } = sampleMonsoonRoute('ground', s);
    for (let col = 0; col <= columns; col++) {
      const d = 13.5 + col * 19;
      const waves = Math.sin(s / 145 + col * .9 + side) * 2
        + Math.cos(s / 85 - col * 1.7) * 1.5;
      const valley = s > 2900 && s < 4900 && side === 1 ? -16 : 0;
      const y = point[1] - .65 + (d / 180) ** 1.5 * (20 + 12 * Math.sin(s / 240))
        + waves * Math.min(1, col / 3) + valley * Math.min(1, col / 3);
      positions.push(point[0] + right[0] * d * side, y, point[2] + right[2] * d * side);
      const mix = clamp(.22 + col / columns * .64 + .13 * Math.sin(s / 66 + col), 0, 1);
      const color = earthy.clone().lerp(foliage, mix);
      colors.push(color.r, color.g, color.b);
      if (row < rows && col < columns) {
        const j = row * (columns + 1) + col;
        indices.push(j, j + columns + 1, j + 1, j + 1, j + columns + 1, j + columns + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'monsoon-jungle-river-valley-terrain';
  mesh.receiveShadow = true;
  return mesh;
}
function makeForest(group: THREE.Group, from: number, to: number,
  tier: Quality, wood: THREE.Material, dark: THREE.Material, light: THREE.Material) {
  const count = tier === 'low' ? 35 : tier === 'medium' ? 90 : 150;
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.75, 1.25, 1, 6), wood, count);
  const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), dark, count);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), light, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const key = i + Math.floor(from / 17) * 241;
    const s = from + (to - from) * seed(key * 7);
    const lateral = (i % 2 ? 1 : -1) * (27 + seed(key + 18) * 145);
    const base = location(s, lateral);
    const height = 12 + seed(key * 11) * 22;
    dummy.position.copy(base);
    dummy.position.y += height / 2;
    dummy.scale.set(1.3 + seed(key) * .5, height, 1.3);
    dummy.rotation.set(0, seed(key * 3) * Math.PI * 2, 0);
    dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
    dummy.position.y += height / 2 + 3.5;
    dummy.scale.set(5.5 + seed(key + 3) * 3, 6 + seed(key + 5) * 3, 5.5);
    dummy.updateMatrix(); canopy.setMatrixAt(i, dummy.matrix);
    dummy.position.y += 5;
    dummy.scale.multiplyScalar(.72);
    dummy.updateMatrix(); crown.setMatrixAt(i, dummy.matrix);
  }
  for (const m of [trunk, canopy, crown]) {
    m.name = 'monsoon-mixed-rainforest-canopy';
    m.instanceMatrix.needsUpdate = true;
    m.receiveShadow = true;
    group.add(m);
  }
}
function makeLandmarks(group: THREE.Group, from: number, to: number,
  stone: THREE.Material, dark: THREE.Material, water: THREE.Material,
  flow: THREE.Group, mist: THREE.Group) {
  const inRange = (s: number) => s >= from && s < to;
  if (inRange(5300)) {
    const root = new THREE.Group();
    root.name = 'monsoon-colossal-guardian-temple';
    root.position.copy(location(5300, -135));
    group.add(root);
    for (let i = 0; i < 6; i++) {
      box(root, 'moss-covered stepped sanctuary',
        [69 - 7 * i, 3.5, 58 - 5 * i], new THREE.Vector3(0, 3.5 + i * 3.5, 0), i % 2 ? dark : stone);
    }
    for (const x of [-23, -12, 12, 23]) {
      box(root, 'carved temple pillar', [5, 22, 6], new THREE.Vector3(x, 33, 4), stone);
      box(root, 'guardian lintel', [7, 3, 7], new THREE.Vector3(x, 44, 4), dark);
    }
    const face = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), stone);
    face.name = 'colossal-ancient-guardian-face';
    face.scale.set(17, 23, 10);
    face.position.set(0, 66, 0);
    root.add(face);
    for (const x of [-7, 7]) {
      box(root, 'guardian eye socket', [5, 2, 2], new THREE.Vector3(x, 70, 9), dark);
      box(root, 'guardian cheek', [8, 2, 3], new THREE.Vector3(x, 62, 9), stone);
    }
  }
  if (inRange(6740)) {
    const root = new THREE.Group();
    root.name = 'monsoon-river-gorge-triple-waterfall';
    root.position.copy(location(6740, 115));
    group.add(root);
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 21, height = 24 + i * 10;
      box(root, 'waterfall basalt ledge', [24, 7, 15],
        new THREE.Vector3(x, height + 4, -7), stone);
      const fall = new THREE.Mesh(new THREE.PlaneGeometry(16, height), water);
      fall.name = 'animated-waterfall-cascade';
      fall.position.copy(root.position).add(new THREE.Vector3(x, height / 2, 2));
      flow.add(fall);
      box(root, 'misty-waterfall-plunge-basin', [22, .25, 14],
        new THREE.Vector3(x, .1, 5), water);
      const fog = new THREE.Mesh(new THREE.PlaneGeometry(26, 7),
        new THREE.MeshBasicMaterial({ color: palette.falls, transparent: true,
          opacity: .16, depthWrite: false, side: THREE.DoubleSide }));
      fog.position.copy(root.position).add(new THREE.Vector3(x, 5, 6));
      mist.add(fog);
    }
  }
  if (inRange(6950)) {
    const bridge = new THREE.Group();
    bridge.name = 'monsoon-high-arched-stone-viaduct';
    bridge.position.copy(location(6950, -84));
    group.add(bridge);
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * 16;
      box(bridge, 'mossy-stone-bridge-pier', [5, 34, 6],
        new THREE.Vector3(x, 13, 0), stone);
      box(bridge, 'bridge-arch-cap', [16, 4, 6],
        new THREE.Vector3(x + 8, 31, 0), dark);
    }
    box(bridge, 'elevated-bridge-deck', [95, 3, 15],
      new THREE.Vector3(0, 34, 0), stone);
  }
}
function makeVisibleObstacles(group: THREE.Group, from: number, to: number,
  edgeId: MonsoonEdgeId, stone: THREE.Material, bark: THREE.Material) {
  for (const obstacle of MONSOON_RUINS_COURSE.obstacles) {
    if (obstacle.edgeId !== edgeId || obstacle.at < from || obstacle.at >= to) continue;
    const pos = location(obstacle.at, obstacle.lateral, edgeId);
    pos.y += obstacle.height / 2;
    if (obstacle.kind === 'fallen-tree' || obstacle.kind === 'roots') {
      const tree = new THREE.Mesh(new THREE.CylinderGeometry(obstacle.radius * .28,
        obstacle.radius * .48, obstacle.height * 2, 7), bark);
      tree.rotation.z = 1.3;
      tree.position.copy(pos);
      tree.name = 'solid-' + obstacle.id;
      group.add(tree);
    } else {
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), stone);
      rubble.name = 'solid-' + obstacle.id;
      rubble.position.copy(pos);
      rubble.scale.set(obstacle.radius, obstacle.height / 2, obstacle.radius * .9);
      group.add(rubble);
    }
  }
}
function makeRain(group: THREE.Group, from: number, to: number, tier: Quality) {
  const max = tier === 'low' ? 120 : tier === 'medium' ? 210 : 320;
  const data = new Float32Array(max * 6);
  // Preserve the rain's world-space spawn points across frames; only falling Y animates.
  const origins = Array.from({ length: max }, (_, i) => {
    const s = from + (to - from) * seed(i * 7 + from);
    return location(s, (seed(i * 11 + to) - .5) * 90);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data, 3));
  const mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
    color: '#b6d7dc', transparent: true, opacity: .21, depthWrite: false,
  }));
  mesh.name = 'monsoon-animated-rain';
  mesh.frustumCulled = false;
  group.add(mesh);
  return (t: number, reducedMotion: boolean) => {
    mesh.visible = !reducedMotion;
    if (reducedMotion) return;
    for (let i = 0; i < max; i++) {
      const pos = origins[i];
      const y = (seed(i + from) * 28 - t * 14) % 28;
      const h = 7 + (y + 28) % 28;
      const index = i * 6;
      data[index] = pos.x; data[index + 1] = pos.y + h; data[index + 2] = pos.z;
      data[index + 3] = pos.x - .4; data[index + 4] = pos.y + h - 2;
      data[index + 5] = pos.z - .25;
    }
    geometry.attributes.position.needsUpdate = true;
  };
}
// The host may stream neighboring chunks, but owns the renderer, camera, cars, race, and lifetime.
export function createMonsoonRuinsChunk(options: MonsoonChunkOptions) {
  const { from, to, edgeId = 'ground', quality = 'medium' } = options;
  const branch = MONSOON_RUINS_COURSE.branches.find(e => e.id === edgeId);
  const rangeFrom = branch?.from ?? 0, rangeTo = branch?.to ?? MONSOON_RUINS_COURSE.length;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < rangeFrom || to > rangeTo || to <= from) {
    throw new RangeError('Monsoon chunk must be inside its route edge');
  }
  const root = new THREE.Group();
  root.name = 'monsoon-course-chunk-' + edgeId;
  const owned = [
    new THREE.MeshStandardMaterial({ color: palette.road, roughness: .34, metalness: .08,
      side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: palette.stone, roughness: .95, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: palette.mud, roughness: .97, vertexColors: true, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: palette.bark, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: palette.shadow, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: palette.jungle, roughness: .98 }),
    new THREE.MeshStandardMaterial({ color: palette.moss, roughness: .94 }),
    new THREE.MeshPhysicalMaterial({ color: palette.water, roughness: .12, metalness: .18,
      clearcoat: .85, clearcoatRoughness: .1, transparent: true, opacity: .68,
      depthWrite: false, side: THREE.DoubleSide }),
  ];
  const [mud, stone, terrain, bark, shadow, foliage, crown, water] = owned;
  root.add(roadMesh(from, to, edgeId, branch?.width ?? 27,
    edgeId === 'ground' || edgeId === 'river-ford' ? mud : stone));
  if (edgeId === 'river-ford') {
    const river = roadMesh(from, to, edgeId, (branch?.width ?? 24) * .92, water, .13);
    river.name = 'monsoon-shallow-river-ford';
    root.add(river);
  }
  if (edgeId === 'waterfall-skybridge') {
    for (let s = Math.ceil(from / 48) * 48; s < to; s += 48) {
      const bridge = sampleMonsoonRoute(edgeId, s).point;
      const baseY = sampleMonsoonRoute('ground', s).point[1] - 13;
      const height = bridge[1] - baseY;
      if (height <= 5) continue;
      box(root, 'monsoon-bridge-support-pier', [4, height, 4],
        new THREE.Vector3(bridge[0], baseY + height / 2, bridge[2]), stone);
    }
  }
  if (edgeId === 'ground') {
    root.add(terrainMesh(from, to, -1, terrain), terrainMesh(from, to, 1, terrain));
    makeForest(root, from, to, quality, bark, foliage, crown);
  }
  const flow = new THREE.Group(), mist = new THREE.Group(), leaves = new THREE.Group();
  root.add(flow, mist, leaves);
  if (edgeId === 'ground') {
    makeLandmarks(root, from, to, stone, shadow, water, flow, mist);
    if (quality !== 'low') for (let i = 0; i < 12; i++) {
      const s = from + (to - from) * seed(i * 8 + from);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.3, 4.5, 5), crown);
      leaf.name = 'monsoon-wind-swaying-fern';
      leaf.position.copy(location(s, (i % 2 ? 1 : -1) * 23));
      leaf.position.y += 2;
      leaves.add(leaf);
    }
    for (let s = Math.ceil(from / 125) * 125; s < to; s += 125) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(3.4, 14), water);
      puddle.name = 'monsoon-rain-reflective-puddle';
      puddle.position.copy(location(s, s % 250 ? 5 : -5));
      puddle.position.y += .1;
      puddle.rotation.x = -Math.PI / 2;
      root.add(puddle);
    }
  }
  makeVisibleObstacles(root, from, to, edgeId, stone, bark);
  const animateRain = makeRain(root, from, to, quality);
  const fallY = flow.children.map(c => c.position.y);
  const mistX = mist.children.map(c => c.position.x);
  let disposed = false;
  function update(timeSeconds: number, reducedMotion = false) {
    if (disposed) return;
    const t = Number.isFinite(timeSeconds) ? timeSeconds : 0;
    animateRain(t, reducedMotion);
    leaves.children.forEach((leaf, i) => { leaf.rotation.z = reducedMotion ? 0 : .12 * Math.sin(t * .7 + i); });
    flow.children.forEach((fall, i) => { fall.position.y = fallY[i] + (reducedMotion ? 0 : Math.sin(t * 1.8 + i) * .5); });
    mist.children.forEach((fog, i) => { fog.position.x = mistX[i] + (reducedMotion ? 0 : Math.sin(t * .25 + i) * 2); });
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(owned);
    root.traverse(node => {
      if (node instanceof THREE.Mesh || node instanceof THREE.LineSegments) {
        geometries.add(node.geometry);
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach(mat => materials.add(mat));
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    root.removeFromParent();
  }
  update(0);
  return { group: root, update, dispose };
}
