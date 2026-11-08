import * as THREE from 'three';

type Quality = 'low' | 'medium' | 'high';
type Environment = {
  group: THREE.Group;
  update(timeSeconds: number, quality: Quality, reducedMotion: boolean): void;
  dispose(): void;
};

const SAND = 0xd99445;
const STONE = 0xa65535;
const ROAD_WIDTH = 14;
const WAYPOINTS: [number, number, number][] = [
  // The first 46 m run straight under the shared showcase player and rival slots (x 0..4.5).
  [0, 0, 54], [0, 0, 28], [0, 0, 0], [1, 0, -24], [3, 0, -44],
  [-14, 0, -60], [-45, 0, -53], [-62, 0, -35], [-73, 0, -18],
  [-86, 0, -22], [-98, 0, -51], [-90, 0, -81], [-63, 0, -99],
  [-27, 0, -105], [8, 0, -113], [31, 0, -132], [28, 0, -151],
  [8, 0, -161], [-6, 0, -149], [-21, 0, -138], [-35, 0, -150],
  [-29, 0, -175], [-10, 0, -196],
];

function path(points: [number, number, number][]) {
  return new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
}

function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, material: THREE.Material,
  name: string, segments = 132): THREE.Mesh {
  const vertices: number[] = [], indices: number[] = [];
  const point = new THREE.Vector3(), tangent = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPoint(t, point);
    curve.getTangent(t, tangent);
    const length = Math.hypot(tangent.x, tangent.z) || 1;
    const rx = -tangent.z / length, rz = tangent.x / length;
    const half = width * (name === 'Air corridor' ? 0.45 + 0.55 * Math.sin(Math.PI * t) : 0.5);
    vertices.push(point.x - rx * half, point.y + (name === 'Ground road shoulder' ? -0.08 : 0.10), point.z - rz * half,
      point.x + rx * half, point.y + (name === 'Ground road shoulder' ? -0.08 : 0.10), point.z + rz * half);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.receiveShadow = true;
  return mesh;
}

function terrain(road: THREE.Curve<THREE.Vector3>): THREE.Mesh {
  // The road's sampled footprint carves a clear lane into the authored height field.
  const roadPoints = Array.from({ length: 95 }, (_, i) => road.getPoint(i / 94));
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const color = new THREE.Color();
  const across = 55, deep = 55;
  for (let z = 0; z <= deep; z++) for (let x = 0; x <= across; x++) {
    const px = -180 + (360 * x / across), pz = 78 - (355 * z / deep);
    let distance2 = Infinity;
    for (const p of roadPoints) {
      const dx = px - p.x, dz = pz - p.z;
      distance2 = Math.min(distance2, dx * dx + dz * dz);
    }
    const distance = Math.sqrt(distance2);
    const ridge = Math.min(40, Math.max(0, distance - 13) * 0.92);
    const wave = (3.7 * Math.sin(px * 0.057) + 3.4 * Math.cos(pz * 0.05)
      + 1.8 * Math.sin((px + pz) * 0.093)) * Math.min(1, Math.max(0, (distance - 9) / 24));
    const canyonX = Math.max(0, Math.min(1, (px - 28) / 18, (112 - px) / 20));
    const canyonZ = Math.max(0, Math.min(1, (-pz - 48) / 25));
    const abyss = 57 * canyonX * canyonZ * Math.min(1, Math.max(0, (distance - 15) / 16));
    const height = -0.52 + ridge + wave - abyss;
    positions.push(px, height, pz);
    color.set(height < -19 ? 0x593324 : height > 19 ? 0xc47a42 : SAND);
    color.offsetHSL(0, 0, Math.sin(px * 0.11 + pz * 0.065) * 0.035);
    colors.push(color.r, color.g, color.b);
    if (x < across && z < deep) {
      const a = z * (across + 1) + x, b = a + 1, c = a + across + 1;
      indices.push(a, b, c, b, c + 1, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const result = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, side: THREE.DoubleSide, flatShading: true,
  }));
  result.name = 'Canyon terrain';
  result.receiveShadow = true;
  return result;
}

function stoneRing(x: number, y: number, z: number, radius: number, name: string): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, radius * 0.16, 8, 36),
    new THREE.MeshStandardMaterial({ color: 0x9f6548, roughness: 1, flatShading: true }),
  );
  ring.rotation.y = -0.24;
  group.add(ring);
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.19, radius * 0.28, radius * 0.75, 8),
    new THREE.MeshStandardMaterial({ color: STONE, roughness: 1, flatShading: true }),
  );
  for (const side of [-1, 1]) {
    const support = foot.clone();
    support.position.set(side * radius * 0.88, -radius * 0.82, 0);
    group.add(support);
  }
  return group;
}

function ruins(): THREE.Group {
  const result = new THREE.Group();
  result.name = 'Ancient cliff ruins';
  const stone = new THREE.MeshStandardMaterial({ color: 0x8e5239, roughness: 0.95 });
  const columnGeometry = new THREE.CylinderGeometry(2.6, 3.6, 28, 8);
  for (let i = 0; i < 9; i++) {
    const column = new THREE.Mesh(columnGeometry, stone);
    column.position.set(90 + (i % 3) * 14, 18, -169 - Math.floor(i / 3) * 13);
    column.scale.y = 0.5 + ((i * 7) % 6) / 14;
    result.add(column);
  }
  const crown = new THREE.Mesh(new THREE.BoxGeometry(59, 5, 10), stone);
  crown.position.set(103, 29, -183);
  result.add(crown);
  return result;
}

export function createUpcomingEnvironment(scene: THREE.Scene): Environment {
  const group = new THREE.Group();
  group.name = 'Dune Tempest environment';
  scene.add(group);
  const ownedFog = new THREE.FogExp2(0xe4ae81, 0.0013);
  const previousFog = scene.fog;
  scene.fog = ownedFog;
  let disposed = false;
  const add = <T extends THREE.Object3D>(object: T): T => { group.add(object); return object; };

  const roadPath = path(WAYPOINTS);
  // Packed ochre track, darker than the dunes, so pale paints (Pearl, rivals) read against it.
  const surface = new THREE.MeshStandardMaterial({ color: 0xa8703f, roughness: 1, side: THREE.DoubleSide });
  add(terrain(roadPath));
  add(ribbon(roadPath, ROAD_WIDTH + 6,
    new THREE.MeshStandardMaterial({ color: 0x8a5634, roughness: 1, side: THREE.DoubleSide }),
    'Ground road shoulder'));
  add(ribbon(roadPath, ROAD_WIDTH, surface, 'Ground sand road'));

  const sandRock = new THREE.MeshStandardMaterial({ color: STONE, roughness: 1, flatShading: true });
  const markerGeometry = new THREE.DodecahedronGeometry(4.4, 0);
  for (const [name, x, z] of [['Hairpin west', -113, -25], ['Hairpin east', 48, -138]] as const) {
    const rock = new THREE.Mesh(markerGeometry, sandRock);
    rock.name = name;
    rock.position.set(x, 3, z);
    add(rock);
  }
  add(stoneRing(26, 27, -109, 23, 'Monumental stone ring'));
  add(stoneRing(6, 19, -222, 14, 'Distant stone ring'));
  add(ruins());

  const escarpment = new THREE.Group();
  escarpment.name = 'Canyon escarpment';
  const cliffGeo = new THREE.CylinderGeometry(10, 16, 53, 7);
  for (let i = 0; i < 10; i++) {
    const cliff = new THREE.Mesh(cliffGeo, sandRock);
    cliff.position.set(112 + (i % 3) * 11, 15 + (i % 4) * 2, -30 - i * 21);
    cliff.scale.set(0.85 + i % 2 * 0.2, 0.8 + (i % 3) * 0.1, 1.2);
    escarpment.add(cliff);
  }
  add(escarpment);

  const branchStone = new THREE.MeshStandardMaterial({ color: 0xb88e63, roughness: 0.94, side: THREE.DoubleSide });
  const departure = path([[-63, 0, -99], [-42, 3, -96], [-24, 7, -90], [-5, 12, -93]]);
  const air = path([[-5, 12, -93], [14, 18, -103], [42, 23, -123], [62, 20, -138]]);
  const touchdown = path([[62, 20, -138], [49, 14, -151], [30, 6, -157], [8, 0, -161]]);
  add(ribbon(departure, 13, branchStone, 'Flight takeoff', 36));
  add(ribbon(air, 9, new THREE.MeshStandardMaterial({
    color: 0xf8d49b, roughness: 0.65, transparent: true, opacity: 0.67, side: THREE.DoubleSide,
    depthWrite: false,
  }), 'Air corridor', 44));
  add(ribbon(touchdown, 15, branchStone, 'Flight landing', 36));

  const arches = new THREE.Group();
  arches.name = 'Viaduct arches';
  const pierGeometry = new THREE.CylinderGeometry(1.8, 3.0, 19, 7);
  for (let i = 0; i < 7; i++) {
    const p = touchdown.getPoint(i / 7);
    const pier = new THREE.Mesh(pierGeometry, sandRock);
    pier.position.set(p.x, p.y - 10, p.z);
    arches.add(pier);
  }
  add(arches);
  const beacon = new THREE.Mesh(new THREE.TorusGeometry(9, 0.55, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xfce0a6, transparent: true, opacity: 0.72 }));
  beacon.name = 'Landing beacon';
  beacon.position.set(20, 11, -156);
  beacon.rotation.y = 0.4;
  add(beacon);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 16, 10),
    new THREE.MeshBasicMaterial({ color: 0xf6d1a7, side: THREE.BackSide, fog: false }));
  sky.name = 'Sunset sky';
  add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffcf83, fog: false }));
  sun.name = 'Sunset sun';
  sun.position.set(112, 80, -249);
  add(sun);
  // Stacked on the showcase's own lights: brighter washes sand, sky and pale cars into one glare.
  add(new THREE.HemisphereLight(0xffdeb2, 0x76503a, 0.95));
  const light = new THREE.DirectionalLight(0xffbb72, 1.05);
  light.position.set(80, 140, -125);
  add(light);

  const count = 160, initial = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    initial[i * 3] = side * (18 + (i * 47 % 62));
    initial[i * 3 + 1] = 1.8 + (i * 17 % 48) / 8;
    initial[i * 3 + 2] = 18 - (i * 89 % 226);
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(initial.slice(), 3));
  dustGeometry.setDrawRange(0, count);
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
    color: 0xf6ce99, size: 1.1, transparent: true, opacity: 0.26,
    depthWrite: false, sizeAttenuation: true,
  }));
  dust.name = 'Windblown sand particles';
  dust.frustumCulled = false;
  add(dust);

  const ribbons: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const wisp = new THREE.Mesh(new THREE.PlaneGeometry(33, 7),
      new THREE.MeshBasicMaterial({ color: 0xeec08a, transparent: true,
        opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
    wisp.name = 'Dust ribbon ' + i;
    wisp.position.set((i % 2 ? -1 : 1) * (38 + i * 9), 6 + i, -55 - i * 37);
    wisp.rotation.y = -0.33;
    add(wisp);
    ribbons.push(wisp);
  }
  const ribbonX = ribbons.map(r => r.position.x);

  const update = (timeSeconds: number, quality: Quality, reducedMotion: boolean): void => {
    if (disposed) return;
    const time = reducedMotion || !Number.isFinite(timeSeconds) ? 0 : timeSeconds;
    const budget = quality === 'high' ? count : quality === 'medium' ? 86 : 28;
    dustGeometry.setDrawRange(0, budget);
    // A slow, bounded golden-hour shift keeps the distant haze alive without flicker.
    ownedFog.density = (quality === 'low' ? 0.001 : 0.0013)
      + 0.00007 * Math.sin(time * 0.05);
    light.intensity = 1.05 + 0.09 * Math.sin(time * 0.045);
    const positions = dustGeometry.getAttribute('position') as THREE.BufferAttribute;
    const data = positions.array as Float32Array;
    for (let i = 0; i < budget; i++) {
      const at = i * 3;
      data[at] = initial[at] + 7 * Math.sin(time * 0.23 + i * 0.19);
      data[at + 1] = initial[at + 1] + 1.2 * Math.sin(time * 0.38 + i * 0.35);
      data[at + 2] = initial[at + 2] - 6 * Math.sin(time * 0.17 + i * 0.12);
    }
    positions.needsUpdate = true;
    ribbons.forEach((r, i) => {
      r.visible = quality !== 'low' && !reducedMotion;
      r.position.x = ribbonX[i] + 5 * Math.sin(time * 0.16 + i * 0.7);
    });
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    if (scene.fog === ownedFog) scene.fog = previousFog;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
      geometries.add(object.geometry);
      const resources = Array.isArray(object.material) ? object.material : [object.material];
      resources.forEach(material => materials.add(material));
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    group.clear();
  };
  update(0, 'high', false);
  return { group, update, dispose };
}
