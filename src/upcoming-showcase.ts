import * as THREE from 'three';
import { makeCar, CAR_STYLES } from './car-model.js';
import { createAeroVFX } from './aero-vfx.js';
import { showcaseCameraPose, type CameraPose } from './track-preview.ts';
import { vfxSettings, type VfxSettings } from './vfx-settings.ts';
import type { PaintPreset } from './appearance.ts';
import type { PreviewTrackId } from './upcoming-tracks.ts';

export type UpcomingEnvironment = {
  group: THREE.Group;
  update(timeSeconds: number, quality: 'low' | 'medium' | 'high', reducedMotion: boolean): void;
  dispose(): void;
  /** Optional authored drive-view pose (e.g. an airborne shot); FOV stays 50°, other views unchanged. */
  readonly cameraPose?: CameraPose | null;
};
export type UpcomingEnvironmentFactory = (scene: THREE.Scene) => UpcomingEnvironment;
type Stage = {
  id: PreviewTrackId;
  scene: THREE.Scene;
  environment: UpcomingEnvironment;
  cars: THREE.Group[];
  aero: ReturnType<typeof createAeroVFX>;
};

/** A scene host, not a renderer: uses the game's camera, composer and frame clock. */
export function createUpcomingShowcase(
  factories: Partial<Record<PreviewTrackId, UpcomingEnvironmentFactory>>,
  environmentTexture: THREE.Texture,
) {
  let stage: Stage | null = null;
  let paint: PaintPreset | null = null;
  let previousTime = NaN;
  const origin = new THREE.Vector3();
  const driver = { speed: 105, boosting: true, nitroTime: 1, miniBoost: 0, impact: null, altitude: 0, trick: null };
  const previewRace = { phase: 'racing', player: driver };

  function disposeStage(): void {
    if (!stage) return;
    const { scene, environment, cars, aero } = stage;
    stage = null;
    environment.dispose();
    // Car geometry is shared with live races. Dispose only the instance's materials.
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const collect = (object: THREE.Object3D, ownGeometry: boolean) => {
      object.traverse(item => {
        if (!(item instanceof THREE.Mesh || item instanceof THREE.Points || item instanceof THREE.LineSegments)) return;
        if (ownGeometry) geometries.add(item.geometry);
        for (const material of Array.isArray(item.material) ? item.material : [item.material]) materials.add(material);
      });
    };
    collect(aero.group, true);
    for (const item of scene.children) {
      if (item === environment.group || cars.includes(item as THREE.Group)) continue;
      if (item instanceof THREE.Mesh || item instanceof THREE.Points || item instanceof THREE.LineSegments) collect(item, true);
    }
    for (const car of cars) collect(car, false);
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    previousTime = NaN;
  }

  function setPaint(next: PaintPreset): void {
    paint = next;
    if (!stage) return;
    const car = stage.cars[0]!;
    const body = car.userData.body.material as THREE.MeshStandardMaterial;
    body.color.set(next.paint);
    body.metalness = next.metalness;
    body.roughness = next.roughness;
    car.userData.lightColor.fromArray(next.light);
  }

  function setTrack(id: PreviewTrackId | null): boolean {
    if (stage?.id === id) return true;
    disposeStage();
    const factory = id && factories[id];
    if (!id || !factory) return false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1724');
    scene.environment = environmentTexture;
    scene.environmentIntensity = .5;
    let environment: UpcomingEnvironment;
    try {
      environment = factory(scene);
      if (!environment.group.parent) scene.add(environment.group);
    } catch (error) {
      console.error('Upcoming 3D environment unavailable:', id, error);
      return false;
    }
    const cars = [CAR_STYLES.roadster, CAR_STYLES.nova, CAR_STYLES.orbit, CAR_STYLES.apex]
      .map(style => makeCar(style));
    cars.forEach(car => scene.add(car));
    const aero = createAeroVFX(scene, cars[0]!);
    const sunlight = new THREE.DirectionalLight('#f3e7d2', 2.3);
    sunlight.position.set(-30, 70, -65);
    scene.add(new THREE.HemisphereLight('#c1e5ff', '#1e283a', 1.9), sunlight);
    stage = { id, scene, environment, cars, aero };
    if (paint) setPaint(paint);
    return true;
  }

  function update(camera: THREE.PerspectiveCamera, time: number,
    options: Partial<VfxSettings>, reducedMotion: boolean): void {
    if (!stage) return;
    const settings = vfxSettings(options);
    const calm = reducedMotion || settings.comfortable;
    stage.environment.update(time, settings.quality, calm);
    const grounded = settings.enabled && settings.airflow;
    const player = stage.cars[0]!;
    player.position.set(0, grounded ? .06 : 1.66 + (calm ? 0 : Math.sin(time * 1.1) * .12), 0);
    player.rotation.z = calm ? 0 : Math.sin(time * .85) * .022;
    player.userData.jets.visible = !grounded && !calm;
    player.userData.wing.position.y = player.userData.wing.userData.restY
      + (grounded ? 0 : player.userData.wing.userData.lift);
    for (const wheel of player.userData.wheels)
      wheel.rotation.z = grounded ? 0 : Math.sign(wheel.position.x) * Math.PI / 2.6;
    for (let i = 1; i < stage.cars.length; i++) {
      const rival = stage.cars[i]!;
      rival.position.set((i - 2) * 4.5, i === 1 ? 4.5 : .06, -16 - i * 10);
      rival.userData.jets.visible = i === 1 && !calm;
    }
    const pose = settings.view === 'drive' && stage.environment.cameraPose
      || showcaseCameraPose(stage.id, settings.view, calm ? 0 : time, camera.aspect < .78);
    camera.fov = 50;
    camera.position.set(pose.cameraSide, player.position.y + pose.cameraHeight, pose.cameraBack);
    camera.lookAt(pose.lookSide, pose.lookHeight, -pose.lookAhead);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    driver.altitude = grounded ? 0 : 1.6;
    const dt = Number.isFinite(previousTime) ? Math.max(0, Math.min(.05, time - previousTime)) : 1 / 60;
    previousTime = time;
    stage.aero.update(previewRace, dt, origin, { ...settings, airflow: true }, calm, null, true);
  }

  return {
    get scene(): THREE.Scene | null { return stage?.scene ?? null; },
    get activeTrack(): PreviewTrackId | null { return stage?.id ?? null; },
    setTrack, setPaint, update,
    dispose(): void { disposeStage(); },
  };
}
