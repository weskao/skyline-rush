import * as THREE from 'three';
import { roadRibbon } from './geometry.js';
import { skyFrame, skyPoint, skyPosition, skyGapAt, SKY_SPIRAL } from './sky-track.js';

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
    color: '#111827', metalness: 0.42, roughness: 0.35, side: THREE.DoubleSide,
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
  function pose(instance, index, s, lateral, rise, width, height, depth, origin) {
    const frame = skyFrame(s);
    const [x, y, z] = skyPosition(s, lateral, rise, origin);
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

  return {
    update(distance, quality = 'high') {
      group.visible = true;
      const origin = skyPoint(distance);
      landmark.position.set(SKY_SPIRAL.radius - origin.x, -origin.y, -SKY_SPIRAL.start - origin.z);
      skyline.position.set(-origin.x, -origin.y, -origin.z);
      fogBanks.position.copy(skyline.position);
      skyline.visible = quality !== 'low';
      fogBanks.visible = quality === 'high';
      const start = Math.max(0, Math.floor((distance - 140) / STEP) * STEP);
      for (let i = 0; i <= ROWS; i++) {
        const s = Math.min(5600, start + i * STEP);
        const frame = skyFrame(s);
        for (let side = 0; side < 2; side++) {
          const [x, y, z] = skyPosition(s, side ? WIDTH : -WIDTH, 0, distance);
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
          pose(borders, i * 2 + side, mid, side ? 12.1 : -12.1, 0.17, 0.16, 0.12, STEP, distance);
          pose(rails, i * 2 + side, mid, side ? 12.9 : -12.9, 0.60, 0.38, 1.1, STEP, distance);
          pose(beacons, i * 2 + side, mid, side ? 12.75 : -12.75, 1.12, 0.08, 0.09, STEP, distance);
        }
        for (let lane = 0; lane < 3; lane++) {
          pose(laneLines, i * 3 + lane, mid, (lane - 1) * 5, 0.025, 0.14, 0.03, 4.0, distance);
        }
      }
      for (const attribute of [geometry.attributes.position, geometry.attributes.normal, geometry.index]) attribute.needsUpdate = true;
      for (const mesh of [borders, rails, beacons, laneLines]) mesh.instanceMatrix.needsUpdate = true;
    },
    hide() { group.visible = false; },
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      road.material.dispose();
      for (const mat of [cyan, magenta, stripes, concrete, cloudMat]) mat.dispose();
      for (const mesh of [borders, rails, beacons, laneLines]) mesh.dispose();
      skylineMesh.dispose();
      skylineLights.dispose();
      towerGeo.dispose();
      cloudGeometry.dispose();
    },
  };
}
