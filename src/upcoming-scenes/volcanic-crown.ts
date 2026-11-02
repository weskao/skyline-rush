import * as THREE from 'three';

// Stage-1 HOME showroom slice only. The shared host owns the car, camera and render loop.
type Quality = 'low' | 'medium' | 'high';
type Environment = {
  group: THREE.Group;
  update(timeSeconds: number, quality: Quality, reducedMotion: boolean): void;
  dispose(): void;
};

const LAVA_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const LAVA_FRAGMENT = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float curl = sin(vUv.x * 13.0 + uTime * 0.22) * 0.24;
    float wave = sin(vUv.y * 25.0 - uTime * 0.85 + curl * 5.0);
    float vein = sin(vUv.x * 37.0 + vUv.y * 17.0 + uTime * 0.33);
    float hot = smoothstep(0.12, 0.89, wave * 0.40 + vein * 0.20 + 0.49);
    vec3 crust = vec3(0.14, 0.012, 0.009);
    vec3 magma = mix(vec3(0.62, 0.055, 0.009), vec3(1.0, 0.39, 0.045), hot);
    gl_FragColor = vec4(mix(crust, magma, 0.54 + hot * 0.46), 1.0);
  }
`;
const SPARK_VERTEX = `
  uniform float uTime;
  attribute float aSpeed;
  varying float vFade;
  void main() {
    float age = mod(uTime * aSpeed + aSpeed * 3.7, 8.0);
    vec3 p = position + vec3(sin(age + aSpeed * 8.0) * age * 0.12, age, 0.0);
    vFade = 1.0 - age / 8.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = 3.3;
  }
`;
const SPARK_FRAGMENT = `
  varying float vFade;
  void main() {
    float edge = length(gl_PointCoord - vec2(0.5));
    if (edge > 0.5) discard;
    gl_FragColor = vec4(1.0, 0.34, 0.08, vFade * (1.0 - edge));
  }
`;

function roadCurve(): THREE.CatmullRomCurve3 {
  // Main ground route deliberately skirts the rift in a large westward hairpin.
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 48), new THREE.Vector3(0, 0, 17),
    new THREE.Vector3(0, 0, -21), new THREE.Vector3(-7, 0, -45),
    new THREE.Vector3(-32, 0, -61), new THREE.Vector3(-46, 0, -81),
    new THREE.Vector3(-42, 0, -99), new THREE.Vector3(-17, 0, -106),
    new THREE.Vector3(19, 0, -109), new THREE.Vector3(38, 0, -123),
    new THREE.Vector3(25, 0, -146), new THREE.Vector3(2, 0, -173),
    new THREE.Vector3(-6, 0, -191),
  ], false, 'catmullrom', 0.35);
}

function roadRibbon(curve: THREE.CatmullRomCurve3, halfWidth = 7.4, y = 0.10): THREE.BufferGeometry {
  const positions: number[] = [], indices: number[] = [];
  const count = 144;
  for (let i = 0; i <= count; i++) {
    const t = i / count, p = curve.getPoint(t), tangent = curve.getTangent(t);
    const length = Math.hypot(tangent.x, tangent.z) || 1;
    const rightX = -tangent.z / length, rightZ = tangent.x / length;
    for (const side of [-1, 1]) positions.push(
      p.x + side * halfWidth * rightX, y, p.z + side * halfWidth * rightZ,
    );
    if (i < count) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function craterMesh(): THREE.BufferGeometry {
  const segments = 48, levels = [
    [73, -4], [64, 8], [49, 25], [32, 47], [25, 43], [19, 23], [13, 14],
  ];
  const positions: number[] = [], indices: number[] = [];
  for (let ring = 0; ring < levels.length; ring++) {
    const [radius, height] = levels[ring];
    for (let i = 0; i < segments; i++) {
      const theta = i * Math.PI * 2 / segments;
      const ridge = Math.sin(i * 2.13) * 2.4 + Math.cos(i * 0.71) * 3.7;
      const r = radius + ridge * (ring < 4 ? 1 : 0.20);
      positions.push(Math.cos(theta) * r, height + ridge * (ring === 3 ? 0.8 : 0.22), Math.sin(theta) * r);
      if (ring < levels.length - 1) {
        const a = ring * segments + i, b = ring * segments + (i + 1) % segments;
        indices.push(a, a + segments, b, b, a + segments, b + segments);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createUpcomingEnvironment(scene: THREE.Scene): Environment {
  const group = new THREE.Group();
  group.name = 'volcanic-crown';
  scene.add(group);
  let disposed = false;
  const rock = new THREE.MeshStandardMaterial({ color: '#27252a', roughness: 1, flatShading: true, side: THREE.DoubleSide });
  const cliff = new THREE.MeshStandardMaterial({ color: '#393237', roughness: 1, flatShading: true });
  const roadMaterial = new THREE.MeshStandardMaterial({ color: '#302b2e', roughness: 0.94, metalness: 0.09, side: THREE.DoubleSide });
  const shoulder = new THREE.LineBasicMaterial({ color: '#c79669' });
  const cyan = new THREE.MeshBasicMaterial({ color: '#50cbdf', transparent: true, opacity: 0.75, depthWrite: false });
  const ashMaterial = new THREE.MeshBasicMaterial({ color: '#777078', transparent: true, opacity: 0.14, depthWrite: false });
  const hazeMaterial = new THREE.MeshBasicMaterial({ color: '#ff873e', transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide });
  const lavaMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, vertexShader: LAVA_VERTEX, fragmentShader: LAVA_FRAGMENT,
    side: THREE.DoubleSide,
  });
  const path = roadCurve();
  const road = new THREE.Mesh(roadRibbon(path), roadMaterial);
  road.name = 'ground-road';
  group.add(road);
  const shelf = new THREE.Mesh(roadRibbon(path, 16, -0.30), rock);
  shelf.name = 'basalt-road-shelf';
  group.add(shelf);

  // Solid shoulders give the S bend / U turn a readable silhouette without a bloom pass.
  for (const side of [-1, 1]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 144; i++) {
      const t = i / 144, p = path.getPoint(t), tangent = path.getTangent(t);
      const length = Math.hypot(tangent.x, tangent.z) || 1;
      points.push(new THREE.Vector3(
        p.x - tangent.z / length * side * 7.2, 0.21,
        p.z + tangent.x / length * side * 7.2,
      ));
    }
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), shoulder);
    edge.name = 'road-edge';
    group.add(edge);
  }

  // One batched centre marker mesh, not a new draw call for each road dash.
  const dashes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.18, 0.035, 2.7),
    new THREE.MeshBasicMaterial({ color: '#e7b57b' }), 54,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 54; i++) {
    const t = (i + 0.5) / 54, p = path.getPoint(t), tangent = path.getTangent(t);
    dummy.position.set(p.x, 0.2, p.z);
    dummy.rotation.set(0, Math.atan2(-tangent.x, -tangent.z), 0);
    dummy.updateMatrix();
    dashes.setMatrixAt(i, dummy.matrix);
  }
  dashes.instanceMatrix.needsUpdate = true;
  dashes.name = 'road-dashes';
  group.add(dashes);

  const hairpin = new THREE.Group();
  hairpin.name = 'hairpin-curve';
  group.add(hairpin);
  const barrierGeo = new THREE.BoxGeometry(2.2, 1.15, 1.1);
  const barrierMaterial = new THREE.MeshStandardMaterial({ color: '#a85e40', roughness: 0.96 });
  for (let i = 0; i < 12; i++) {
    const t = 0.31 + i * 0.024, p = path.getPoint(t), tangent = path.getTangent(t);
    const len = Math.hypot(tangent.x, tangent.z) || 1;
    const guard = new THREE.Mesh(barrierGeo, barrierMaterial);
    guard.position.set(p.x - tangent.z / len * 9.1, 0.7, p.z + tangent.x / len * 9.1);
    guard.rotation.y = Math.atan2(-tangent.x, -tangent.z);
    hairpin.add(guard);
  }

  // Lower basalt shelves make the river a ravine, rather than a glowing floor texture.
  const bedrock = new THREE.Mesh(
    new THREE.BoxGeometry(300, 9, 295), rock,
  );
  bedrock.position.set(0, -10, -93);
  bedrock.name = 'basalt-bedrock';
  group.add(bedrock);
  const lavaPlane = (name: string, width: number, length: number, x: number, z: number, y: number) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length, 18, 40), lavaMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };
  lavaPlane('lava-chasm', 31, 114, 26, -114, -4.9);
  lavaPlane('lava-river', 63, 134, 78, -204, -5.3);

  // Ground route crosses its narrowest section on a *solid* basalt causeway.
  const causeway = new THREE.Mesh(new THREE.BoxGeometry(22, 4.4, 20), rock);
  causeway.position.set(19, -2.3, -110);
  causeway.name = 'basalt-causeway';
  group.add(causeway);

  // Mountain silhouette: a raised and hollow irregular crater with visible red throat.
  const volcano = new THREE.Mesh(craterMesh(), cliff);
  volcano.position.set(78, -3, -265);
  volcano.name = 'volcano-crater';
  group.add(volcano);
  const throat = new THREE.Mesh(new THREE.CircleGeometry(20, 48), lavaMaterial);
  throat.rotation.x = -Math.PI / 2;
  throat.position.set(78, 23, -265);
  throat.name = 'crater-magma';
  group.add(throat);
  const plume = new THREE.Group();
  plume.name = 'eruption-plume';
  plume.position.set(78, 46, -265);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(9, 27, 9),
    new THREE.MeshBasicMaterial({ color: '#ff6a21', transparent: true, opacity: 0.75, depthWrite: false }));
  flame.position.y = 12;
  plume.add(flame);
  group.add(plume);

  // Layered cliffs are kept behind the ground road's outer edges.
  const boulders = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0), rock, 88,
  );
  for (let i = 0; i < 88; i++) {
    const x = (i % 2 === 0 ? -1 : 1) * (75 + (i * 17 % 55));
    const z = 35 - (i * 53 % 266);
    const size = 5 + (i * 11 % 17);
    dummy.position.set(x, size * 0.30 - 4, z);
    dummy.rotation.set(i * 0.3, i * 1.17, i * 0.47);
    dummy.scale.set(size * 1.3, size * (0.85 + (i % 5) * 0.22), size);
    dummy.updateMatrix();
    boulders.setMatrixAt(i, dummy.matrix);
  }
  boulders.instanceMatrix.needsUpdate = true;
  boulders.name = 'basalt-cliffs';
  group.add(boulders);
  dummy.scale.set(1, 1, 1);

  // Big dark arch and lava falls are intentionally off the ground driving line.
  const arch = new THREE.Group();
  arch.name = 'basalt-arch';
  arch.position.set(39, 8, -91);
  group.add(arch);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(28, 5.5, 7, 34, Math.PI), cliff);
  arc.position.y = 8;
  arch.add(arc);
  for (const x of [-28, 28]) {
    const support = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 17, 7), rock);
    support.position.set(x, -0.5, 0);
    arch.add(support);
  }
  const fallMaterial = new THREE.MeshStandardMaterial({ color: '#e84d16', emissive: '#db3108', emissiveIntensity: 0.42, roughness: 0.55 });
  const falls: THREE.Mesh[] = [];
  for (const x of [-12, 11]) {
    const fall = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.8, 29, 7), fallMaterial);
    fall.position.set(x, -12, -2);
    arch.add(fall);
    falls.push(fall);
  }

  const launch = new THREE.Mesh(new THREE.BoxGeometry(15, 0.8, 15), rock);
  launch.position.set(0, -0.38, -35);
  launch.name = 'launch-pad';
  group.add(launch);
  const landing = new THREE.Mesh(new THREE.BoxGeometry(18, 0.85, 17), rock);
  landing.position.set(26, -0.4, -145);
  landing.name = 'landing-pad';
  group.add(landing);
  for (const [x, z] of [[-4, -36], [0, -36], [4, -36], [20, -146], [26, -146], [32, -146]]) {
    const arrow = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 4), cyan);
    arrow.position.set(x, 0.13, z);
    arrow.name = 'route-chevron';
    group.add(arrow);
  }
  const airCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.2, -36), new THREE.Vector3(10, 15, -70),
    new THREE.Vector3(33, 21, -108), new THREE.Vector3(26, 1.2, -145),
  ]);
  const flight = new THREE.Mesh(new THREE.TubeGeometry(airCurve, 60, 0.18, 5, false), cyan);
  flight.name = 'flight-arc';
  group.add(flight);

  const lavaLight = new THREE.PointLight('#ff7333', 8, 130, 2);
  lavaLight.position.set(29, 8, -102);
  lavaLight.name = 'lava-light';
  lavaLight.userData.baseIntensity = 8;
  group.add(lavaLight);

  // Single GPU particle batch; its uniform drives time, no per-frame buffer uploads.
  const particleCount = 48, particlePositions: number[] = [], speeds: number[] = [];
  for (let i = 0; i < particleCount; i++) {
    particlePositions.push(16 + (i * 23 % 43), -1 + (i * 7 % 5), -61 - (i * 41 % 115));
    speeds.push(0.31 + (i * 13 % 19) / 21);
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute('aSpeed', new THREE.Float32BufferAttribute(speeds, 1));
  const sparkMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, vertexShader: SPARK_VERTEX, fragmentShader: SPARK_FRAGMENT,
    transparent: true, depthWrite: false,
  });
  const sparks = new THREE.Points(particleGeo, sparkMaterial);
  sparks.name = 'lava-sparks';
  group.add(sparks);

  const smoke = new THREE.Group();
  smoke.name = 'volcanic-ash';
  group.add(smoke);
  const smokeGeo = new THREE.IcosahedronGeometry(1, 1);
  const smokeOrigins: THREE.Vector3[] = [];
  for (let i = 0; i < 7; i++) {
    const blob = new THREE.Mesh(smokeGeo, ashMaterial);
    const origin = new THREE.Vector3(71 + i * 4, 55 + i * 3.1, -265 - (i % 3) * 4);
    blob.position.copy(origin);
    blob.scale.set(9 + i % 3 * 3, 4 + i % 4 * 2, 7 + i % 3 * 4);
    smokeOrigins.push(origin);
    smoke.add(blob);
  }

  // Low-alpha heat distortion silhouettes stay beside, never across, the road.
  const haze = new THREE.Group();
  haze.name = 'heat-haze';
  group.add(haze);
  const hazeGeo = new THREE.PlaneGeometry(17, 12);
  for (let i = 0; i < 4; i++) {
    const shimmer = new THREE.Mesh(hazeGeo, hazeMaterial);
    shimmer.position.set(34 + (i % 2) * 8, 2.7, -77 - i * 26);
    shimmer.rotation.y = 0.21;
    haze.add(shimmer);
  }

  function update(timeSeconds: number, quality: Quality, reducedMotion: boolean): void {
    if (disposed) return;
    const t = reducedMotion || !Number.isFinite(timeSeconds) ? 0 : timeSeconds % 10000;
    lavaMaterial.uniforms.uTime.value = t;
    sparkMaterial.uniforms.uTime.value = t;
    lavaLight.intensity = reducedMotion ? 8 : 8 + Math.sin(t * 0.83) * 1.4;
    plume.scale.y = reducedMotion ? 1 : 1 + Math.sin(t * 0.38) * 0.12;
    sparks.visible = quality !== 'low' && !reducedMotion;
    particleGeo.setDrawRange(0, quality === 'high' ? particleCount : 18);
    smoke.visible = quality !== 'low' && !reducedMotion;
    haze.visible = quality !== 'low' && !reducedMotion;
    if (!reducedMotion) {
      smoke.children.forEach((child, i) => {
        child.position.copy(smokeOrigins[i]);
        child.position.x += Math.sin(t * 0.13 + i) * (quality === 'high' ? 2.5 : 1.1);
        child.position.y += Math.sin(t * 0.20 + i * 0.8) * 1.3;
        child.visible = quality === 'high' || i < 3;
      });
      haze.children.forEach((child, i) => { child.scale.y = 1 + Math.sin(t * 0.58 + i) * 0.12; });
      falls.forEach((fall, i) => { fall.scale.x = 1 + Math.sin(t * 0.69 + i) * 0.08; });
    } else {
      smoke.children.forEach((child, i) => child.position.copy(smokeOrigins[i]));
      haze.children.forEach(child => { child.scale.y = 1; });
      falls.forEach(fall => { fall.scale.x = 1; });
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    group.parent?.remove(group);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    group.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        const owned = Array.isArray(object.material) ? object.material : [object.material];
        owned.forEach(material => materials.add(material));
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    group.clear();
  }

  update(0, 'high', false);
  return { group, update, dispose };
}
