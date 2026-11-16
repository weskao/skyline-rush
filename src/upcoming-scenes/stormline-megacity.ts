import * as THREE from 'three';

// Homepage environment only. The shared world host owns cars, renderer and camera.
// Coordinates: forward -Z; show-car at (0,0,0); road surface at Y=0.
type Quality = 'low' | 'medium' | 'high';
const PALETTE = {
  asphalt: 0x11182a, midnight: 0x080f24, cyan: 0x2cc9ea,
  magenta: 0xd13ae1, violet: 0x6843b6,
};
const hash = (n: number, salt = 0) => {
  const v = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const roadX = (z: number) => 6 * Math.sin(z / 47) + z * z * 0.00012;

function makeRibbon(points: THREE.Vector3[], width: number, material: THREE.Material, name: string) {
  const positions: number[] = [], triangles: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x, dz = next.z - prev.z;
    const length = Math.hypot(dx, dz) || 1, nx = -dz / length, nz = dx / length;
    for (const side of [1, -1]) {
      positions.push(points[i].x + side * nx * width / 2, points[i].y,
        points[i].z + side * nz * width / 2);
    }
    if (i < points.length - 1) {
      const j = i * 2;
      triangles.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.receiveShadow = true;
  return mesh;
}

function addRail(parent: THREE.Group, points: THREE.Vector3[], width: number, color: number) {
  const segments = [1, -1].map(side => {
    const positions: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
      positions.push(points[i].x - side * dz / len * width / 2,
        points[i].y + 0.12, points[i].z + side * dx / len * width / 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  });
  parent.add(...segments);
}

function addRoads(group: THREE.Group) {
  const ground = Array.from({ length: 70 }, (_, i) => {
    const z = 48 - i * 3.75;
    return new THREE.Vector3(roadX(z), 0, z);
  });
  const upperCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(roadX(-35) + 7, 0.06, -35),
    new THREE.Vector3(roadX(-65) + 15, 6, -65),
    new THREE.Vector3(roadX(-96) + 28, 16, -96),
    new THREE.Vector3(roadX(-128) + 33, 21, -128),
    new THREE.Vector3(roadX(-160) + 22, 19, -160),
    new THREE.Vector3(roadX(-192) + 9, 5, -192),
    new THREE.Vector3(roadX(-204), 0.06, -204),
  ]);
  const elevated = upperCurve.getPoints(72);
  const ramp = elevated.slice(0, 27);
  const skyway = elevated.slice(26);
  const crossing = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-87, 24, -132), new THREE.Vector3(-33, 26, -139),
    new THREE.Vector3(25, 26, -135), new THREE.Vector3(92, 23, -146),
  ]).getPoints(28);
  const street = new THREE.MeshStandardMaterial({
    color: PALETTE.asphalt, metalness: 0.32, roughness: 0.55, side: THREE.DoubleSide,
  });
  const bridge = new THREE.MeshStandardMaterial({
    color: 0x1b213b, metalness: 0.28, roughness: 0.54, side: THREE.DoubleSide,
  });
  const under = new THREE.MeshStandardMaterial({ color: 0x111425, metalness: 0.25, roughness: 0.7 });
  const interchange = new THREE.Group();
  interchange.name = 'stormline:interchange';
  group.add(makeRibbon(ground, 17, street, 'stormline:road:ground'));
  group.add(interchange);
  interchange.add(makeRibbon(ramp, 12, bridge, 'stormline:road:ramp'));
  interchange.add(makeRibbon(skyway, 12, bridge, 'stormline:road:skyway'));
  interchange.add(makeRibbon(crossing, 13, bridge, 'stormline:road:crossing'));
  for (const points of [elevated, crossing]) {
    interchange.add(makeRibbon(points.map(p => new THREE.Vector3(p.x, p.y - 0.72, p.z)),
      13, under, 'stormline:deck:underside'));
  }
  addRail(group, ground, 17.1, PALETTE.magenta);
  addRail(interchange, elevated, 12.2, PALETTE.cyan);
  addRail(interchange, crossing, 13.2, PALETTE.violet);
  const supportGeo = new THREE.CylinderGeometry(0.8, 1.3, 1, 6);
  for (const point of [elevated[30], elevated[42], elevated[54], crossing[5], crossing[20]]) {
    const support = new THREE.Mesh(supportGeo, under);
    support.scale.y = Math.max(1, point.y - 0.8);
    support.position.set(point.x, (point.y - 0.8) / 2, point.z);
    interchange.add(support);
  }

  const dashGeo = new THREE.BoxGeometry(0.17, 0.025, 4.1);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0x9dbdd2, transparent: true, opacity: 0.72 });
  for (let z = 35; z > -186; z -= 13) {
    for (const offset of [-2.85, 2.85]) {
      const mark = new THREE.Mesh(dashGeo, dashMat);
      mark.position.set(roadX(z) + offset, 0.035, z);
      mark.rotation.y = Math.atan((roadX(z + 1) - roadX(z - 1)) / 2);
      group.add(mark);
    }
  }
  return ground;
}

function addCity(group: THREE.Group) {
  const skyline = new THREE.Group();
  skyline.name = 'stormline:skyline';
  group.add(skyline);
  const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
  const windowsGeo = new THREE.BoxGeometry(0.15, 1, 0.08);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1b2442, metalness: 0.52, roughness: 0.67, flatShading: true,
  });
  const seamMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const count = 168, buildings = new THREE.InstancedMesh(buildingGeo, material, count);
  const seams = new THREE.InstancedMesh(windowsGeo, seamMaterial, count);
  buildings.name = 'stormline:building-batch';
  seams.name = 'stormline:window-batch';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? -1 : 1;
    const lane = Math.floor(i / 2) % 4;
    const row = Math.floor(i / 8);
    const z = 51 - row * 16.8 + hash(i, 2) * 8;
    const height = 20 + hash(i, 3) * (lane > 1 ? 85 : 57);
    const depth = 11 + hash(i, 1) * 9, width = 10 + hash(i, 4) * 8;
    const x = roadX(z) + side * (33 + lane * 21 + hash(i, 5) * 9);
    dummy.position.set(x, height / 2 - 0.6, z);
    dummy.scale.set(width, height, depth);
    dummy.updateMatrix();
    buildings.setMatrixAt(i, dummy.matrix);
    buildings.setColorAt(i, new THREE.Color(i % 7 === 0 ? 0x344071 : 0x16213a));
    dummy.position.set(x + side * (width / 2 + 0.1), height * 0.52, z + depth / 2 + 0.08);
    dummy.scale.set(0.11, height * (0.75 + hash(i, 6) * 0.2), 0.12);
    dummy.updateMatrix();
    seams.setMatrixAt(i, dummy.matrix);
    seams.setColorAt(i, new THREE.Color(i % 3 === 0 ? PALETTE.magenta : PALETTE.cyan));
  }
  buildings.instanceMatrix.needsUpdate = true;
  seams.instanceMatrix.needsUpdate = true;
  skyline.add(buildings, seams);

  const signs = new THREE.Group();
  signs.name = 'stormline:holograms';
  const signGeo = new THREE.BoxGeometry(0.4, 10, 13);
  for (let i = 0; i < 7; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: i % 2 ? 0x19274e : 0x2b1342, emissive: i % 2 ? PALETTE.cyan : PALETTE.magenta,
      emissiveIntensity: 1.15, metalness: 0.4, roughness: 0.35,
    });
    const sign = new THREE.Mesh(signGeo, mat);
    const z = -34 - i * 25;
    sign.position.set(roadX(z) + (i % 2 ? 1 : -1) * 29, 20 + (i % 3) * 8, z);
    sign.name = i === 0 ? 'stormline:sign-glow' : 'stormline:hologram:' + i;
    signs.add(sign);
  }
  skyline.add(signs);
}

function addAtmosphere(group: THREE.Group, ground: THREE.Vector3[]) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(430, 24, 12),
    new THREE.MeshBasicMaterial({ color: PALETTE.midnight, side: THREE.BackSide, depthWrite: false }));
  sky.name = 'stormline:night-sky';
  group.add(sky);
  const reflections = new THREE.Group();
  reflections.name = 'stormline:wet-reflections';
  const glint = new THREE.MeshBasicMaterial({
    color: PALETTE.cyan, transparent: true, opacity: 0.23, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glint2 = glint.clone();
  glint2.color.setHex(PALETTE.magenta);
  const lineGeo = new THREE.BoxGeometry(0.23, 0.01, 8);
  for (let i = 0; i < 24; i++) {
    const z = 33 - i * 9.2;
    const strip = new THREE.Mesh(lineGeo, i % 3 === 0 ? glint2 : glint);
    strip.position.set(roadX(z) + (i % 2 ? -6 : 6), 0.055, z);
    strip.rotation.y = Math.atan((roadX(z + 1) - roadX(z - 1)) / 2);
    reflections.add(strip);
  }
  group.add(reflections);
  const haze = new THREE.Group();
  haze.name = 'stormline:haze';
  const fogGeo = new THREE.PlaneGeometry(170, 45);
  const fogMat = new THREE.MeshBasicMaterial({
    color: 0x644e9c, transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide,
  });
  for (const z of [-98, -158, -216]) {
    const layer = new THREE.Mesh(fogGeo, fogMat);
    layer.position.set(0, 27, z);
    haze.add(layer);
  }
  group.add(haze);
  group.add(new THREE.HemisphereLight(0x729dc8, 0x160f2c, .98));
  for (const [x, z, color] of [[-23, -44, PALETTE.cyan], [26, -92, PALETTE.magenta],
    [-23, -155, PALETTE.violet]] as const) {
    const light = new THREE.PointLight(color, 55, 64, 2);
    light.position.set(x, 14, z);
    group.add(light);
  }
  // The street at the car anchor stays clear of props; all buildings are roadside.
  void ground;
}

function addWeather(group: THREE.Group) {
  const rainGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(520 * 2 * 3);
  rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({
    color: 0xa6d8ff, opacity: 0.27, transparent: true, depthWrite: false,
  }));
  rain.name = 'stormline:rain';
  rain.frustumCulled = false;
  group.add(rain);

  const cars = 12, traffic = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), cars * 2);
  traffic.name = 'stormline:traffic';
  traffic.frustumCulled = false;
  for (let i = 0; i < cars * 2; i++) {
    traffic.setColorAt(i, new THREE.Color(Math.floor(i / 2) % 3 ? PALETTE.cyan : PALETTE.magenta));
  }
  group.add(traffic);
  return { rain, positions, traffic };
}

export function createUpcomingEnvironment(scene: THREE.Scene): {
  group: THREE.Group;
  update(timeSeconds: number, quality: Quality, reducedMotion: boolean): void;
  dispose(): void;
} {
  const group = new THREE.Group();
  group.name = 'stormline-megacity';
  const ground = addRoads(group);
  addCity(group);
  addAtmosphere(group, ground);
  const { rain, positions, traffic } = addWeather(group);
  const glow = group.getObjectByName('stormline:sign-glow') as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  const haze = group.getObjectByName('stormline:haze') as THREE.Group;
  const dummy = new THREE.Object3D();
  let disposed = false;
  scene.add(group);

  function update(timeSeconds: number, quality: Quality, reducedMotion: boolean) {
    if (disposed) return;
    const t = reducedMotion ? 0 : Number.isFinite(timeSeconds) ? timeSeconds : 0;
    const rainCount = quality === 'high' ? 520 : quality === 'medium' ? 220 : 70;
    rain.visible = !reducedMotion;
    rain.geometry.setDrawRange(0, rainCount * 2);
    if (!reducedMotion) {
      for (let i = 0; i < rainCount; i++) {
        const fall = (hash(i, 9) * 46 + t * 26) % 46;
        const y = 48 - fall, x = (hash(i, 7) - 0.5) * 128 + y * 0.11;
        const z = 49 - hash(i, 8) * 236, k = i * 6;
        positions[k] = x; positions[k + 1] = y; positions[k + 2] = z;
        positions[k + 3] = x - 0.65; positions[k + 4] = y - 1.8; positions[k + 5] = z + 0.4;
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }
    const movingCars = quality === 'high' ? 12 : quality === 'medium' ? 7 : 3;
    traffic.count = movingCars * 2;
    for (let i = 0; i < movingCars; i++) {
      const z = -72 - ((i * 17 + t * (13 + i % 3 * 4)) % 155);
      const x = roadX(z) + (i % 2 ? -5.6 : 5.6);
      for (const side of [-1, 1]) {
        dummy.position.set(x + side * 0.56, 0.85, z);
        dummy.scale.set(0.5, 0.2, 0.18);
        dummy.updateMatrix();
        traffic.setMatrixAt(i * 2 + (side + 1) / 2, dummy.matrix);
      }
    }
    traffic.instanceMatrix.needsUpdate = true;
    glow.material.emissiveIntensity = reducedMotion ? 0.85 : 0.85 + Math.sin(t * 1.4) * 0.22;
    haze.visible = quality !== 'low';
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    group.traverse(object => {
      const drawable = object as THREE.Mesh | THREE.Line | THREE.LineSegments | THREE.Points;
      if (!('geometry' in drawable) || !drawable.geometry) return;
      geometries.add(drawable.geometry);
      for (const material of Array.isArray(drawable.material) ? drawable.material : [drawable.material]) {
        if (material) materials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
  update(0, 'medium', false);
  return { group, update, dispose };
}
