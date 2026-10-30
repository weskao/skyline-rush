import * as THREE from 'three';
import { CAR_STYLES, makeCar } from './car-model.js';
import type { GarageCamera } from './garage-camera.ts';
import type { PaintPreset } from './appearance.ts';

// Dedicated scene, not a renderer or canvas. Reuse the world's composer, camera and GPU context.
export function createGarageStage(environment: THREE.Texture) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07101b');
  scene.fog = new THREE.Fog('#07101b', 24, 54);
  scene.environment = environment;
  scene.environmentIntensity = 0.8;

  const car = makeCar(CAR_STYLES.roadster);
  car.position.y = 0.06;
  scene.add(car);
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(5.65, 5.65, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: '#172a36', metalness: 0.7, roughness: 0.36 }),
  );
  platform.position.y = -0.16;
  scene.add(platform);
  const stageMeshes: THREE.Mesh[] = [platform];
  for (const [radius, color] of [[5.55, '#04c9ee'], [5.36, '#faac65']] as const) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 6, 64), new THREE.MeshBasicMaterial({ color }));
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -0.057;
    scene.add(rim);
    stageMeshes.push(rim);
  }
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 44),
    new THREE.MeshStandardMaterial({ color: '#101923', metalness: 0.38, roughness: 0.55 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.27;
  scene.add(floor);
  stageMeshes.push(floor);
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(45, 22),
    new THREE.MeshBasicMaterial({ color: '#0a1a2a' }),
  );
  backdrop.position.set(0, 7, -17);
  scene.add(backdrop);
  stageMeshes.push(backdrop);
  const ambient = new THREE.HemisphereLight('#b8eafa', '#14212a', 2);
  const key = new THREE.DirectionalLight('#b9eaff', 3.2);
  key.position.set(-6, 12, -5);
  const rimLight = new THREE.DirectionalLight('#ffad69', 2.4);
  rimLight.position.set(6, 7, 6);
  scene.add(ambient, key, rimLight);
  const look = new THREE.Vector3(0, 0.95, 0);

  function update(camera: THREE.PerspectiveCamera, state: GarageCamera, time: number, reducedMotion: boolean) {
    const yaw = state.yaw + (state.autoRotate && !reducedMotion ? time * 0.13 : 0);
    // Camera distance is larger on narrow portrait previews; full silhouette wins over filling the frame.
    const distance = Math.max(10, 8.5 / Math.max(0.65, Math.min(1, camera.aspect))) * state.zoom;
    camera.fov = 49;
    camera.position.set(Math.sin(yaw) * Math.cos(state.pitch) * distance,
      0.95 + Math.sin(state.pitch) * distance,
      Math.cos(yaw) * Math.cos(state.pitch) * distance);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  function inspectBounds(camera: THREE.PerspectiveCamera) {
    const bounds = new THREE.Box3().setFromObject(car);
    const point = new THREE.Vector3();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          point.set(x, y, z).project(camera);
          minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
        }
    return { minX, maxX, minY, maxY, inFrame: minX > -0.94 && maxX < 0.94 && minY > -0.94 && maxY < 0.94 };
  }

  function setPaint(paint: PaintPreset) {
    car.userData.body.material.color.set(paint.paint);
    car.userData.lightColor.fromArray(paint.light);
    car.userData.brakeLight.color.copy(car.userData.lightColor);
  }

  function dispose() {
    // The car model borrows global box, lamp, spoke and body geometry from car-model.js.
    // Disposing those would invalidate race meshes sharing the same WebGL context.
    for (const mesh of stageMeshes) {
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => material.dispose());
    }
    car.traverse(object => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
  }
  return { scene, update, inspectBounds, setPaint, dispose };
}
