import * as THREE from 'three';
import { makeCar, CAR_STYLES } from './car-model.js';
import { applyCarReflections } from './car-reflections.ts';
import { createAeroVFX } from './aero-vfx.js';
import { previewPlayer, showcaseCameraPose, type CameraPose } from './track-preview.ts';
import { vfxSettings, type VfxSettings } from './vfx-settings.ts';
import type { PaintPreset } from './appearance.ts';
import type { PreviewTrackId } from './upcoming-tracks.ts';
import type { GarageModelHost } from './garage-model.ts';

export type UpcomingEnvironment = {
  group: THREE.Group;
  /** `grounded`: AIRFLOW rests the car on the road, so an airborne shot must re-anchor on a real surface. */
  update(timeSeconds: number, quality: 'low' | 'medium' | 'high', reducedMotion: boolean, grounded?: boolean): void;
  dispose(): void;
  /** Optional authored drive-view pose (e.g. an airborne shot); FOV stays 50°, other views unchanged. */
  readonly cameraPose?: CameraPose | null;
  /** Optional drive-view pose for portrait phones (aspect < .78): above the home panel, or below the AIRFLOW telemetry card when grounded. */
  readonly portraitCameraPose?: CameraPose | null;
};
export type UpcomingEnvironmentFactory = (scene: THREE.Scene) => UpcomingEnvironment;
type Stage = {
  id: PreviewTrackId;
  scene: THREE.Scene;
  environment: UpcomingEnvironment;
  cars: THREE.Group[];
  aero: ReturnType<typeof createAeroVFX>;
  host: GarageModelHost;
};

/** A scene host, not a renderer: uses the game's camera, composer and frame clock. */
export function createUpcomingShowcase(
  factories: Partial<Record<PreviewTrackId, UpcomingEnvironmentFactory>>,
  environmentTexture: THREE.Texture,
  carEnvironment: THREE.Texture,
  /** `?model=roadster` (garage-model.ts): takes the GLB off the player car before its materials are disposed. */
  releaseModel: (host: GarageModelHost) => void = () => {},
) {
  let stage: Stage | null = null;
  // Keep the active and adjacent Coming Soon stages: swipes visit the next scene
  // twice for snapshots, and eager disposal rebuilt every mesh, car and shader.
  const cachedStages = new Map<PreviewTrackId, Stage>();
  const MAX_CACHED_STAGES = 2;
  let paint: PaintPreset | null = null;
  let previousTime = NaN;
  const origin = new THREE.Vector3();
  const driver = { speed: 105, boosting: true, nitroTime: 1, miniBoost: 0, impact: null, altitude: 0, trick: null };
  const previewRace = { phase: 'racing', player: driver };

  function disposeStage(old: Stage): void {
    const { scene, environment, cars, aero, host } = old;
    if (stage === old) stage = null;
    releaseModel(host); // the GLB's cached materials are shared; only the procedural car's are disposed below
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
    stage = null;
    previousTime = NaN;
    const factory = id && factories[id];
    if (!id || !factory) return false;
    const reused = cachedStages.get(id);
    if (reused) {
      cachedStages.delete(id); cachedStages.set(id, reused); // LRU: eviction never targets the current stage
      stage = reused;
      if (paint) setPaint(paint);
      return true;
    }
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
    applyCarReflections(cars[0]!, carEnvironment);
    const aero = createAeroVFX(scene, cars[0]!);
    const sunlight = new THREE.DirectionalLight('#f3e7d2', 2.3);
    sunlight.position.set(-30, 70, -65);
    scene.add(new THREE.HemisphereLight('#c1e5ff', '#1e283a', 1.9), sunlight);
    stage = { id, scene, environment, cars, aero, host: { name: 'showcase', car: cars[0]!, keep: aero.group as THREE.Object3D, scene } };
    cachedStages.set(id, stage);
    if (cachedStages.size > MAX_CACHED_STAGES) {
      const oldest = cachedStages.keys().next().value!;
      const evicted = cachedStages.get(oldest)!;
      cachedStages.delete(oldest);
      disposeStage(evicted); // only inactive stages; release GPU/GLB resources when the cache moves
    }
    if (paint) setPaint(paint);
    return true;
  }

  function update(camera: THREE.PerspectiveCamera, time: number,
    options: Partial<VfxSettings>, reducedMotion: boolean): void {
    if (!stage) return;
    const settings = vfxSettings(options);
    const calm = reducedMotion || settings.comfortable;
    const grounded = settings.enabled && settings.airflow;
    stage.environment.update(time, settings.quality, calm, grounded);
    const player = stage.cars[0]!;
    // Reuse the same shared Roadster ground/hover behavior as classic home tracks.
    const vehiclePose = previewPlayer(stage.id, driver, time, calm, grounded);
    player.position.set(0, vehiclePose.altitude + (grounded ? .06 : 0), 0);
    player.rotation.z = calm ? 0 : Math.sin(time * .85) * .022;
    player.userData.jets.visible = vehiclePose.thrusting;
    player.userData.wing.position.y = player.userData.wing.userData.restY
      + (grounded ? 0 : player.userData.wing.userData.lift);
    for (const wheel of player.userData.wheels)
      wheel.rotation.z = grounded ? 0 : Math.sign(wheel.position.x) * Math.PI / 2.6;
    const portrait = camera.aspect < .78;
    for (let i = 1; i < stage.cars.length; i++) {
      const rival = stage.cars[i]!;
      // Keep all three rivals readable in the shared 50° hero frame, including narrow phones.
      // The old 26–46 m line hid the back cars, especially against bright sand/clouds.
      const x = portrait ? (i === 1 ? -4.5 : -2) : (i - 2) * 4.5;
      rival.position.set(x, i === 1 ? 4.5 : .06, -6 - i * 8);
      rival.userData.jets.visible = i === 1 && !calm;
    }
    const authored = portrait ? stage.environment.portraitCameraPose : stage.environment.cameraPose;
    const pose = settings.view === 'drive' && authored || showcaseCameraPose(stage.id, settings.view, calm ? 0 : time, portrait);
    camera.fov = 50;
    camera.position.set(pose.cameraSide, player.position.y + pose.cameraHeight, pose.cameraBack);
    camera.lookAt(pose.lookSide, pose.lookHeight, -pose.lookAhead);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    driver.altitude = vehiclePose.altitude;
    const dt = Number.isFinite(previousTime) ? Math.max(0, Math.min(.05, time - previousTime)) : 1 / 60;
    previousTime = time;
    stage.aero.update(previewRace, dt, origin, { ...settings, airflow: true }, calm, null, true);
  }

  return {
    get scene(): THREE.Scene | null { return stage?.scene ?? null; },
    get activeTrack(): PreviewTrackId | null { return stage?.id ?? null; },
    get modelHost(): GarageModelHost | null { return stage?.host ?? null; },
    setTrack, setPaint, update,
    dispose(): void { for (const item of cachedStages.values()) disposeStage(item); cachedStages.clear(); },
  };
}
