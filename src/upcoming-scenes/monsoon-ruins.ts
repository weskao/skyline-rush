import * as THREE from 'three';

type Quality = 'low' | 'medium' | 'high';
type Environment = {
  group: THREE.Group;
  update(timeSeconds: number, quality: Quality, reducedMotion: boolean): void;
  dispose(): void;
};

// Self-contained showroom slice: +Y is up, -Z is forward; the shared host owns cars/camera.
const color = {
  mud: '#6f6350', stone: '#5c8668', darkStone: '#344e42',
  jungle: '#1a5349', canopy: '#2f7759', water: '#9bcbd0',
};
const random = (seed: number) => {
  const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const center = (z: number) => 12 * Math.sin(-z / 65) - 6 * Math.sin(-z / 34);
const roadHeight = (z: number) => -z * 0.009 + 0.28 * Math.sin(-z * 0.026);
const forkAmount = (z: number) => Math.sin(Math.PI * clamp((-z - 42) / 127, 0, 1)) ** 2;
const terrainHeight = (x: number, z: number) => {
  const fromRoad = Math.max(0, Math.abs(x - center(z)) - 14);
  const hills = Math.min(27, fromRoad * 0.20) * (0.66 + 0.34 * Math.sin(x * 0.035 + z * 0.016) ** 2);
  const ripples = Math.min(1, fromRoad / 6) * (0.85 * Math.sin(x * 0.15 + z * 0.055)
    + 0.55 * Math.cos(x * 0.09 - z * 0.11));
  const river = x > 36 && x < 82 && z < -64 && z > -177 ? -7.5 : 0;
  return roadHeight(z) - 0.65 + hills + ripples + river;
};

function ribbon(start: number, end: number, width: number, alternate = false): THREE.BufferGeometry {
  const rows = Math.ceil((start - end) / 3);
  const vertices: number[] = [], indices: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const z = start + (end - start) * i / rows;
    const lift = alternate ? forkAmount(z) : 0;
    const pathX = (p: number) => center(p) + (alternate ? forkAmount(p) * 27 : 0);
    const cx = pathX(z);
    const slope = (pathX(z + .2) - pathX(z - .2)) / .4;
    const inv = 1 / Math.hypot(slope, 1);
    for (const side of [-1, 1]) {
      vertices.push(cx + side * width * .5 * inv,
        roadHeight(z) + (alternate ? lift * 11 : 0),
        z - side * width * .5 * slope * inv);
    }
    if (i < rows) {
      const j = i * 2;
      indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function sculptTerrain(): THREE.BufferGeometry {
  const columns = 64, rows = 64, positions: number[] = [], indices: number[] = [];
  for (let z = 0; z <= rows; z++) for (let x = 0; x <= columns; x++) {
    const px = -160 + 320 * x / columns, pz = 68 - 310 * z / rows;
    positions.push(px, terrainHeight(px, pz), pz);
    if (x < columns && z < rows) {
      const i = z * (columns + 1) + x;
      indices.push(i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function box(parent: THREE.Group, name: string, position: [number, number, number],
  size: [number, number, number], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function makeTemple(root: THREE.Group, stone: THREE.Material, shadow: THREE.Material): void {
  const temple = new THREE.Group();
  temple.name = 'monsoon-guardian-temple';
  temple.position.set(-58, 9, -135);
  root.add(temple);
  for (let i = 0; i < 5; i++) {
    box(temple, 'weathered stepped sanctuary', [0, 1.5 + i * 2.4, -i * 1.2],
      [49 - i * 5, 2.7, 30 - i * 2.4], i % 2 ? shadow : stone);
  }
  for (const x of [-17, -9, 9, 17]) {
    box(temple, 'carved columns', [x, 18, -8], [3.5, 13, 4], stone);
    box(temple, 'carved capitals', [x, 25.4, -8], [5.8, 2.2, 5.5], shadow);
  }
  box(temple, 'ruined lintel', [0, 27, -8], [43, 3, 7], stone);
  const face = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), stone);
  face.name = 'colossal guardian face';
  face.position.set(0, 38, -10);
  face.scale.set(10, 14, 4.5);
  temple.add(face);
  for (const x of [-4.6, 4.6]) {
    box(temple, 'eye sockets', [x, 40.5, -5.9], [3.2, 1.4, 1.2], shadow);
    box(temple, 'brow', [x, 43.2, -5.5], [4.3, 1.4, 1.5], stone);
  }
  box(temple, 'guardian nose', [0, 35.7, -4.7], [2.8, 7.5, 3], stone);
  box(temple, 'guardian mouth', [0, 31, -5.5], [7.8, 1, 1.8], shadow);
  for (let i = 0; i < 7; i++) {
    box(temple, 'collapsed step', [-23 + i * 7.5, -1.5, 18 + (i % 3) * 3],
      [6, 1.6, 5], stone);
  }
}

function makeWaterfalls(root: THREE.Group, stone: THREE.Material, water: THREE.Material,
  foam: THREE.Material): THREE.Group {
  const falls = new THREE.Group();
  falls.name = 'monsoon-waterfalls';
  falls.position.set(56, 0, -124);
  root.add(falls);
  const flow = new THREE.Group();
  flow.name = 'monsoon-waterfall-flow';
  falls.add(flow);
  for (let i = 0; i < 3; i++) {
    const top = [25, 20, 30][i], drop = [19, 14, 24][i], x = (i - 1) * 15;
    box(falls, 'rock waterfall ledge', [x, top + 1.5, -4], [15, 4.5, 11], stone);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(8, drop), water);
    sheet.name = 'translucent cascading falls';
    sheet.position.set(x, top - drop * .5, 1.2);
    sheet.rotation.y = -0.14 + i * .12;
    falls.add(sheet);
    box(falls, 'waterfall plunge pool', [x, top - drop - .25, 3], [11, .24, 7], foam);
    for (let n = 0; n < 6; n++) {
      box(flow, 'falling cyan water ribbon', [x - 3 + n * 1.15, top, 1.6],
        [.24, 2.4, .16], foam);
    }
  }
  return flow;
}

function makeViaduct(root: THREE.Group, stone: THREE.Material, shadow: THREE.Material): void {
  const bridge = new THREE.Group();
  bridge.name = 'monsoon-stone-viaduct';
  bridge.position.set(35, 0, -115);
  root.add(bridge);
  for (let i = 0; i < 5; i++) {
    const x = -27 + i * 14;
    box(bridge, 'ancient bridge pier', [x, 2.8, 0], [3.8, 12, 5], stone);
    box(bridge, 'moss bridge cap', [x, 9.2, 0], [7, 2, 6], shadow);
    if (i < 4) box(bridge, 'arch keystone', [x + 7, 8.1, 0], [9.5, 3, 4.6], stone);
  }
  box(bridge, 'stone bridge causeway', [1, 9.7, 0], [65, 1.7, 8], stone);
  for (const z of [-3.8, 3.8]) {
    box(bridge, 'low parapet', [1, 11.4, z], [64, 1.15, .8], shadow);
  }
}

function makeForest(root: THREE.Group, trunkMat: THREE.Material, dark: THREE.Material,
  crownMat: THREE.Material): { forest: THREE.Group; trees: THREE.InstancedMesh[] } {
  const forest = new THREE.Group();
  forest.name = 'monsoon-rainforest';
  root.add(forest);
  const count = 230, trunkGeo = new THREE.CylinderGeometry(.65, .95, 1, 5);
  const crownGeo = new THREE.IcosahedronGeometry(1, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const crowns = new THREE.InstancedMesh(crownGeo, dark, count);
  const crownsTop = new THREE.InstancedMesh(crownGeo, crownMat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const z = 60 - random(i * 7 + 5) * 287;
    let x = (random(i * 5 + 7) - .5) * 230;
    const road = center(z), fork = forkAmount(z) * 27;
    if (Math.abs(x - road) < 21 || Math.abs(x - road - fork) < 15) x += x < road ? -28 : 28;
    // Reserve open sightlines to the guardian and waterfall/viaduct landmarks.
    if (Math.hypot(x + 58, z + 135) < 36) x = -112;
    if (Math.hypot(x - 56, z + 124) < 29) x = 105;
    const base = terrainHeight(x, z), h = 9 + 15 * random(i * 17 + 2);
    dummy.position.set(x, base + h / 2, z);
    dummy.scale.set(1 + random(i + 4), h, 1 + random(i + 8));
    dummy.rotation.set(0, random(i + 1) * Math.PI * 2, 0);
    dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = base + h + 2;
    dummy.scale.set(4.3 + random(i + 3) * 3, 4.1 + random(i + 9) * 3.6, 4.6);
    dummy.updateMatrix(); crowns.setMatrixAt(i, dummy.matrix);
    dummy.position.y += 4.7;
    dummy.scale.multiplyScalar(.72);
    dummy.updateMatrix(); crownsTop.setMatrixAt(i, dummy.matrix);
  }
  for (const mesh of [trunks, crowns, crownsTop]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    forest.add(mesh);
  }
  return { forest, trees: [trunks, crowns, crownsTop] };
}

function makeDetails(root: THREE.Group, stone: THREE.Material,
  leaf: THREE.Material): { details: THREE.Group; sway: THREE.Group } {
  const details = new THREE.Group();
  details.name = 'monsoon-detailed-foliage';
  root.add(details);
  const sway = new THREE.Group();
  sway.name = 'monsoon-swaying-plants';
  root.add(sway);
  for (let i = 0; i < 36; i++) {
    const z = 38 - i * 6.2, side = i % 2 ? 1 : -1;
    const x = center(z) + side * (14 + random(i + 33) * 16);
    const ground = terrainHeight(x, z);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), stone);
    rock.position.set(x, ground + .35, z);
    rock.scale.set(1.3, .9, 1.7);
    details.add(rock);
    if (i < 16) {
      const fern = new THREE.Mesh(new THREE.ConeGeometry(.95, 3.8, 5), leaf);
      fern.position.set(x + side * 1.6, ground + 1.9, z + 2);
      fern.rotation.z = side * .23;
      sway.add(fern);
    }
  }
  return { details, sway };
}

function makeMist(root: THREE.Group): THREE.Group {
  const mist = new THREE.Group();
  mist.name = 'monsoon-moving-mist';
  root.add(mist);
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(48 + i * 12, 9 + i * 3),
      new THREE.MeshBasicMaterial({ color: '#b6d2cb', opacity: .055, transparent: true,
        depthWrite: false, side: THREE.DoubleSide }));
    mesh.position.set(28 + i * 12, 10 + i * 3, -65 - i * 32);
    mesh.rotation.y = .17;
    mist.add(mesh);
  }
  return mist;
}

function makeRain(root: THREE.Group): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(560 * 6), 3));
  const rain = new THREE.LineSegments(geometry,
    new THREE.LineBasicMaterial({ color: '#b4dee0', transparent: true, opacity: .29,
      depthWrite: false }));
  rain.name = 'monsoon-rain';
  rain.frustumCulled = false;
  root.add(rain);
  return rain;
}

export function createUpcomingEnvironment(scene: THREE.Scene): Environment {
  const group = new THREE.Group();
  group.name = 'Monsoon Ruins live Three.js environment';
  scene.add(group);
  const stone = new THREE.MeshStandardMaterial({ color: color.stone, roughness: .94, flatShading: true });
  const shadow = new THREE.MeshStandardMaterial({ color: color.darkStone, roughness: .98 });
  const mud = new THREE.MeshStandardMaterial({ color: color.mud, roughness: .61, metalness: .06, side: THREE.DoubleSide });
  const water = new THREE.MeshStandardMaterial({ color: color.water, transparent: true, opacity: .78,
    roughness: .4, metalness: .07, side: THREE.DoubleSide, depthWrite: false });
  const foam = new THREE.MeshBasicMaterial({ color: '#c2ece9', transparent: true, opacity: .73, depthWrite: false });
  const ground = new THREE.Mesh(ribbon(45, -180, 14), mud);
  ground.name = 'monsoon-ground-road';
  ground.receiveShadow = true;
  group.add(ground);
  const air = new THREE.Mesh(ribbon(-42, -169, 9, true), stone);
  air.name = 'monsoon-elevated-shortcut';
  air.receiveShadow = true;
  group.add(air);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(760, 18, 12),
    new THREE.MeshBasicMaterial({ color: '#3e5e61', side: THREE.BackSide, depthWrite: false,
      fog: false }));
  sky.name = 'monsoon-overcast-sky';
  group.add(sky);
  const terrain = new THREE.Mesh(sculptTerrain(),
    new THREE.MeshStandardMaterial({ color: color.jungle, flatShading: true, roughness: .96,
      side: THREE.DoubleSide }));
  terrain.name = 'monsoon-sculpted-terrain';
  terrain.receiveShadow = true;
  group.add(terrain);
  const landing = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({
    color: '#9aa58a', metalness: .15, roughness: .48, transparent: true, opacity: .67,
    side: THREE.DoubleSide, depthWrite: false,
  }));
  landing.name = 'monsoon-landing-zone';
  landing.position.set(center(-168), roadHeight(-168) + .1, -168);
  landing.rotation.x = -Math.PI / 2;
  group.add(landing);
  for (const z of [18, -15, -37, -80, -103, -140]) {
    const puddle = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 5),
      new THREE.MeshStandardMaterial({ color: '#a1d2c6', roughness: .38, metalness: .12,
        transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite: false }));
    puddle.name = 'wet-road reflective puddle';
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(center(z) + (z % 2 ? -2.8 : 2.8), roadHeight(z) + .055, z);
    group.add(puddle);
  }
  makeTemple(group, stone, shadow);
  makeViaduct(group, stone, shadow);
  const flow = makeWaterfalls(group, stone, water, foam);
  const { trees } = makeForest(group,
    new THREE.MeshStandardMaterial({ color: '#294335', roughness: .99 }),
    new THREE.MeshStandardMaterial({ color: '#17443d', roughness: .99 }),
    new THREE.MeshStandardMaterial({ color: color.canopy, roughness: .93 }));
  const { details, sway } = makeDetails(group, stone,
    new THREE.MeshStandardMaterial({ color: '#3b8c65', roughness: .87, side: THREE.DoubleSide }));
  const mist = makeMist(group);
  const rain = makeRain(group);
  group.add(new THREE.HemisphereLight('#b5d7c6', '#193b30', .98));
  const day = new THREE.DirectionalLight('#d6ebe1', .9);
  day.position.set(-30, 95, 40);
  group.add(day);
  let disposed = false;
  const initialMistX = mist.children.map(node => node.position.x);
  const initialFernZ = sway.children.map(node => node.rotation.z);
  const startBandY = flow.children.map(node => node.position.y);

  function update(timeSeconds: number, quality: Quality = 'medium', reducedMotion = false): void {
    if (disposed) return;
    const low = quality === 'low', t = reducedMotion || !Number.isFinite(timeSeconds) ? 0 : timeSeconds;
    details.visible = !low;
    trees.forEach(mesh => { mesh.count = low ? 105 : quality === 'medium' ? 175 : 230; });
    for (let i = 0; i < sway.children.length; i++) {
      sway.children[i].visible = !low || i % 2 === 0;
      sway.children[i].rotation.z = initialFernZ[i] + (reducedMotion ? 0 : .14 * Math.sin(t * .92 + i * .6));
    }
    for (let i = 0; i < mist.children.length; i++) {
      mist.children[i].position.x = initialMistX[i] + (reducedMotion ? 0 : Math.sin(t * .13 + i) * 3);
    }
    for (let i = 0; i < flow.children.length; i++) {
      flow.children[i].visible = !low || i % 2 === 0;
      flow.children[i].position.y = startBandY[i] - (reducedMotion ? 0 : (t * 2.2 + i * .7) % 10);
    }
    rain.visible = !reducedMotion;
    const count = low ? 160 : quality === 'medium' ? 340 : 560;
    rain.geometry.setDrawRange(0, count * 2);
    if (reducedMotion) return;
    const position = rain.geometry.attributes.position as THREE.BufferAttribute;
    const array = position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const x = (random(i * 2 + 7) - .5) * 165;
      const z = 50 - random(i * 3 + 4) * 245;
      const phase = (random(i + 2) * 56 - t * 19) % 56;
      const y = 5 + (phase + 56) % 56;
      const at = i * 6;
      array[at] = x; array[at + 1] = y; array[at + 2] = z;
      array[at + 3] = x - .35; array[at + 4] = y - 1.8; array[at + 5] = z - .18;
    }
    position.needsUpdate = true;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    group.traverse(object => {
      // Instance GPU attributes have an independent lifecycle from shared shape geometry.
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        geometries.add(object.geometry);
        const owned = Array.isArray(object.material) ? object.material : [object.material];
        owned.forEach(material => materials.add(material));
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    group.removeFromParent();
  }

  update(0, 'high', false);
  return { group, update, dispose };
}
