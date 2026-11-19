import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { CAR_STYLES, makeCar } from './car-model.js';
import { createSkidMarks } from './skid-marks.js';
import { CARS, type CarId } from './car-catalog.ts';
import { createModelCache, type ModelHandle } from './asset-model-loader.ts';
import { bindGarageRig, type GarageRig } from './garage-model-rig.ts';
import { fitToRoadsterSize } from './car-display-size.ts';

const DRIFT_DURATION = 1.66;
const LOOP = 3.8;
const STEP = 1 / 60;

export function createGarageDriftPreview(canvas: HTMLCanvasElement, carId: CarId, paint: string) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#121b28');
  const car = makeCar(CAR_STYLES.roadster, paint);
  // makeCar reuses module-level materials (nozzles, fascia trim) with the game's cars, and dispose() reaches every
  // renderer: this second renderer draws its own copies so disposing them never releases a game program.
  const ownedMaterials = new Map<THREE.Material, THREE.Material>();
  const own = (material: THREE.Material) => {
    if (!ownedMaterials.has(material)) ownedMaterials.set(material, material.clone());
    return ownedMaterials.get(material)!;
  };
  car.traverse(object => {
    if (object instanceof THREE.Mesh) object.material = Array.isArray(object.material) ? object.material.map(own) : own(object.material);
  });
  scene.add(car, new THREE.HemisphereLight('#d7e9ff', '#63566b', 2.65));
  const light = new THREE.DirectionalLight('#ede9ff', 2.7);
  light.position.set(-4, 9, -2);
  scene.add(light);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(44, 44),
    new THREE.MeshStandardMaterial({ color: '#4c5261', roughness: .93 }));
  pad.rotation.x = -Math.PI / 2;
  scene.add(pad);
  const grid = new THREE.GridHelper(40, 40, '#344055', '#354051');
  grid.position.y = .002;
  scene.add(grid);
  const ground = new THREE.Object3D(), origin = new THREE.Vector3();
  ground.rotation.copy(pad.rotation);
  ground.position.y = .03;
  const skids = createSkidMarks(scene, car, ground);
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 70);
  const aim = new THREE.Vector3(), cameraOffset = new THREE.Vector3(4.9, 7.9, 9.2);
  let previous = -STEP, low = false, still = false;

  // Show the selected production model when present, using the same-size procedural rig as the race fallback.
  const baseUrl = import.meta.env.BASE_URL;
  let ktx2: KTX2Loader | undefined;
  const cache = createModelCache({ baseUrl, loadKtx2: async () => {
    ktx2 ??= new KTX2Loader().setTranscoderPath(`${baseUrl}basis/`).setWorkerLimit(1).detectSupport(renderer);
    return ktx2;
  } });
  const abort = new AbortController();
  let model: ModelHandle | undefined, rig: GarageRig | undefined;
  const loaded = cache.load(CARS[carId].model, { quality: 'low', signal: abort.signal }).then(result => {
    if (result.kind !== 'model') return null;
    if (abort.signal.aborted) { result.release(); return null; }
    model = result;
    const body = result.instance();
    fitToRoadsterSize(body);
    rig = bindGarageRig(car, body);
    for (const part of car.children) part.traverse(object => object.layers.set(31));
    car.add(body);
    rig.update();
    return result.id;
  }).catch(() => null); // The procedural car still gives the same wheel-contact preview.

  function place(time: number) {
    const progress = Math.min(1, time / 2.35), angle = progress * 1.63 - .38;
    car.position.set(7.1 * (1 - Math.cos(angle)), 0, 4.1 - Math.sin(angle) * 7.1);
    car.rotation.y = -angle + .58 * Math.sin(Math.PI * progress) * (1 - THREE.MathUtils.smoothstep(time, 1.55, 2.03));
  }

  function restart() {
    previous = -STEP;
    skids.reset();
  }
  function draw(elapsed: number, reduced: boolean, lowQuality: boolean) {
    const time = reduced ? 1.21 : elapsed % LOOP;
    if (time < previous || reduced !== still || lowQuality !== low) restart();
    low = lowQuality;
    still = reduced;
    // A fixed sample rate keeps the preview's tread continuous when the canvas is drawn at 30 fps.
    while (previous + STEP <= time) {
      previous += STEP;
      place(previous);
      skids.update(previous < DRIFT_DURATION ? { time: previous, dir: 1, nitro: 0, grace: 0 } : null,
        origin, STEP, reduced, lowQuality);
    }
    aim.set(car.position.x * .64, .06, car.position.z * .72 + 1.42);
    const widthRatio = Math.max(1, 1.65 / camera.aspect);
    camera.position.copy(aim).addScaledVector(cameraOffset, widthRatio);
    camera.lookAt(aim);
    for (const wheel of car.userData.wheels as THREE.Object3D[]) {
      const spin = wheel.getObjectByName('Roadster wheel spin');
      if (spin) spin.rotation.x = -Math.min(time, 2.35) * 9;
    }
    rig?.update();
    renderer.render(scene, camera);
  }
  return {
    loaded,
    resize(width: number, height: number) {
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    setSkin(id: string) { skids.setSkin(id); restart(); },
    draw,
    dispose() {
      abort.abort();
      rig?.dispose();
      model?.release();
      cache.dispose();
      ktx2?.dispose();
      skids.dispose();
      for (const material of ownedMaterials.values()) material.dispose();
      for (const object of [grid, pad]) { object.geometry.dispose(); object.material.dispose(); }
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
