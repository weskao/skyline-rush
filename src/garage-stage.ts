import * as THREE from 'three';
import { CAR_STYLES, makeCar, poseWing } from './car-model.js';
import { createAeroVFX } from './aero-vfx.js';
import { vfxSettings } from './vfx-settings.ts';
import type { VfxSettings } from './vfx-settings.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import type { GarageCamera } from './garage-camera.ts';
import { garageFramedDistance } from './garage-camera.ts';
import type { PaintPreset } from './appearance.ts';
import { createGaragePaintSweep } from './garage-paint-shader.ts';

// Dedicated scene, not a renderer or canvas. Reuse the world's composer, camera and GPU context.
export function createGarageStage(environment: THREE.Texture) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07101b');
  const fog = new THREE.Fog('#07101b', 24, 54);
  scene.fog = fog;
  scene.environment = environment;
  scene.environmentIntensity = 0.8;

  const car = makeCar(CAR_STYLES.roadster);
  // Dedicated Garage finish; never change shared racing/traffic materials.
  const oldPaint = car.userData.body.material as THREE.MeshStandardMaterial;
  const finish = new THREE.MeshPhysicalMaterial({
    color: oldPaint.color.clone(), metalness: 0.73, roughness: 0.17,
    clearcoat: 0.86, clearcoatRoughness: 0.10, envMapIntensity: 1.3,
  });
  car.traverse(object => {
    if (object instanceof THREE.Mesh && object.material === oldPaint) object.material = finish;
  });
  oldPaint.dispose();
  const paintSweep = createGaragePaintSweep(finish);
  car.position.y = 0.06;
  scene.add(car);
  function poseCar(flying: boolean, tilt = 0) {
    car.userData.jets.visible = flying;
    poseWing(car.userData.wing, tilt, flying ? 1 : 0);
    for (const wheel of car.userData.wheels)
      wheel.rotation.z = flying ? Math.sign(wheel.position.x) * Math.PI / 2.6 : 0;
  }
  // Measure the real vehicle before attaching any cosmetic shader/geometry.
  const carBounds = new THREE.Box3().setFromObject(car);
  const carRadius = carBounds.getBoundingSphere(new THREE.Sphere()).radius;
  const carCenter = carBounds.getCenter(new THREE.Vector3());
  const carHalf = carBounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
  // Flight folds the wheels out and lifts the wing, so it is framed by its own extent around the same centre.
  poseCar(true);
  const flightBounds = new THREE.Box3().setFromObject(car);
  poseCar(false);
  const flightHalf = flightBounds.max.clone().sub(carCenter).max(carCenter.clone().sub(flightBounds.min));
  // Studio uses the SAME Aero implementation and shader resources as live racing.
  const aero = createAeroVFX(scene, car);
  const origin = new THREE.Vector3();
  const towardsCamera = new THREE.Vector3();
  const previewDriver = { speed: 105, boosting: true, nitroTime: 1, miniBoost: 0,
    impact: null, altitude: 0, trick: null };
  const previewRace = { phase: 'racing', player: previewDriver };
  let previewSettings: VfxSettings = vfxSettings({ airflow: true });
  let lastTime = NaN;
  // Airbrake travel 0..1 eased toward the Studio toggle; the same open/close times as racing.
  let wingTilt = 0;
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
  const look = carCenter.clone();

  function update(camera: THREE.PerspectiveCamera, state: GarageCamera, time: number, reducedMotion: boolean) {
    const dt = Number.isFinite(lastTime) ? Math.max(0, Math.min(0.05, time - lastTime)) : 1 / 60;
    lastTime = time;
    wingTilt = reducedMotion ? +state.wing : Math.max(0, Math.min(1, wingTilt + (state.wing ? dt : -dt) / .5));
    paintSweep.update(time, previewSettings.quality, previewSettings.enabled, reducedMotion || previewSettings.comfortable);
    const yaw = state.yaw + (state.autoRotate && !reducedMotion ? time * 0.13 : 0);
    // Frame the actual projected car bounds at every angle, including narrow portrait.
    const flying = state.mode === 'flight';
    const hover = flying ? 1.5 + (reducedMotion ? 0 : Math.sin(time * 1.8) * .12) : 0;
    car.position.y = 0.06 + hover;
    car.rotation.z = flying && !reducedMotion ? Math.sin(time * .9) * .035 : 0;
    poseCar(flying, wingTilt);
    previewDriver.altitude = flying ? 2 : 0;
    look.copy(carCenter);
    look.y += hover;
    const distance = garageFramedDistance(camera.aspect, state.zoom, flying ? flightHalf : carHalf, yaw, state.pitch);
    // Zoomed-out views (up to ~44 m, top view) keep the car and trail clear of the fog.
    fog.near = Math.max(24, distance + 8);
    fog.far = fog.near + 30;
    camera.fov = 49;
    camera.position.set(look.x + Math.sin(yaw) * Math.cos(state.pitch) * distance,
      look.y + Math.sin(state.pitch) * distance,
      look.z + Math.cos(yaw) * Math.cos(state.pitch) * distance);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    // The preview repeats real ignition/trail behaviour with a small, bounded motion.
    // Move only the emission sample briefly; keep the rendered car perfectly centred.
    car.position.z = reducedMotion ? 0 : Math.sin(time * 2) * 0.65;
    try { aero.update(previewRace, dt, origin, previewSettings, reducedMotion, null, true); }
    finally { car.position.z = 0; }
    // Garage orbit views must see the energy ring edge-on and face-on.
    for (const name of ['Ignition shockwave', 'Launch flare echo']) {
      const ring = scene.getObjectByName(name);
      if (ring?.visible) {
        ring.quaternion.copy(camera.quaternion);
        // Draw the flare in front of the car rather than hiding it inside the body.
        ring.position.addScaledVector(camera.getWorldDirection(towardsCamera).negate(), carRadius * 0.52);
      }
    }
  }

  function inspectBounds(camera: THREE.PerspectiveCamera) {
    const bounds = new THREE.Box3().makeEmpty();
    for (const part of car.children) if (part !== aero.group) bounds.expandByObject(part);
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
    car.userData.body.material.metalness = paint.metalness;
    car.userData.body.material.roughness = paint.roughness;
    car.userData.lightColor.fromArray(paint.light);
    car.userData.brakeLight.color.copy(car.userData.lightColor);
  }

  function dispose() {
    // Aero geometry is per-stage, unlike globally shared car-model geometry.
    const released = new Set<THREE.BufferGeometry>();
    const releaseVfx = (geometry: THREE.BufferGeometry) => {
      if (released.has(geometry)) return;
      released.add(geometry);
      geometry.dispose();
    };
    aero.group.traverse(object => {
      if (object instanceof THREE.Mesh) releaseVfx(object.geometry);
    });
    // Scene-owned Aero particles and shock meshes are not children of the car.
    for (const object of scene.children) {
      if (object === car || stageMeshes.includes(object as THREE.Mesh)) continue;
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
        releaseVfx(object.geometry);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    }
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
  return {
    scene, update, inspectBounds, setPaint, dispose,
    inspectCosmetics() { return aero.inspectCosmetics(); },
    setSkins(ids: Partial<Record<SkinCategory, SkinId>>) { aero.setSkins(ids); },
    configureVFX(settings: VfxSettings) { previewSettings = { ...settings, airflow: settings.enabled }; },
  };
}
