import * as THREE from 'three';

type Quality = 'low' | 'medium' | 'high';
type Island = { x: number; z: number; y: number; radius: number };
const ISLANDS: Island[] = [
  { x: 0, z: 13, y: -1.4, radius: 40 },
  { x: 2, z: -92, y: -1.3, radius: 42 },
  { x: 5, z: -170, y: -1.1, radius: 37 },
  { x: -79, z: -72, y: 20, radius: 32 },
  { x: 86, z: -145, y: 18, radius: 37 },
  { x: -128, z: -226, y: 32, radius: 36 },
  { x: 142, z: -275, y: 12, radius: 38 },
];

const random = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
  return n - Math.floor(n);
};
const groundX = (z: number) => 2.8 * Math.sin((45 - z) * 0.034) + (45 - z) / 56;
const groundY = (z: number) => 0.12 * Math.sin(z * 0.055);

function islandRock(radius: number, seed: number): THREE.BufferGeometry {
  const sides = 17;
  const rings = [1, 0.95, 0.74, 0.44, 0.10];
  const heights = [0, -4, -15, -29, -43];
  const vertices = [0, 0.3, 0];
  const indices: number[] = [];
  for (let row = 0; row < rings.length; row++) {
    for (let i = 0; i < sides; i++) {
      const angle = i * Math.PI * 2 / sides;
      const jag = 0.90 + random(i + seed * 31) * 0.21;
      const r = radius * rings[row] * jag;
      vertices.push(Math.cos(angle) * r, heights[row] - random(i + row * 17 + seed) * 1.2, Math.sin(angle) * r);
      if (row === 0) indices.push(0, 1 + (i + 1) % sides, 1 + i);
      if (row) {
        const a = 1 + (row - 1) * sides + i;
        const b = 1 + (row - 1) * sides + (i + 1) % sides;
        const c = 1 + row * sides + i;
        const d = 1 + row * sides + (i + 1) % sides;
        indices.push(a, b, c, b, d, c);
      }
    }
  }
  const bottom = vertices.length / 3;
  vertices.push(0, -49, 0);
  for (let i = 0; i < sides; i++)
    indices.push(bottom, 1 + (rings.length - 1) * sides + i, 1 + (rings.length - 1) * sides + (i + 1) % sides);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function pathRibbon(points: THREE.Vector3[], width: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const length = Math.hypot(dx, dz) || 1;
    const sideX = -dz / length;
    const sideZ = dx / length;
    const point = points[i];
    positions.push(point.x - sideX * width / 2, point.y, point.z - sideZ * width / 2);
    positions.push(point.x + sideX * width / 2, point.y, point.z + sideZ * width / 2);
    if (i) {
      const a = (i - 1) * 2, b = i * 2;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeClouds(geometry: THREE.BufferGeometry, material: THREE.Material, count: number, far: boolean): THREE.InstancedMesh {
  const cloud = new THREE.InstancedMesh(geometry, material, count);
  cloud.name = far ? 'Skyfall distant cloud ocean' : 'Skyfall near cloud ocean';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const seed = i + (far ? 800 : 200);
    const xSpan = far ? 680 : 330;
    dummy.position.set((random(seed * 3) - 0.5) * xSpan,
      -39 + random(seed * 7) * 13, (random(seed * 11) - 0.58) * (far ? 780 : 490));
    dummy.scale.set(17 + random(seed * 13) * 30, 5 + random(seed * 17) * 8,
      15 + random(seed * 19) * 29);
    dummy.updateMatrix();
    cloud.setMatrixAt(i, dummy.matrix);
  }
  cloud.instanceMatrix.needsUpdate = true;
  cloud.computeBoundingSphere();
  return cloud;
}

function addTrees(root: THREE.Group, crowns: THREE.InstancedMesh, trunks: THREE.InstancedMesh): void {
  const dummy = new THREE.Object3D();
  const positions: THREE.Vector3[] = [];
  for (const island of ISLANDS.slice(0, 5)) {
    for (let i = 0; i < 16; i++) {
      const seed = positions.length + i + island.radius;
      const angle = random(seed * 7) * Math.PI * 2;
      const radius = island.radius * (0.40 + random(seed * 13) * 0.41);
      const x = island.x + radius * Math.cos(angle);
      const z = island.z + radius * Math.sin(angle);
      if (Math.abs(x - groundX(z)) < 11 && island.y < 0) continue;
      positions.push(new THREE.Vector3(x, island.y + 1.4, z));
    }
  }
  crowns.count = trunks.count = Math.min(positions.length, crowns.instanceMatrix.count);
  positions.slice(0, crowns.count).forEach((position, i) => {
    const height = 3.5 + random(i * 11) * 4;
    dummy.position.copy(position); dummy.position.y += height * 0.63;
    dummy.scale.set(0.37, height, 0.37); dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y += height * 0.70;
    dummy.scale.set(2.3 + random(i * 17) * 1.5, height * 0.59, 2.3 + random(i * 17) * 1.5);
    dummy.updateMatrix(); crowns.setMatrixAt(i, dummy.matrix);
  });
  crowns.instanceMatrix.needsUpdate = true;
  trunks.instanceMatrix.needsUpdate = true;
  root.add(crowns, trunks);
}

function addBridgeSupports(root: THREE.Group, stone: THREE.Material): void {
  const piers = new THREE.Group();
  piers.name = 'Skyfall stone bridges';
  root.add(piers);
  for (const [from, to] of [[-22, -58], [-125, -149]]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, z = from + (to - from) * t;
      points.push(new THREE.Vector3(groundX(z), -5 - 8 * Math.sin(Math.PI * t), z));
    }
    const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 22, 4.8, 7, false), stone);
    arch.name = 'Natural bridge stone undercroft';
    piers.add(arch);
  }
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1.6, 2.0), stone, 56);
  const dummy = new THREE.Object3D();
  let k = 0;
  for (const [from, to] of [[-22, -58], [-125, -149]]) {
    for (let z = from; z >= to; z -= 4) for (const sign of [-1, 1]) {
      dummy.position.set(groundX(z) + sign * 7.6, groundY(z) + 0.65, z);
      dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      posts.setMatrixAt(k++, dummy.matrix);
    }
  }
  posts.count = k;
  posts.instanceMatrix.needsUpdate = true;
  piers.add(posts);
}

function makeWaterfalls(root: THREE.Group, water: THREE.Material): {
  drops: THREE.Points; sources: Float32Array; rest: Float32Array;
} {
  const waterfalls = new THREE.Group();
  waterfalls.name = 'Skyfall waterfalls';
  root.add(waterfalls);
  const sites = [
    { x: 31, y: -2, z: 19, length: 42 },
    { x: -33, y: -2, z: -102, length: 44 },
    { x: -101, y: 19, z: -70, length: 48 },
  ];
  const rest = new Float32Array(sites.length * 36 * 3);
  const sources = new Float32Array(rest.length);
  sites.forEach((site, s) => {
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(6.5, site.length), water);
    veil.position.set(site.x, site.y - site.length / 2, site.z);
    veil.name = 'Skyfall waterfall curtain';
    waterfalls.add(veil);
    for (let i = 0; i < 36; i++) {
      const j = (s * 36 + i) * 3;
      rest[j] = site.x + (random(j + 1) - 0.5) * 5;
      rest[j + 1] = random(j + 2);
      rest[j + 2] = site.z + (random(j + 3) - 0.5) * 2;
      sources[j] = site.y;
      sources[j + 1] = site.length;
      sources[j + 2] = 7 + random(j + 5) * 6;
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rest.length), 3));
  const drops = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xe0f9ff, size: 1.1, transparent: true, opacity: 0.85, depthWrite: false,
  }));
  drops.name = 'Skyfall waterfall droplets';
  waterfalls.add(drops);
  return { drops, sources, rest };
}

function createMotes(root: THREE.Group): { points: THREE.Points; rest: Float32Array } {
  const rest = new Float32Array(72 * 3);
  for (let i = 0; i < 72; i++) {
    rest[i * 3] = (random(i * 3 + 1) - 0.5) * 180;
    rest[i * 3 + 1] = 7 + random(i * 5 + 2) * 38;
    rest[i * 3 + 2] = -random(i * 7 + 3) * 230;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rest), 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xc2edff, size: 1.05, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  points.name = 'Skyfall light motes';
  root.add(points);
  return { points, rest };
}

function addSky(root: THREE.Group): void {
  const geo = new THREE.SphereGeometry(850, 24, 12);
  const positions = geo.getAttribute('position');
  const colors: number[] = [];
  const top = new THREE.Color(0x3269b4), horizon = new THREE.Color(0xb6d9f8);
  for (let i = 0; i < positions.count; i++) {
    const t = THREE.MathUtils.smoothstep(positions.getY(i), -160, 450);
    const color = horizon.clone().lerp(top, t);
    colors.push(color.r, color.g, color.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    side: THREE.BackSide, vertexColors: true, depthWrite: false, fog: false,
  }));
  sky.name = 'Skyfall atmospheric sky';
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  root.add(sky);
}

export function createUpcomingEnvironment(scene: THREE.Scene): {
  group: THREE.Group;
  update(timeSeconds: number, quality: Quality, reducedMotion: boolean): void;
  dispose(): void;
} {
  const group = new THREE.Group();
  group.name = 'Skyfall Archipelago animated environment';
  scene.add(group);
  const stone = new THREE.MeshStandardMaterial({ color: 0x667d85, roughness: 0.98, flatShading: true, side: THREE.DoubleSide });
  const grass = new THREE.MeshStandardMaterial({ color: 0x74a889, roughness: 1, flatShading: true });
  const roadStone = new THREE.MeshStandardMaterial({ color: 0xb8c8bd, roughness: 0.96, side: THREE.DoubleSide });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x8aeaff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
  const water = new THREE.MeshBasicMaterial({ color: 0x9cdef9, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false });
  addSky(group);
  group.add(new THREE.HemisphereLight(0xe2f4ff, 0x496d73, 1.45));
  const sunlight = new THREE.DirectionalLight(0xfff1d3, 1.75);
  sunlight.position.set(-110, 180, 65); group.add(sunlight);

  ISLANDS.forEach((island, i) => {
    const land = new THREE.Group();
    land.name = 'Skyfall island ' + (i + 1);
    land.position.set(island.x, island.y, island.z);
    land.add(new THREE.Mesh(islandRock(island.radius, i + 1), stone));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(island.radius * 0.91, island.radius * 0.95, 1.1, 17), grass);
    cap.position.y = 0.24;
    land.add(cap);
    group.add(land);
  });
  const treeGeometry = new THREE.IcosahedronGeometry(1, 0);
  const crowns = new THREE.InstancedMesh(treeGeometry,
    new THREE.MeshStandardMaterial({ color: 0x4d816b, flatShading: true, roughness: 1 }), 80);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5),
    new THREE.MeshStandardMaterial({ color: 0x655f4b, roughness: 1 }), 80);
  crowns.name = 'Skyfall treetops';
  trunks.name = 'Skyfall tree trunks';
  addTrees(group, crowns, trunks);

  const route: THREE.Vector3[] = [];
  for (let i = 0; i <= 90; i++) {
    const z = 45 - i * 2.5;
    route.push(new THREE.Vector3(groundX(z), groundY(z), z));
  }
  const road = new THREE.Mesh(pathRibbon(route, 12.8), roadStone);
  road.name = 'Skyfall ground road';
  group.add(road);
  addBridgeSupports(group, stone);

  const flightCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(groundX(-48), groundY(-48) + 0.2, -48),
    new THREE.Vector3(13, 12, -73),
    new THREE.Vector3(31, 25, -104),
    new THREE.Vector3(28, 23, -132),
    new THREE.Vector3(15, 10, -150),
    new THREE.Vector3(groundX(-169), groundY(-169) + 0.2, -169),
  ]);
  const flight: THREE.Vector3[] = [];
  for (let i = 0; i <= 52; i++) flight.push(flightCurve.getPoint(i / 52));
  const airRoad = new THREE.Mesh(pathRibbon(flight, 6.5), new THREE.MeshStandardMaterial({
    color: 0x7a9eae, roughness: 0.89, metalness: 0.05, side: THREE.DoubleSide,
  }));
  airRoad.name = 'Skyfall elevated flight route';
  group.add(airRoad);
  const guide = new THREE.Mesh(new THREE.TubeGeometry(flightCurve, 52, 0.18, 4, false), cyan);
  guide.name = 'Skyfall cyan flight guide';
  guide.position.y = 1;
  group.add(guide);

  const ring = new THREE.Group(); ring.name = 'Skyfall giant stone ring';
  ring.position.set(-39, 33, -111);
  ring.rotation.y = -0.22;
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(24, 3.2, 8, 52), stone));
  const halo = new THREE.Mesh(new THREE.TorusGeometry(24.2, 0.26, 5, 52), cyan);
  halo.position.z = 2.9; ring.add(halo); group.add(ring);
  const smallRing = new THREE.Mesh(new THREE.TorusGeometry(13, 2.0, 7, 35), stone);
  smallRing.position.set(87, 48, -216); smallRing.rotation.y = 0.35; group.add(smallRing);

  const floating = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), stone, 32);
  floating.name = 'Skyfall levitating rocks';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < floating.count; i++) {
    dummy.position.set((random(i * 5 + 4) - 0.5) * 250,
      -7 + random(i * 7 + 8) * 72, -24 - random(i * 13 + 9) * 260);
    dummy.scale.setScalar(1.6 + random(i * 19 + 3) * 5);
    dummy.rotation.set(random(i + 3), random(i + 11), random(i + 17));
    dummy.updateMatrix(); floating.setMatrixAt(i, dummy.matrix);
  }
  floating.instanceMatrix.needsUpdate = true;
  group.add(floating);

  const cloudGeo = new THREE.SphereGeometry(1, 9, 6);
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xf2f9ff, transparent: true, opacity: 0.38, depthWrite: false });
  const near = makeClouds(cloudGeo, cloudMat, 112, false);
  const far = makeClouds(cloudGeo, cloudMat, 76, true);
  group.add(far, near);
  const { drops, sources, rest } = makeWaterfalls(group, water);
  const { points: motes, rest: moteRest } = createMotes(group);
  let lastWaterTime = Number.NaN, lastMoteTime = Number.NaN, disposed = false;
  function update(timeSeconds: number, quality: Quality, reducedMotion: boolean): void {
    if (disposed) return;
    const t = reducedMotion ? 0 : Number.isFinite(timeSeconds) ? timeSeconds : 0;
    near.position.x = Math.sin(t * 0.05) * 4.3;
    far.position.x = Math.sin(t * 0.025 + 0.7) * 7 - Math.sin(0.7) * 7;
    far.visible = quality !== 'low';
    motes.visible = !reducedMotion && quality !== 'low';
    if (t !== lastWaterTime) {
      const positions = drops.geometry.getAttribute('position') as THREE.BufferAttribute;
      const data = positions.array as Float32Array;
      for (let i = 0; i < data.length; i += 3) {
        data[i] = rest[i] + Math.sin(t * 0.7 + i) * 0.18;
        data[i + 1] = sources[i] - ((i * 0.083 + t * sources[i + 2]) % sources[i + 1]);
        data[i + 2] = rest[i + 2];
      }
      positions.needsUpdate = true;
      lastWaterTime = t;
    }
    if (motes.visible && t !== lastMoteTime) {
      const positions = motes.geometry.getAttribute('position') as THREE.BufferAttribute;
      const data = positions.array as Float32Array;
      for (let i = 0; i < data.length; i += 3) {
        data[i] = moteRest[i] + Math.sin(t * 0.17 + i) * 1.1;
        data[i + 1] = moteRest[i + 1] + Math.sin(t * 0.29 + i) * 1.6;
        data[i + 2] = moteRest[i + 2];
      }
      positions.needsUpdate = true;
      lastMoteTime = t;
    }
  }
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    group.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) materials.add(mat);
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    group.removeFromParent();
    group.clear();
  }
  update(0, 'high', false);
  return { group, update, dispose };
}
