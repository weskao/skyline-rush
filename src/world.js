import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RACE_LENGTH } from './game.js';
import { carShell } from './geometry.js';

const roadCenter = distance => Math.sin(distance / 270) * 18 + Math.sin(distance / 610) * 25;
const roadHeading = distance => Math.atan((roadCenter(distance + 1) - roadCenter(distance - 1)) / 2);
const box = new THREE.BoxGeometry(1, 1, 1);
const matrix = new THREE.Matrix4();
const rotation = new THREE.Quaternion();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();

function material(color, metalness = 0, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function block(parent, mat, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(box, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}

const bodyGeometry = carShell([[-2.28, 0.92, 0.5, 0.78], [-1.48, 1.1, 0.44, 1.02], [1.36, 1.12, 0.44, 1.04], [2.22, 1.02, 0.52, 0.93]]);
const cabinGeometry = (() => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.91, 1, -1.03, 0.91, 1, -1.03, 0.9, 1.02, 1.32, -0.9, 1.02, 1.32,
    -0.7, 1.59, -0.35, 0.7, 1.59, -0.35, 0.73, 1.59, 0.63, -0.73, 1.59, 0.63,
  ], 3));
  geometry.setIndex([0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0, 4, 7, 6, 4, 6, 5]);
  geometry.computeVertexNormals();
  return geometry;
})();

function makeCar(color, detailed = false) {
  const group = new THREE.Group();
  const paint = material(color, 0.55, 0.25);
  const black = material('#101923', 0.4, 0.4);
  const glass = material('#172e40', 0.85, 0.16);
  const red = new THREE.MeshBasicMaterial({ color: '#ff3d40' });
  const white = new THREE.MeshBasicMaterial({ color: '#cceeff' });
  block(group, black, 0, 0.48, 0, 2.08, 0.26, 4.38);
  const body = new THREE.Mesh(bodyGeometry, paint);
  group.add(body);
  const hood = block(group, paint, 0, 1, -1.4, 2.07, 0.15, 1.45);
  hood.rotation.x = -0.07;
  const cabin = new THREE.Mesh(cabinGeometry, glass);
  group.add(cabin);
  block(group, paint, 0, 1.6, 0.14, 1.43, 0.045, 1.01);
  block(group, paint, 0, 1.08, 1.52, 2.06, 0.18, 1.01);
  block(group, red, 0, 0.98, 2.24, 1.97, 0.065, 0.05);
  block(group, black, 0, 0.7, 2.25, 1.5, 0.17, 0.04);
  block(group, paint, 0, 1.18, 1.99, 2.16, 0.07, 0.28);
  for (const side of [-1, 1]) {
    block(group, white, side * 0.78, 0.94, -2.23, 0.46, 0.055, 0.05);
    block(group, black, side * 1.17, 1.19, -0.38, 0.22, 0.14, 0.36);
    block(group, black, side * 1.09, 0.55, 0.04, 0.04, 0.13, 2.32);
  }
  const wheels = [];
  const tires = material('#101114');
  const rims = material('#8a96a0', 0.85, 0.22);
  const tireGeometry = new THREE.CylinderGeometry(0.44, 0.44, 0.27, 16);
  const rimGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.285, 10);
  for (const x of [-1.05, 1.05]) for (const z of [-1.35, 1.42]) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(tireGeometry, tires);
    const rim = new THREE.Mesh(rimGeometry, rims);
    tire.rotation.z = rim.rotation.z = Math.PI / 2;
    wheel.add(tire, rim);
    wheel.position.set(x, 0.46, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  const jets = new THREE.Group();
  const jetMaterial = new THREE.MeshBasicMaterial({ color: '#3ba9ff', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
  const coreMaterial = new THREE.MeshBasicMaterial({ color: '#e8fbff', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const x of [-0.79, 0.79]) for (const z of [-1.3, 1.45]) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 10), black);
    nozzle.position.set(x, 0.3, z);
    group.add(nozzle);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.38, 3.4, 12, 1, true), jetMaterial);
    plume.position.set(x, -1.45, z);
    plume.rotation.z = Math.PI;
    jets.add(plume);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.15, 2.2, 8), coreMaterial);
    core.position.set(x, -0.94, z);
    core.rotation.z = Math.PI;
    jets.add(core);
  }
  jets.visible = false;
  group.add(jets);
  if (detailed) {
    block(group, black, 0, 0.7, 2.28, 0.6, 0.16, 0.02);
    for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) block(group, black, x, 0.43, 2.15, 0.035, 0.2, 0.4);
  }
  group.userData = { wheels, jets, body };
  return group;
}

function instances(geometry, mat, count, scene) {
  const mesh = new THREE.InstancedMesh(geometry, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

function put(mesh, index, x, y, z, sx, sy, sz, angle = 0) {
  position.set(x, y, z);
  scale.set(sx, sy, sz);
  rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
  matrix.compose(position, rotation, scale);
  mesh.setMatrixAt(index, matrix);
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b5a8b5');
  scene.fog = new THREE.FogExp2('#b6a4ae', 0.0018);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 3000);
  const env = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = env.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.75;
  room.dispose();
  env.dispose();

  scene.add(new THREE.HemisphereLight('#b8dbff', '#44475a', 2.1));
  const sunlight = new THREE.DirectionalLight('#ffc5a1', 3.2);
  sunlight.position.set(-170, 100, -190);
  scene.add(sunlight);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#233952') }, horizon: { value: new THREE.Color('#ecc1b0') } },
    vertexShader: 'varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vPosition; uniform vec3 top; uniform vec3 horizon; void main(){ float h=normalize(vPosition).y; gl_FragColor=vec4(mix(horizon,top,smoothstep(-0.03,0.55,h)),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  }));
  scene.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(68, 32, 16), new THREE.MeshBasicMaterial({ color: '#ffd3aa', fog: false }));
  sun.position.set(-700, 145, -1850);
  scene.add(sun);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), new THREE.MeshStandardMaterial({ color: '#3b5968', metalness: 0.68, roughness: 0.42 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -6;
  scene.add(sea);
  const seaLines = instances(box, new THREE.MeshBasicMaterial({ color: '#bca99d', transparent: true, opacity: 0.25 }), 110, scene);
  for (let i = 0; i < 110; i++) {
    put(seaLines, i, Math.sin(i * 9.3) * 1100, -5.95, -i * 14, 20 + i % 18, 0.01, 0.1);
  }
  seaLines.instanceMatrix.needsUpdate = true;

  const mountains = instances(new THREE.ConeGeometry(1, 1, 5), material('#627783'), 30, scene);
  for (let i = 0; i < 30; i++) {
    const height = 90 + (Math.sin(i * 3.4) + 1) * 90;
    put(mountains, i, (i - 15) * 130, height / 2 - 20, -1400 - Math.cos(i * 2) * 300, 150 + i % 3 * 70, height, 220, i);
  }
  mountains.instanceMatrix.needsUpdate = true;

  const buildingMat = material('#566474', 0.35, 0.55);
  const buildings = instances(box, buildingMat, 160, scene);
  const windows = instances(box, new THREE.MeshBasicMaterial({ color: '#f8c8a2' }), 160 * 10, scene);
  const buildingData = [];
  for (let i = 0; i < 160; i++) {
    const side = i % 2 ? -1 : 1;
    buildingData.push({ x: side * (70 + (i * 37 % 440)), d: i * 39 % 2200, w: 12 + i * 7 % 24, h: 18 + (i * 31 % 125) });
  }

  const segments = 120;
  const roadGeometry = new THREE.BufferGeometry();
  const roadVertices = new Float32Array((segments + 1) * 6);
  const indices = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  roadGeometry.setAttribute('position', new THREE.BufferAttribute(roadVertices, 3).setUsage(THREE.DynamicDrawUsage));
  roadGeometry.setIndex(indices);
  const normals = new Float32Array((segments + 1) * 6);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  roadGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  const road = new THREE.Mesh(roadGeometry, material('#263440', 0.2, 0.7));
  road.frustumCulled = false;
  scene.add(road);
  const laneLines = instances(box, new THREE.MeshBasicMaterial({ color: '#d9dcda' }), segments * 3, scene);
  const curbs = instances(box, material('#bbc1c5'), segments * 2, scene);
  const edgeLines = instances(box, new THREE.MeshBasicMaterial({ color: '#ffc174' }), segments * 2, scene);
  const pillars = instances(box, material('#657481'), 40, scene);
  const poles = instances(box, material('#465967', 0.65), 48, scene);
  const lamps = instances(box, new THREE.MeshBasicMaterial({ color: '#ffe5c1' }), 24, scene);
  const finish = new THREE.Group();
  const finishMat = material('#d1d6d3');
  block(finish, finishMat, -13, 7, 0, 0.6, 14, 0.6);
  block(finish, finishMat, 13, 7, 0, 0.6, 14, 0.6);
  block(finish, finishMat, 0, 13, 0, 26, 1.2, 0.7);
  const checkBlack = material('#17232f');
  for (let i = 0; i < 20; i++) block(finish, i % 2 ? finishMat : checkBlack, i * 1.25 - 11.9, 0.035, 0, 1.25, 0.025, 3);
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1024; signCanvas.height = 128;
  const ctx = signCanvas.getContext('2d');
  ctx.fillStyle = '#182c39'; ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = '#f6f0e5'; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SKYLINE  /  FINISH', 512, 88);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const finishSign = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.25), new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide }));
  finishSign.position.set(0, 12.9, 0.4);
  finish.add(finishSign);
  scene.add(finish);

  const player = makeCar('#e6e9e7', true);
  scene.add(player);
  const rivalColors = ['#fd775d', '#b9c39a', '#7baab6'];
  const rivals = rivalColors.map(color => { const car = makeCar(color); scene.add(car); return car; });
  const trafficColors = ['#6e879c', '#ded6c9', '#a15b60', '#8c99a4', '#48545e'];
  const traffic = Array.from({ length: 36 }, (_, i) => {
    const car = makeCar(trafficColors[i % 5]);
    car.scale.setScalar(0.96);
    scene.add(car);
    return car;
  });
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext('2d');
  const shadowGradient = shadowContext.createRadialGradient(32, 32, 5, 32, 32, 32);
  shadowGradient.addColorStop(0, 'rgba(0,0,0,0.8)');
  shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 64, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5, 8), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.6, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  scene.add(shadow);
  const dustCount = 80;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#a8e6ff', size: 0.1, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);
  const desiredCamera = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const smoothLook = new THREE.Vector3(0, 2, -25);
  let cameraMode = 0;
  let initialized = false;

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();

  function updateCar(mesh, car, distance, center, time, isPlayer = false) {
    const relative = car.distance - distance;
    mesh.visible = isPlayer || (relative > -55 && relative < 900);
    if (!mesh.visible) return;
    mesh.position.set(roadCenter(car.distance) - center + car.x, car.altitude || 0, -relative);
    mesh.rotation.y = -roadHeading(car.distance);
    mesh.rotation.z = isPlayer ? -car.x * 0.003 : 0;
    mesh.rotation.x = car.thrusting ? -0.07 : 0;
    mesh.userData.jets.visible = !!car.thrusting;
    mesh.userData.jets.scale.y = 0.85 + Math.sin(time * 37) * 0.12;
    mesh.userData.wheels.forEach(wheel => { wheel.rotation.z = (car.altitude > 0.8 ? Math.PI / 3 : 0) * Math.sign(wheel.position.x); });
  }

  return {
    resize,
    cycleCamera() { cameraMode = (cameraMode + 1) % 2; return cameraMode; },
    render(race, dt, idleTime) {
      const preview = race.phase === 'ready';
      const car = race.player;
      const distance = preview ? 340 : car.distance;
      const center = roadCenter(distance);
      const time = race.elapsed + idleTime;
      for (let i = 0; i <= segments; i++) {
        const d = Math.floor(distance / 12) * 12 + (i - 5) * 12;
        const x = roadCenter(d) - center;
        const z = -(d - distance);
        roadVertices.set([x - 12, 0, z, x + 12, 0, z], i * 6);
        if (i === segments) continue;
        const angle = -roadHeading(d);
        for (let j = 0; j < 3; j++) put(laneLines, i * 3 + j, x + (j - 1) * 5, 0.018, z - 2, 0.11, 0.02, 4.7, angle);
        for (let side = 0; side < 2; side++) {
          const sx = side ? 1 : -1;
          put(curbs, i * 2 + side, x + sx * 12.4, 0.38, z - 6, 0.55, 0.76, 12.15, angle);
          put(edgeLines, i * 2 + side, x + sx * 11.5, 0.023, z - 6, 0.12, 0.02, 12.15, angle);
        }
      }
      roadGeometry.attributes.position.needsUpdate = true;
      [laneLines, curbs, edgeLines].forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
      for (let i = 0; i < 40; i++) {
        const d = Math.floor(distance / 36) * 36 + (i - 2) * 36;
        put(pillars, i, roadCenter(d) - center, -3.4, -(d - distance), 16, 6.5, 2);
      }
      pillars.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 24; i++) {
        const d = Math.floor(distance / 60) * 60 + (i - 1) * 60;
        const side = i % 2 ? 1 : -1;
        const x = roadCenter(d) - center + side * 12.7;
        const z = -(d - distance);
        put(poles, i * 2, x, 6.5, z, 0.14, 13, 0.14);
        put(poles, i * 2 + 1, x - side * 1.8, 12.9, z, 3.7, 0.14, 0.18);
        put(lamps, i, x - side * 3.3, 12.8, z, 0.85, 0.06, 0.4);
      }
      poles.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = true;
      buildingData.forEach((b, i) => {
        const z = -((b.d - distance % 2200 + 2200) % 2200) + 100;
        const x = b.x - center * 0.6;
        put(buildings, i, x, b.h / 2 - 6, z, b.w, b.h, 16);
        for (let j = 0; j < 10; j++) {
          put(windows, i * 10 + j, x + (j % 2 ? 0.24 : -0.24) * b.w, 3 + j * (b.h - 10) / 10, z + 8.05, b.w * 0.26, 0.7, 0.05);
        }
      });
      buildings.instanceMatrix.needsUpdate = windows.instanceMatrix.needsUpdate = true;

      if (preview) {
        updateCar(player, { ...car, distance, altitude: 1.6 + Math.sin(idleTime * 1.1) * 0.12, thrusting: true }, distance, center, time, true);
        rivals.forEach((mesh, i) => updateCar(mesh, { ...race.rivals[i], distance: distance + 35 + i * 28, altitude: i === 0 ? 5 : 0, thrusting: i === 0 }, distance, center, time));
        traffic.forEach((mesh, i) => updateCar(mesh, { ...race.traffic[i], distance: distance + 65 + i * 32 }, distance, center, time));
      } else {
        updateCar(player, car, distance, center, time, true);
        rivals.forEach((mesh, i) => updateCar(mesh, race.rivals[i], distance, center, time));
        traffic.forEach((mesh, i) => updateCar(mesh, race.traffic[i], distance, center, time));
      }
      shadow.position.x = player.position.x;
      shadow.scale.setScalar(1 + player.position.y * 0.04);
      shadow.material.opacity = 0.6 / (1 + player.position.y * 0.2);
      finish.position.set(roadCenter(RACE_LENGTH) - center, 0, -(RACE_LENGTH - distance));
      finish.visible = RACE_LENGTH - distance < 1400;
      dust.visible = player.userData.jets.visible;
      if (dust.visible) {
        for (let i = 0; i < dustCount; i++) {
          const age = (time * 1.8 + i / dustCount) % 1;
          dustPositions[i * 3] = player.position.x + (i % 2 ? 0.8 : -0.8) + Math.sin(i * 21) * age * 1.4;
          dustPositions[i * 3 + 1] = Math.max(0.08, player.position.y - age * 6);
          dustPositions[i * 3 + 2] = (i % 4 > 1 ? 1.4 : -1.3) + age * (car.speed * 0.12 + 2);
        }
        dustGeometry.attributes.position.needsUpdate = true;
      }
      const portrait = camera.aspect < 0.8;
      if (preview) {
        desiredCamera.set(portrait ? 7.8 : 8.3, portrait ? 5.9 : 5.1, portrait ? 13.8 : 11.8);
        lookTarget.set(portrait ? 1 : -1.4, 1.4, -3.5);
      } else if (cameraMode === 1) {
        desiredCamera.set(car.x, car.altitude + 1.7, -0.95);
        lookTarget.set(car.x + roadCenter(distance + 65) - center, car.altitude + 1.5, -65);
      } else {
        desiredCamera.set(car.x * 0.65, car.altitude * 0.75 + 5.7, portrait ? 14.5 : 12.8);
        lookTarget.set(car.x * 0.6 + (roadCenter(distance + 30) - center) * 0.35, car.altitude * 0.78 + 1.8, -25);
      }
      const smoothing = 1 - Math.exp(-dt * 7);
      if (!initialized) { camera.position.copy(desiredCamera); smoothLook.copy(lookTarget); initialized = true; }
      camera.position.lerp(desiredCamera, smoothing);
      smoothLook.lerp(lookTarget, smoothing);
      camera.lookAt(smoothLook);
      const targetFov = preview ? 50 : 57 + car.speed * 0.075;
      camera.fov += (targetFov - camera.fov) * smoothing;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    },
    dispose() {
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) for (const mat of [].concat(object.material)) mat.dispose();
      });
      environment.dispose();
      signTexture.dispose();
      shadowTexture.dispose();
      renderer.dispose();
    },
  };
}
