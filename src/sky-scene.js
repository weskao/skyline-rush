import * as THREE from 'three';
import { roadRibbon } from './geometry.ts';
import { skyFrame, skyPoint, skyPosition, skyGapAt, SKY_SPIRAL } from './sky-track.ts';

// A dedicated, bounded 3D road renderer. The existing four flat tracks keep
// their original geometry and fast path untouched.
const ROWS = 180;
const STEP = 10;
const WIDTH = 12;
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

export function createSkyScene(scene) {
  const group = new THREE.Group();
  group.name = 'Sky Spiral 3D course';
  scene.add(group);

  const geometry = roadRibbon(ROWS);
  const [positions, normals, indices] = [geometry.attributes.position.array, geometry.attributes.normal.array, geometry.index.array];
  const road = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: '#202b42', metalness: 0.13, roughness: 0.70, side: THREE.DoubleSide,
  }));
  road.frustumCulled = false;
  group.add(road);

  const cyan = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.0, 1.55, 2.4) });
  const magenta = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.16, 1.25) });
  const stripes = new THREE.MeshBasicMaterial({ color: '#9ac4dc' });
  const concrete = new THREE.MeshStandardMaterial({ color: '#394363', metalness: 0.5, roughness: 0.55 });
  const borders = new THREE.InstancedMesh(boxGeometry, cyan, ROWS * 2);
  const laneLines = new THREE.InstancedMesh(boxGeometry, stripes, ROWS * 3);
  const rails = new THREE.InstancedMesh(boxGeometry, concrete, ROWS * 2);
  const beacons = new THREE.InstancedMesh(boxGeometry, magenta, ROWS * 2);
  for (const mesh of [borders, laneLines, rails, beacons]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    group.add(mesh);
  }

  const object = new THREE.Object3D();
  const basis = new THREE.Matrix4();
  const rightVector = new THREE.Vector3();
  const upVector = new THREE.Vector3();
  const backVector = new THREE.Vector3();
  function pose(instance, index, s, lateral, rise, width, height, depth, origin, endless = false) {
    const frame = skyFrame(s, endless);
    const [x, y, z] = skyPosition(s, lateral, rise, origin, endless);
    rightVector.fromArray(frame.right);
    upVector.fromArray(frame.up);
    backVector.fromArray(frame.forward).negate();
    basis.makeBasis(rightVector, upVector, backVector);
    object.position.set(x, y, z);
    object.quaternion.setFromRotationMatrix(basis);
    object.scale.set(width, height, depth);
    object.updateMatrix();
    instance.setMatrixAt(index, object.matrix);
  }

  // Hand-built hero architecture gives the spiral scale and a unique silhouette.
  const landmark = new THREE.Group();
  group.add(landmark);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(18, 30, 230, 12),
    new THREE.MeshStandardMaterial({ color: '#1c244a', metalness: 0.82, roughness: 0.25 }));
  tower.position.y = 74;
  landmark.add(tower);
  const towerCore = new THREE.Mesh(new THREE.CylinderGeometry(20, 32, 238, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: '#392d88', wireframe: true, transparent: true, opacity: 0.72 }));
  towerCore.position.y = 74;
  landmark.add(towerCore);
  for (let i = 0; i < 9; i++) {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(23 + (i % 3) * 4, 0.45, 6, 56),
      i % 2 ? cyan : magenta);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -25 + i * 25;
    landmark.add(halo);
  }
  // Keep two absolute-distance landmarks so a visible tower never teleports
  // when the endless course streams into the next repeat.
  const nextLandmark = landmark.clone(true);
  nextLandmark.visible = false;
  group.add(nextLandmark);
  // Four shared material variants per hero, created once. Never fade the
  // original neon rail/beacon materials along with the landmark.
  const originalTowerMaterials = [tower.material, towerCore.material];
  const landmarkMaterials = [landmark, nextLandmark].map(hero => {
    const variants = new Map();
    hero.traverse(mesh => {
      if (!mesh.isMesh) return;
      const source = mesh.material;
      if (!variants.has(source)) {
        const material = source.clone();
        material.transparent = true;
        material.depthWrite = false;
        variants.set(source, { material, opacity: source.opacity });
      }
      mesh.material = variants.get(source).material;
    });
    return [...variants.values()];
  });
  const skyline = new THREE.Group();
  group.add(skyline);
  const towerGeo = new THREE.BoxGeometry(1, 1, 1);
  const skylineMesh = new THREE.InstancedMesh(towerGeo,
    new THREE.MeshStandardMaterial({ color: '#202e56', metalness: 0.55, roughness: 0.48 }), 86);
  const skylineLights = new THREE.InstancedMesh(towerGeo, magenta, 86);
  skyline.add(skylineMesh, skylineLights);
  for (let i = 0; i < 86; i++) {
    const angle = i * 2.399963;
    const radius = 320 + (i * 41 % 480);
    const height = 45 + (i * 31 % 135);
    const x = Math.cos(angle) * radius + SKY_SPIRAL.radius;
    const z = Math.sin(angle) * radius - SKY_SPIRAL.start;
    object.position.set(x, height / 2 - 100, z);
    object.quaternion.identity();
    object.scale.set(16 + i % 5 * 7, height, 16 + i % 4 * 6);
    object.updateMatrix();
    skylineMesh.setMatrixAt(i, object.matrix);
    object.position.set(x, height - 98, z);
    object.scale.set(19 + i % 5 * 7, 0.8, 19 + i % 4 * 6);
    object.updateMatrix();
    skylineLights.setMatrixAt(i, object.matrix);
  }
  skylineMesh.instanceMatrix.needsUpdate = skylineLights.instanceMatrix.needsUpdate = true;

  // This dome is the course's own sky. world.js hides the shared sky while it is up.
  const backdrop = new THREE.Mesh(new THREE.SphereGeometry(2200, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vPosition; uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec3 dir=normalize(vPosition);float h=dir.y;
        vec3 col=mix(vec3(.22,.12,.42),vec3(.012,.027,.09),smoothstep(-.15,.72,h));
        vec2 grid=dir.xy*220.;
        float stars=step(.985,hash(floor(grid)))*(1.-smoothstep(.02,.16,length(fract(grid)-.5)));
        col+=vec3(.75,.9,1.)*stars*smoothstep(0.,.2,h);
        float spin=atan(dir.x,dir.z);
        float band=smoothstep(-.05,.2,h)*(1.-smoothstep(.55,.9,h));
        col+=vec3(0.,.85,1.)*pow(max(0.,sin(spin*3.+h*22.+time)),24.)*band;
        col+=vec3(.85,.12,.72)*pow(max(0.,sin(spin*3.+h*22.+time+2.2)),24.)*band*.85;
        col=mix(col,vec3(.04,.05,.16),smoothstep(.08,-.2,h));
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  backdrop.name = 'Sky Spiral backdrop';
  backdrop.frustumCulled = false;
  group.add(backdrop);

  const fogBanks = new THREE.Group();
  group.add(fogBanks);
  const cloudMat = new THREE.MeshBasicMaterial({ color: '#5c639f', transparent: true, opacity: 0.085, depthWrite: false });
  const cloudGeometry = new THREE.SphereGeometry(1, 10, 6);
  for (let i = 0; i < 24; i++) {
    const angle = i * 2.39996;
    const cloud = new THREE.Mesh(cloudGeometry, cloudMat);
    cloud.position.set(SKY_SPIRAL.radius + Math.sin(angle) * (210 + i % 7 * 65), 12 + i % 5 * 6,
      -SKY_SPIRAL.start + Math.cos(angle) * (200 + i % 7 * 65));
    cloud.scale.set(85 + i % 5 * 13, 6 + i % 3 * 4, 70 + i % 4 * 20);
    fogBanks.add(cloud);
  }
  group.visible = false;
  let lastRoadStart = null;
  const roadInstances = [borders, rails, beacons, laneLines];

  return {
    update(distance, quality = 'high', endless = false) {
      group.visible = true;
      backdrop.material.uniforms.time.value = distance * 0.0015;
      const origin = skyPoint(distance, endless);
      // Loop existing architecture in the camera's streaming window without new GPU allocations.
      const extension=endless&&distance>5600;
      if (extension) {
        const anchor = 5600 + Math.max(1, Math.floor((distance - 5600) / 1800)) * 1800;
        for (const [index, [hero, at]] of [[landmark, anchor], [nextLandmark, anchor + 1800]].entries()) {
          const t = Math.max(0, Math.min(1, (1700 - Math.abs(at - distance)) / 500));
          const opacity = t * t * (3 - 2 * t);
          hero.visible = opacity > 0;
          for (const variant of landmarkMaterials[index]) variant.material.opacity = variant.opacity * opacity;
          hero.position.set(SKY_SPIRAL.radius - origin.x, -origin.y, skyPoint(at, true).z - origin.z);
        }
      } else {
        landmark.visible = true;
        nextLandmark.visible = false;
        for (const variant of landmarkMaterials[0]) variant.material.opacity = variant.opacity;
        landmark.position.set(SKY_SPIRAL.radius - origin.x, -origin.y, -SKY_SPIRAL.start - origin.z);
      }
      skyline.position.set(-origin.x,-origin.y,(extension?skyPoint(distance+900,endless).z+SKY_SPIRAL.start:0)-origin.z);
      fogBanks.position.copy(skyline.position);
      skyline.visible = quality !== 'low';
      fogBanks.visible = quality === 'high';
      const start = Math.max(0, Math.floor((distance - 140) / STEP) * STEP);
      // Transform the static world-space road into camera-relative coordinates.
      // Geometry and matrices change only when a 10m stream sector changes.
      road.position.set(-origin.x, -origin.y, -origin.z);
      for (const mesh of roadInstances) mesh.position.copy(road.position);
      if (start !== lastRoadStart) {
      for (let i = 0; i <= ROWS; i++) {
        const s = endless ? start + i * STEP : Math.min(5600, start + i * STEP);
        const frame = skyFrame(s,endless);
        for (let side = 0; side < 2; side++) {
          const [x, y, z] = skyPosition(s, side ? WIDTH : -WIDTH, 0, 0, endless);
          const offset = (i * 2 + side) * 3;
          positions.set([x, y, z], offset);
          normals.set(frame.up, offset);
        }
        if (i === ROWS) continue;
        const gap = skyGapAt(s + STEP * 0.5);
        const a = i * 2, k = i * 6;
        indices.set(gap ? [a, a, a, a, a, a] : [a, a + 1, a + 2, a + 1, a + 3, a + 2], k);
        const mid = s + STEP * 0.5;
        for (let side = 0; side < 2; side++) {
          pose(borders, i * 2 + side, mid, side ? 12.1 : -12.1, 0.17, 0.16, 0.12, STEP, 0, endless);
          pose(rails, i * 2 + side, mid, side ? 12.9 : -12.9, 0.60, 0.38, 1.1, STEP, 0, endless);
          pose(beacons, i * 2 + side, mid, side ? 12.75 : -12.75, 1.12, 0.08, 0.09, STEP, 0, endless);
        }
        for (let lane = 0; lane < 3; lane++) {
          pose(laneLines, i * 3 + lane, mid, (lane - 1) * 5, 0.025, 0.14, 0.03, 4.0, 0, endless);
        }
      }
      for (const attribute of [geometry.attributes.position, geometry.attributes.normal, geometry.index]) attribute.needsUpdate = true;
      for (const mesh of roadInstances) mesh.instanceMatrix.needsUpdate = true;
      lastRoadStart = start;
      }
    },
    hide() { group.visible = false; },
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      road.material.dispose();
      for (const variants of landmarkMaterials) for (const { material } of variants) material.dispose();
      for (const material of originalTowerMaterials) material.dispose();
      for (const mat of [cyan, magenta, stripes, concrete, cloudMat, backdrop.material]) mat.dispose();
      backdrop.geometry.dispose();
      for (const mesh of [borders, rails, beacons, laneLines]) mesh.dispose();
      skylineMesh.dispose();
      skylineLights.dispose();
      towerGeo.dispose();
      cloudGeometry.dispose();
    },
  };
}
